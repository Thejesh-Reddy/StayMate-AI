
from pathlib import Path
import json
import re
import time

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent
VECTOR_DIR = BASE_DIR / "vector_store"

# This model produces 384-dimensional embeddings.
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

TOP_K = 3
FALLBACK = (
    "I don't have enough information in my knowledge base "
    "to answer that."
)

_embedding_model = None


# ============================================================
# LOAD FAISS INDEX AND METADATA
# ============================================================

index = faiss.read_index(str(VECTOR_DIR / "index.faiss"))

with open(
    VECTOR_DIR / "metadata.json",
    "r",
    encoding="utf-8"
) as file:
    metadata = json.load(file)


# ============================================================
# LOAD EMBEDDING MODEL ON FIRST USE
# ============================================================

def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)

        expected_dimension = _embedding_model.get_sentence_embedding_dimension()

        if index.d != expected_dimension:
            raise ValueError(
                f"FAISS index dimension is {index.d}, but "
                f"{EMBEDDING_MODEL} produces {expected_dimension}. "
                "Rebuild the FAISS index with this same model."
            )

    return _embedding_model


# ============================================================
# GENERATE EMBEDDING
# ============================================================

def generate_embedding(text):
    model = get_embedding_model()

    return model.encode(
        text,
        convert_to_numpy=True,
        normalize_embeddings=False
    )


# ============================================================
# RETRIEVE RELEVANT CHUNKS
# ============================================================

def retrieve(query):
    embedding = generate_embedding(query)

    query_vector = np.asarray(
        [embedding],
        dtype="float32"
    )

    distances, indices = index.search(query_vector, TOP_K)

    results = []

    for distance, index_id in zip(distances[0], indices[0]):
        if index_id == -1:
            continue

        if index_id >= len(metadata):
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
    query = re.sub(r"\s+", " ", query.strip())

    if not query:
        return []

    query = re.sub(r"\s+([?.!])", r"\1", query)

    parts = re.split(r"(?<=[?.!])\s+", query)

    questions = []

    for part in parts:
        part = part.strip(" .!?")

        if part:
            questions.append(part)

    return questions


# ============================================================
# EXTRACTIVE ANSWER GENERATION
# No LLM/API required
# ============================================================

def generate_answer(query, retrieved_chunks):
    if not retrieved_chunks:
        return FALLBACK

    # Split retrieved text into sentences.
    sentences = []

    for chunk in retrieved_chunks:
        text = chunk.get("text", "").strip()

        for sentence in re.split(r"(?<=[.!?])\s+", text):
            sentence = sentence.strip()

            if sentence:
                sentences.append(sentence)

    if not sentences:
        return FALLBACK

    # Rank sentences by overlap with meaningful query words.
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
            ranked.append((score, position, sentence))

    if not ranked:
        return FALLBACK

    # Keep the strongest sentences in their original order.
    ranked.sort(key=lambda item: (-item[0], item[1]))

    selected = ranked[:3]
    selected.sort(key=lambda item: item[1])

    return " ".join(item[2] for item in selected)


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

    for number, question in enumerate(questions, start=1):
        start = time.perf_counter()
        retrieved_chunks = retrieve(question)
        retrieval_time = time.perf_counter() - start

        print(
            f"[RAG Metrics] question={number}, "
            f"retrieval={retrieval_time:.2f}s, "
            f"chunks={len(retrieved_chunks)}"
        )

        start = time.perf_counter()
        answer = generate_answer(question, retrieved_chunks)
        generation_time = time.perf_counter() - start

        print(
            f"[RAG Metrics] question={number}, "
            f"generation={generation_time:.2f}s"
        )

        if len(questions) == 1:
            answers.append(answer.strip())
        else:
            answers.append(f"{number}. {answer.strip()}")

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
