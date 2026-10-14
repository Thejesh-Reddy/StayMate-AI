from pathlib import Path
import json
import re

import faiss
import numpy as np
import ollama


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
VECTOR_DIR = BASE_DIR / "vector_store"

EMBEDDING_MODEL = "nomic-embed-text"


def load_documents():
    documents = []

    for file_path in DATA_DIR.rglob("*.txt"):
        text = file_path.read_text(encoding="utf-8").strip()

        if text:
            documents.append({
                "source": str(file_path),
                "text": text
            })

    return documents


def create_chunks(text):
    """
    Split the document by numbered sections.

    Example:
    1. HOTEL SEARCH
    2. BOOKING INFORMATION
    3. BOOKING CONFIRMATION
    """

    pattern = r"(?=\n?\d+\.\s+[A-Z][^\n]*)"

    sections = re.split(pattern, text)

    chunks = []

    for section in sections:
        section = section.strip()

        if section:
            chunks.append(section)

    return chunks


def generate_embedding(text):
    response = ollama.embed(
        model=EMBEDDING_MODEL,
        input=text
    )

    return response["embeddings"][0]


def main():

    print("Loading documents...")

    documents = load_documents()

    if not documents:
        print("No documents found.")
        return

    print(f"Found {len(documents)} document(s).")

    all_chunks = []

    for document in documents:

        chunks = create_chunks(document["text"])

        print(
            f"{document['source']} -> "
            f"{len(chunks)} logical chunk(s)"
        )

        for chunk in chunks:

            all_chunks.append({
                "text": chunk,
                "source": document["source"]
            })

    print(f"\nTotal chunks: {len(all_chunks)}")

    print("\nGenerating embeddings...")

    embeddings = []

    for index, chunk in enumerate(all_chunks):

        print(
            f"Embedding chunk "
            f"{index + 1}/{len(all_chunks)}"
        )

        embedding = generate_embedding(
            chunk["text"]
        )

        embeddings.append(embedding)

    embedding_matrix = np.array(
        embeddings,
        dtype="float32"
    )

    dimension = embedding_matrix.shape[1]

    index = faiss.IndexFlatL2(dimension)

    index.add(embedding_matrix)

    VECTOR_DIR.mkdir(exist_ok=True)

    faiss.write_index(
        index,
        str(VECTOR_DIR / "index.faiss")
    )

    with open(
        VECTOR_DIR / "metadata.json",
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            all_chunks,
            file,
            indent=2,
            ensure_ascii=False
        )

    print("\nRAG ingestion completed.")

    print(f"Vector dimension: {dimension}")

    print(f"Stored vectors: {index.ntotal}")


if __name__ == "__main__":
    main()