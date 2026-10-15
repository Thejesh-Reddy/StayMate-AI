
from pathlib import Path
import json
import re
import time

import faiss
import numpy as np
from fastembed import TextEmbedding


BASE_DIR = Path(__file__).resolve().parent
VECTOR_DIR = BASE_DIR / "vector_store"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

TOP_K = 3

FALLBACK = (
    "I don't have enough information in my knowledge base "
    "to answer that."
)

_embedding_model = None


# ============================================================
# LOAD FAISS INDEX
# ============================================================

INDEX_PATH = VECTOR_DIR / "index.faiss"
METADATA_PATH = VECTOR_DIR / "metadata.json"

if not INDEX_PATH.exists():
    raise FileNotFoundError(
        f"FAISS index not found: {INDEX_PATH}"
    )

if not METADATA_PATH.exists():
    raise FileNotFoundError(
        f"Metadata file not found: {METADATA_PATH}"
    )

index = faiss.read_index(str(INDEX_PATH))

with open(
    METADATA_PATH,
    "r",
    encoding="utf-8"
) as file:
    metadata = json.load(file)

if index.ntotal != len(metadata):
    raise ValueError(
        f"FAISS contains {index.ntotal} vectors, but metadata "
        f"contains {len(metadata)} entries."
    )


# ============================================================
# LOAD EMBEDDING MODEL ON FIRST USE
# ============================================================

def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        print(
            f"[RAG] Loading FastEmbed model: {EMBEDDING_MODEL}"
        )

        model = TextEmbedding(
            model_name=EMBEDDING_MODEL
        )

        # Validate the embedding dimension against the index.
        test_embedding = next(
            model.embed(["dimension validation"])
        )

        test_embedding = np.asarray(
            test_embedding,
            dtype=np.float32
        )

        if test_embedding.shape[0] != index.d:
            raise ValueError(
                f"FAISS index dimension is {index.d}, but "
                f"the embedding model produces "
                f"{test_embedding.shape[0]} dimensions. "
                "Rebuild the index using the same model and "
                "embedding runtime."
            )

        _embedding_model = model

        print(
            f"[RAG] Model loaded; dimension={index.d}"
        )

    return _embedding_model


# ============================================================
# GENERATE QUERY EMBEDDING
# ============================================================

def generate_embedding(text):
    model = get_embedding_model()

    embedding = next(
        model.embed([text])
    )

    return np.asarray(
        embedding,
        dtype=np.float32
    )


# ============================================================
# RETRIEVE RELEVANT CHUNKS
# ============================================================

def retrieve(query):
    embedding = generate_embedding(query)

    query_vector = embedding.reshape(1, -1)

    distances, indices = index.search(
        query_vector,
        min(TOP_K, index.ntotal)
    )

    results = []

    for distance, index_id in zip(
        distances[0],
        indices[0]
    ):
        if index_id < 0 or index_id >= len(metadata):
            continue

        results.append({
            "distance": float(distance),
            "text": metadata[index_id]["text"],
            "source": metadata[index_id]["source"]
        })

    return results


# ============================================================
# SPLIT MULTIPLE QUESTIONS
# ============================================================

def split_questions(query):
    query = re.sub(
        r"\s+",
        " ",
        query.strip()
    )

    if not query:
        return []

    query = re.sub(
        r"\s+([?.!])",
        r"\1",
        query
    )

    parts = re.split(
        r"(?<=[?.!])\s+",
        query
    )

    questions = []

    for part in parts:
        part = part.strip(" .!?")

        if part:
            questions.append(part)

    return questions


# ============================================================
# EXTRACTIVE ANSWER GENERATION
# No Ollama or paid API required
# ============================================================

def generate_answer(query, retrieved_chunks):
    if not retrieved_chunks:
        return FALLBACK

    sentences = []

    for chunk in retrieved_chunks:
        text = chunk.get("text", "").strip()

        for sentence in re.split(
            r"(?<=[.!?])\s+",
            text
        ):
            sentence = sentence.strip()

            if sentence:
                sentences.append(sentence)

    if not sentences:
        return FALLBACK

    stop_words = {
        "a", "an", "the", "is", "are", "was", "were",
        "do", "does", "did", "how", "what", "when",
        "where", "why", "can", "could", "i", "my",
        "me", "to", "of", "in", "on", "for", "and",
        "or", "it", "this", "that", "with", "you"
    }

    query_words = {
        word.lower()
        for word in re.findall(r"\b\w+\b", query)
        if word.lower() not in stop_words
    }

    if not query_words:
        return FALLBACK

    ranked = []

    for position, sentence in enumerate(sentences):
        words = {
            word.lower()
            for word in re.findall(r"\b\w+\b", sentence)
        }

        overlap = len(query_words & words)

        if overlap:
            score = overlap / len(query_words)

            ranked.append((
                score,
                position,
                sentence
            ))

    if not ranked:
        return FALLBACK

    ranked.sort(
        key=lambda item: (-item[0], item[1])
    )

    selected = ranked[:3]

    # Preserve the original sentence order.
    selected.sort(key=lambda item: item[1])

    return " ".join(
        item[2] for item in selected
    )


# ============================================================
# MAIN RAG FUNCTION
# ============================================================

def ask_rag(query):
    questions = split_questions(query)

    if not questions:
        return {
            "answer": "Please enter a question.",
            "sources": []
        }

    answers = []
    all_sources = []
    seen_sources = set()

    for number, question in enumerate(
        questions,
        start=1
    ):
        start = time.perf_counter()

        retrieved_chunks = retrieve(question)

        retrieval_time = time.perf_counter() - start

        print(
            f"[RAG Metrics] question={number}, "
            f"retrieval={retrieval_time:.2f}s, "
            f"chunks={len(retrieved_chunks)}"
        )

        start = time.perf_counter()

        answer = generate_answer(
            question,
            retrieved_chunks
        )

        generation_time = time.perf_counter() - start

        print(
            f"[RAG Metrics] question={number}, "
            f"generation={generation_time:.2f}s"
        )

        if len(questions) == 1:
            answers.append(answer.strip())
        else:
            answers.append(
                f"{number}. {answer.strip()}"
            )

        for chunk in retrieved_chunks:
            source_name = chunk["source"]

            source_key = (
                source_name,
                number if len(questions) > 1 else None
            )

            if source_key in seen_sources:
                continue

            seen_sources.add(source_key)

            source = {
                "source": source_name,
                "distance": chunk["distance"]
            }

            if len(questions) > 1:
                source["question_number"] = number

            all_sources.append(source)

    return {
        "answer": "\n\n".join(answers),
        "sources": all_sources
    }
