
from pathlib import Path
import json
import re

import faiss
import numpy as np
from fastembed import TextEmbedding


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
VECTOR_DIR = BASE_DIR / "vector_store"

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 16


# ============================================================
# LOAD DOCUMENTS
# ============================================================

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


# ============================================================
# CREATE CHUNKS
# ============================================================

def create_chunks(text):
    pattern = r"(?=\n?\d+\.\s+[A-Z][^\n]*)"
    sections = re.split(pattern, text)

    return [
        section.strip()
        for section in sections
        if section.strip()
    ]


# ============================================================
# MAIN INGESTION
# ============================================================

def main():
    print("Loading documents...")

    documents = load_documents()

    if not documents:
        raise RuntimeError(
            f"No .txt documents found in {DATA_DIR}"
        )

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
        raise RuntimeError("No chunks were generated.")

    print(f"\nTotal chunks: {len(all_chunks)}")
    print(f"Loading embedding model: {EMBEDDING_MODEL}")

    model = TextEmbedding(model_name=EMBEDDING_MODEL)

    print("Generating embeddings with FastEmbed...")

    texts = [chunk["text"] for chunk in all_chunks]

    embeddings = list(
        model.embed(
            texts,
            batch_size=BATCH_SIZE
        )
    )

    embedding_matrix = np.asarray(
        embeddings,
        dtype=np.float32
    )

    if embedding_matrix.ndim != 2:
        raise RuntimeError(
            f"Unexpected embedding shape: {embedding_matrix.shape}"
        )

    if embedding_matrix.shape[0] != len(all_chunks):
        raise RuntimeError(
            "The number of embeddings does not match the number "
            "of chunks."
        )

    dimension = embedding_matrix.shape[1]

    print(f"Vector dimension: {dimension}")

    VECTOR_DIR.mkdir(parents=True, exist_ok=True)

    # Build the new index and metadata together.
    index = faiss.IndexFlatL2(dimension)
    index.add(embedding_matrix)

    index_path = VECTOR_DIR / "index.faiss"
    metadata_path = VECTOR_DIR / "metadata.json"

    faiss.write_index(index, str(index_path))

    with open(
        metadata_path,
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
    print(f"Metadata entries: {len(all_chunks)}")
    print(f"FAISS index: {index_path}")
    print(f"Metadata: {metadata_path}")


if __name__ == "__main__":
    main()
