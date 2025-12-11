"""
Vector Database module for FitVibe knowledge base.

This module provides a VectorDB class for storing and searching document chunks
using ChromaDB with multilingual sentence embeddings.

Notes
-----
- Uses a persistence-first client (PersistentClient) when available; falls back to Client(Settings).
- Distance metric is implementation-defined by the collection (often cosine). We convert distances
  to a monotonic score via `1 / (1 + distance)` which works generically.
- We manage embeddings ourselves (no embedding_function passed to collection).
- IMPORTANT: Never pass both embedding_function AND embeddings= to add/upsert simultaneously.
"""

import os
import sys
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Import comprehensive sanitization module
try:
    import sys
    from pathlib import Path
    # Add parent directory to path to import utils
    utils_path = Path(__file__).parent.parent / "utils"
    if utils_path.exists():
        sys.path.insert(0, str(utils_path.parent))
    from utils.sanitization import (
        sanitize_tool_output,
        mark_search,
        SanitizationConfig,
        TaintLevel,
    )
    SANITIZATION_AVAILABLE = True
except ImportError:
    # Fallback to basic sanitization if utils not available
    SANITIZATION_AVAILABLE = False
    logging.warning("Comprehensive sanitization module not available, using basic sanitization")


class VectorDB:
    """
    Vector database for semantic search over FitVibe documentation.

    Uses ChromaDB for storage and sentence-transformers for multilingual embeddings.
    """

    def __init__(
        self,
        persist_directory: str = ".cursor/mcp/chromadb",
        collection_name: str = "fitvibe_knowledge",
        model_name: str = "paraphrase-multilingual-MiniLM-L12-v2",
        distance_metric: Optional[str] = None,
        anonymized_telemetry: bool = False,
        lazy_model: bool = False,
        batch_size: int = 32,
    ):
        """
        Initialize the VectorDB.

        Args:
            persist_directory: Directory to persist ChromaDB data
            collection_name: Name of the ChromaDB collection
            model_name: Name of the sentence-transformers model for embeddings
            distance_metric: Optional distance metric ('cosine', 'l2', 'ip')
            anonymized_telemetry: Whether to enable ChromaDB telemetry
            lazy_model: Defer model loading until first use (faster startup)
            batch_size: Batch size for encoding (tune for memory/speed tradeoff)
        """
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.model_name = model_name
        self.distance_metric = distance_metric
        self.batch_size = batch_size
        self._closed = False

        # Ensure persist directory exists
        os.makedirs(persist_directory, exist_ok=True)

        # Initialize ChromaDB client with persistence (prefer PersistentClient)
        try:
            self.client = chromadb.PersistentClient(path=persist_directory)  # type: ignore[attr-defined]
        except Exception:
            # Fallback to legacy Client(Settings)
            self.client = chromadb.Client(Settings(
                persist_directory=persist_directory,
                anonymized_telemetry=anonymized_telemetry
            ))

        # Load multilingual embedding model (lazy optional for tests/CI)
        self.embedding_model: Optional[SentenceTransformer] = None
        if not lazy_model:
            logging.info("Loading embedding model: %s", model_name)
            self.embedding_model = SentenceTransformer(model_name)
            logging.info("Embedding model loaded.")

        # Get or create collection (no embedding_function - we manage embeddings ourselves)
        metadata = {"description": "FitVibe documentation knowledge base"}
        if self.distance_metric:
            # Hint the index space when supported (e.g., 'cosine', 'l2')
            metadata["hnsw:space"] = self.distance_metric
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata=metadata
        )

    def _ensure_model(self) -> SentenceTransformer:
        """Lazy-load the embedding model if not already loaded."""
        if self.embedding_model is None:
            logging.info("Lazy-loading embedding model: %s", self.model_name)
            self.embedding_model = SentenceTransformer(self.model_name)
        return self.embedding_model

    def add_documents(
        self,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str]
    ) -> None:
        """
        Add documents to the vector database with embeddings.

        Args:
            documents: List of document texts to add
            metadatas: List of metadata dictionaries for each document
            ids: List of unique IDs for each document

        Raises:
            ValueError: If documents, metadatas, and ids have different lengths
        """
        if not documents:
            return

        if not (len(documents) == len(metadatas) == len(ids)):
            raise ValueError("documents, metadatas, and ids must have the same length")

        # Normalize/validate metadata
        norm_meta: List[Dict[str, Any]] = []
        for m in metadatas:
            if m is None:
                norm_meta.append({})
            elif isinstance(m, dict):
                norm_meta.append(m)
            else:
                norm_meta.append({"value": str(m)})

        # Generate embeddings with configurable batch size
        model = self._ensure_model()
        logging.info("Generating embeddings for %d documents...", len(documents))
        embeddings = model.encode(
            documents,
            show_progress_bar=True,
            convert_to_numpy=True,
            batch_size=self.batch_size
        ).tolist()

        # Add to ChromaDB collection
        self.collection.add(
            documents=documents,
            metadatas=norm_meta,
            embeddings=embeddings,
            ids=ids
        )
        logging.info("Added %d documents to collection '%s'.", len(documents), self.collection_name)

    def upsert_documents(
        self,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str]
    ) -> None:
        """
        Add or update documents when IDs already exist (best-effort).
        Falls back to add() when upsert is unavailable in current Chroma client.

        Args:
            documents: List of document texts to add/update
            metadatas: List of metadata dictionaries for each document
            ids: List of unique IDs for each document

        Raises:
            ValueError: If documents, metadatas, and ids have different lengths
        """
        if not (len(documents) == len(metadatas) == len(ids)):
            raise ValueError("documents, metadatas, and ids must have the same length")

        model = self._ensure_model()
        embeddings = model.encode(
            documents,
            show_progress_bar=False,
            convert_to_numpy=True,
            batch_size=self.batch_size
        ).tolist()

        try:
            self.collection.upsert(  # type: ignore[attr-defined]
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings,
                ids=ids
            )
        except AttributeError:
            # Older client: no upsert → try add and let duplicates raise
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings,
                ids=ids
            )

    def search(
        self,
        query: str,
        n_results: int = 5,
        relevance_threshold: float = 0.6,
        category_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query.

        Args:
            query: Search query text
            n_results: Maximum number of results to return
            relevance_threshold: Minimum normalized relevance score (0-1)
            category_filter: Optional category to filter results by

        Returns:
            List of result dictionaries with 'text', 'metadata', and 'score' keys
        """
        # Guard inputs
        n_results = max(1, int(n_results))
        relevance_threshold = max(0.0, min(1.0, float(relevance_threshold)))

        # Generate query embedding
        model = self._ensure_model()
        query_embedding = model.encode(
            [query],
            convert_to_numpy=True,
            batch_size=1
        ).tolist()[0]

        # Build where clause for category filtering
        where_clause = None
        if category_filter:
            where_clause = {"category": category_filter}

        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )

        # Process results and calculate normalized scores
        processed_results: List[Dict[str, Any]] = []

        ids = results.get("ids") or []
        distances = results.get("distances") or []
        documents = results.get("documents") or []
        metadatas = results.get("metadatas") or []

        # Belt-and-suspenders: defensive bounds check across client versions
        if ids and ids[0]:
            num_results = len(ids[0])

            # Ensure all result arrays have matching lengths
            if (distances and len(distances[0]) >= num_results and
                documents and len(documents[0]) >= num_results and
                metadatas and len(metadatas[0]) >= num_results):

                for idx, doc_id in enumerate(ids[0]):
                    distance = float(distances[0][idx])
                    space = (self.distance_metric or
                           (self.collection.metadata or {}).get("hnsw:space"))
                    if space == "cosine":
                        # cosine_distance = 1 - cosine_similarity
                        # map to [0,1] similarity
                        normalized_score = max(0.0, min(1.0, 1.0 - distance))
                    else:
                        # fallback for l2/ip or unknown
                        normalized_score = 1.0 / (1.0 + distance)

                    # Apply threshold filter for both cosine and fallback
                    if normalized_score >= relevance_threshold:
                        processed_results.append({
                            "id": doc_id,
                            "text": documents[0][idx],
                            "metadata": metadatas[0][idx],
                            "score": normalized_score
                        })
            else:
                logging.warning(
                    "Mismatched result array lengths: ids=%d, distances=%d, documents=%d, metadatas=%d",
                    num_results,
                    len(distances[0]) if distances and distances[0] else 0,
                    len(documents[0]) if documents and documents[0] else 0,
                    len(metadatas[0]) if metadatas and metadatas[0] else 0
                )

        # Sort by score descending
        processed_results.sort(key=lambda x: x["score"], reverse=True)

        # Apply comprehensive sanitization to all results before returning
        if SANITIZATION_AVAILABLE:
            config = SanitizationConfig(
                max_length=10_000,
                log_detections=True,
            )
            sanitized_results = sanitize_tool_output(
                processed_results[:n_results],
                source="vector_db.search",
                config=config,
                taint_level=TaintLevel.SEARCH,
            )
            # Convert TaintedString objects back to dict format
            if isinstance(sanitized_results, list):
                final_results = []
                for item in sanitized_results:
                    if isinstance(item, dict):
                        # Extract content from TaintedString if present
                        text = item.get("text", "")
                        if isinstance(text, str) and text.startswith("🔍SEARCH"):
                            # Remove taint marker for return format
                            text = text.split("\n", 1)[1] if "\n" in text else text
                        final_results.append({
                            "id": item.get("id", ""),
                            "text": text,
                            "metadata": item.get("metadata", {}),
                            "score": item.get("score", 0.0),
                        })
                return final_results
            return sanitized_results
        else:
            # Fallback: basic sanitization
            sanitized = []
            for result in processed_results[:n_results]:
                text = result.get("text", "")
                if len(text) > 10_000:
                    text = text[:10_000] + "... [truncated]"
                sanitized.append({
                    "id": result.get("id", ""),
                    "text": text,
                    "metadata": result.get("metadata", {}),
                    "score": result.get("score", 0.0),
                })
            return sanitized

    def search_by_category(
        self,
        category: str,
        query: Optional[str] = None,
        n_results: int = 10,
        relevance_threshold: float = 0.6
    ) -> List[Dict[str, Any]]:
        """
        Search documents within a specific category.

        Args:
            category: Category to search within (e.g., 'standards', 'domain')
            query: Optional search query text (if None, returns all in category)
            n_results: Maximum number of results to return
            relevance_threshold: Minimum normalized relevance score (0-1)

        Returns:
            List of result dictionaries with 'text', 'metadata', and 'score' keys
        """
        if query:
            # search() already applies sanitization
            return self.search(
                query=query,
                n_results=n_results,
                relevance_threshold=relevance_threshold,
                category_filter=category
            )
        else:
            # Get all documents in category (unordered)
            n_results = max(1, int(n_results))
            results = self.collection.get(
                where={"category": category},
                include=["documents", "metadatas", "ids"],
                limit=n_results
            )

            processed_results: List[Dict[str, Any]] = []
            ids = results.get("ids") or []
            docs = results.get("documents") or []
            metas = results.get("metadatas") or []

            # Defensive bounds check
            num_ids = len(ids)
            if len(docs) >= num_ids and len(metas) >= num_ids:
                for idx, doc_id in enumerate(ids):
                    processed_results.append({
                        "id": doc_id,
                        "text": docs[idx],
                        "metadata": metas[idx],
                        "score": 1.0  # No relevance scoring without query
                    })
            else:
                logging.warning(
                    "Mismatched get() result lengths: ids=%d, docs=%d, metas=%d",
                    num_ids, len(docs), len(metas)
                )

            # Apply sanitization to category results (use same sanitization as search)
            if SANITIZATION_AVAILABLE:
                config = SanitizationConfig(
                    max_length=10_000,
                    log_detections=True,
                )
                sanitized_results = sanitize_tool_output(
                    processed_results[:n_results],
                    source=f"vector_db.search_by_category.{category}",
                    config=config,
                    taint_level=TaintLevel.SEARCH,
                )
                # Convert TaintedString objects back to dict format
                if isinstance(sanitized_results, list):
                    final_results = []
                    for item in sanitized_results:
                        if isinstance(item, dict):
                            text = item.get("text", "")
                            if isinstance(text, str) and text.startswith("🔍SEARCH"):
                                text = text.split("\n", 1)[1] if "\n" in text else text
                            final_results.append({
                                "id": item.get("id", ""),
                                "text": text,
                                "metadata": item.get("metadata", {}),
                                "score": item.get("score", 1.0),
                            })
                    return final_results
                return sanitized_results
            else:
                # Fallback: basic sanitization
                sanitized = []
                for result in processed_results[:n_results]:
                    text = result.get("text", "")
                    if len(text) > 10_000:
                        text = text[:10_000] + "... [truncated]"
                    sanitized.append({
                        "id": result.get("id", ""),
                        "text": text,
                        "metadata": result.get("metadata", {}),
                        "score": result.get("score", 1.0),
                    })
                return sanitized

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the vector database collection.

        Returns:
            Dictionary with collection statistics
        """
        count = self.collection.count()
        return {
            "collection_name": self.collection_name,
            "document_count": count,
            "persist_directory": self.persist_directory,
            "model_name": self.model_name
        }

    def delete_collection(self) -> None:
        """Delete the current collection (irreversible)."""
        self.client.delete_collection(name=self.collection_name)

    def close(self) -> None:
        """Close underlying client if applicable."""
        if getattr(self.client, "close", None) and not self._closed:
            try:
                self.client.close()  # type: ignore[attr-defined]
            finally:
                self._closed = True


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    db = VectorDB(lazy_model=False)
    stats = db.get_collection_stats()
    print("\nVectorDB Statistics:")
    print(f"  Collection: {stats['collection_name']}")
    print(f"  Documents: {stats['document_count']}")
    print(f"  Model: {stats['model_name']}")
    print(f"  Location: {stats['persist_directory']}")
