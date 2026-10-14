from pathlib import Path
import json
import re
import time
import faiss
import numpy as np
import ollama


BASE_DIR = Path(__file__).resolve().parent
VECTOR_DIR = BASE_DIR / "vector_store"

EMBEDDING_MODEL = "nomic-embed-text"
GENERATION_MODEL = "gemma3:4b"

TOP_K = 3


# ============================================================
# LOAD FAISS INDEX
# ============================================================

index = faiss.read_index(
    str(VECTOR_DIR / "index.faiss")
)


# ============================================================
# LOAD METADATA
# ============================================================

with open(
    VECTOR_DIR / "metadata.json",
    "r",
    encoding="utf-8"
) as file:
    metadata = json.load(file)


# ============================================================
# GENERATE EMBEDDING
# ============================================================

def generate_embedding(text):

    response = ollama.embed(
        model=EMBEDDING_MODEL,
        input=text
    )

    return response["embeddings"][0]


# ============================================================
# RETRIEVE RELEVANT CHUNKS
# ============================================================

def retrieve(query):

    embedding = generate_embedding(query)

    query_vector = np.array(
        [embedding],
        dtype="float32"
    )

    distances, indices = index.search(
        query_vector,
        TOP_K
    )

    results = []

    for distance, index_id in zip(
        distances[0],
        indices[0]
    ):

        if index_id == -1:
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
    """
    Split a user message into individual questions
    while preserving the original order.
    """

    # Remove extra spaces
    query = re.sub(
        r"\s+",
        " ",
        query.strip()
    )

    if not query:
        return []

    # Remove spaces before punctuation
    #
    # Example:
    # "policy ? can I cancel"
    #
    # becomes:
    # "policy? can I cancel"
    query = re.sub(
        r"\s+([?.!])",
        r"\1",
        query
    )

    # Split whenever a question/sentence ends
    #
    # Supports:
    # ?
    # .
    # !
    #
    # Example:
    # "What is the policy? Can I cancel?"
    #
    # becomes:
    # [
    #   "What is the policy?",
    #   "Can I cancel?"
    # ]
    parts = re.split(
        r"(?<=[?.!])\s+",
        query
    )

    questions = []

    for part in parts:

        part = part.strip(
            " .!?"
        )

        if not part:
            continue

        # Make every extracted part a question
        if not part.endswith("?"):
            part += "?"

        questions.append(part)

    return questions



# ============================================================
# GENERATE ANSWER USING LLM — OPTIMIZED
# ============================================================

def generate_answer(query, retrieved_chunks):

    fallback = (
        "I don't have enough information in my knowledge base "
        "to answer that."
    )

    # Do not run the LLM when retrieval found no context.
    if not retrieved_chunks:
        return fallback

    context = "\n\n".join(
        f"Source: {chunk['source']}\n{chunk['text']}"
        for chunk in retrieved_chunks
    )

    prompt = f"""Answer the question using ONLY the context below.

Rules:
- Be concise and answer directly.
- Do not use outside knowledge or invent facts.
- If the context does not support an answer, reply exactly:
"{fallback}"
- Do not discuss information unrelated to the question.

Context:
{context}

Question: {query}

Answer:"""

    response = ollama.chat(
        model=GENERATION_MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        options={
            "temperature": 0,
            "num_predict": 120,
            "num_ctx": 2048
        },
        keep_alive="30m"
    )
    print(
    f"[RAG Generation Metrics] "
    f"total_duration={response.get('total_duration', 0) / 1e9:.2f}s, "
    f"load_duration={response.get('load_duration', 0) / 1e9:.2f}s, "
    f"prompt_eval_duration={response.get('prompt_eval_duration', 0) / 1e9:.2f}s, "
    f"eval_duration={response.get('eval_duration', 0) / 1e9:.2f}s, "
    f"prompt_tokens={response.get('prompt_eval_count', 0)}, "
    f"generated_tokens={response.get('eval_count', 0)}"
)

    answer = response["message"]["content"].strip()

    return answer or fallback


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

        # Measure retrieval time
        start = time.perf_counter()
        retrieved_chunks = retrieve(question)
        retrieval_time = time.perf_counter() - start

        print(
            f"[RAG Metrics] question={number}, "
            f"retrieval={retrieval_time:.2f}s, "
            f"chunks={len(retrieved_chunks)}"
        )

        # Measure answer generation time
        start = time.perf_counter()
        answer = generate_answer(question, retrieved_chunks)
        generation_time = time.perf_counter() - start

        print(
            f"[RAG Metrics] question={number}, "
            f"generation={generation_time:.2f}s"
        )

        # Number multiple answers and separate them with blank lines
        if len(questions) == 1:
            answers.append(answer.strip())
        else:
            answers.append(f"{number}. {answer.strip()}")

        # Collect unique sources for each question
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

    # Separate every answer with a blank line
    final_answer = "\n\n".join(answers)

    return {
        "answer": final_answer,
        "sources": all_sources
    }
