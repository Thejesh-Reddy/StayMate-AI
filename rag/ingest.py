
from pathlib import Path
import json
import re

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
VECTOR_DIR = BASE_DIR / "vector_store"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def load_documents():
    documents = []

    for file_path in sorted(DATA_DIR.rglob("*.txt")):
        text = file_path.read_text(encoding="utf-8").strip()

        if text:
            documents.append({
                "source": str(file_path.relative_to(BASE_DIR)),
                "text": text
            })

    return documents


def create_chunks(text):
    pattern = r"(?=\n?\d+\.\s+[A-Z][^\n]*)"
    sections = re.split(pattern, text)

    return [
        section.strip()
        for section in sections
        if section.strip()
    ]


def main():
    print("Loading documents...")

    documents = load_documents()

    if not documents:
        print(f"No .txt documents found in: {DATA_DIR}")
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

    if not all_chunks:
        print("No chunks were generated.")
        return

    print(f"\nTotal chunks: {len(all_chunks)}")
    print(f"Loading embedding model: {EMBEDDING_MODEL}")

    model = SentenceTransformer(EMBEDDING_MODEL)

    print("Generating embeddings...")

    texts = [chunk["text"] for chunk in all_chunks]

    embedding_matrix = model.encode(
        texts,
        batch_size=16,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=False
    )

    embedding_matrix = np.asarray(
        embedding_matrix,
        dtype="float32"
    )

    dimension = embedding_matrix.shape[1]

    index = faiss.IndexFlatL2(dimension)
    index.add(embedding_matrix)

    VECTOR_DIR.mkdir(parents=True, exist_ok=True)

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

    print("\nRAG ingestion completed successfully.")
    print(f"Embedding model: {EMBEDDING_MODEL}")
    print(f"Vector dimension: {dimension}")
    print(f"Stored vectors: {index.ntotal}")
    print(f"FAISS index: {VECTOR_DIR / 'index.faiss'}")
    print(f"Metadata: {VECTOR_DIR / 'metadata.json'}")


if __name__ == "__main__":
    main()
