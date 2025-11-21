#!/usr/bin/env python3
"""
Vector DB Loader for FitVibe knowledge base.

This script loads chunked documents from JSONL files into ChromaDB
using batch processing for efficiency.
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Iterator, Optional, Set
import argparse

# Add parent directory to path for vector_db import
sys.path.insert(0, str(Path(__file__).parent))
from vector_db import VectorDB


def read_jsonl(file_path: str) -> Iterator[Dict[str, Any]]:
    """
    Read documents from a JSONL file line by line.

    Args:
        file_path: Path to the JSONL file

    Yields:
        Dictionary representing each document chunk
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError as e:
                    logging.error("JSON decode error at line %d in %s: %s", line_num, file_path, e)
    except FileNotFoundError:
        logging.error("File not found: %s", file_path)
        raise
    except Exception as e:
        logging.error("Error reading file %s: %s", file_path, e)
        raise


def batch_iterator(iterator: Iterator[Dict[str, Any]], batch_size: int = 100) -> Iterator[List[Dict[str, Any]]]:
    """
    Group items from an iterator into batches.

    Args:
        iterator: Iterator of items
        batch_size: Number of items per batch

    Yields:
        List of items (batch)
    """
    batch = []
    for item in iterator:
        batch.append(item)
        if len(batch) >= batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


def _preflight_filter_existing(db: VectorDB, ids: List[str]) -> Set[str]:
    """
    Check which IDs already exist in the collection.

    Uses a version-tolerant try-chain to handle different ChromaDB API versions.

    Args:
        db: VectorDB instance
        ids: List of IDs to check

    Returns:
        Set of IDs that already exist in the collection
    """
    if not ids:
        return set()

    # Prefer minimal payload; fall back across client versions
    try:
        # Best: ask explicitly for ids (if supported by this ChromaDB version)
        result = db.collection.get(ids=ids, include=["ids"])
    except Exception:
        try:
            # Next best: ask for nothing; many clients still return ids
            result = db.collection.get(ids=ids, include=[])
        except Exception:
            try:
                # Last resort: default include (may fetch more, but reliable)
                result = db.collection.get(ids=ids)
            except Exception as e:
                # Conservative fallback: assume none exist if we can't check
                logging.info("Preflight check failed (proceeding conservatively): %s", e)
                return set()

    return set(result.get("ids") or [])


def load_documents_from_jsonl(
    db: VectorDB,
    file_path: str,
    batch_size: int = 100,
    category_override: Optional[str] = None,
    skip_existing: bool = True
) -> Dict[str, int]:
    """
    Load documents from a JSONL file into the vector database.

    Args:
        db: VectorDB instance
        file_path: Path to the JSONL file
        batch_size: Number of documents to process per batch
        category_override: Optional category to override the one in the file
        skip_existing: If True, skip documents that already exist (faster)

    Returns:
        Dictionary with 'loaded' and 'skipped' counts
    """
    logging.info("Loading documents from: %s", file_path)
    total_loaded = 0
    total_skipped = 0

    try:
        for batch_num, batch in enumerate(batch_iterator(read_jsonl(file_path), batch_size), start=1):
            documents = []
            metadatas = []
            ids = []

            # First pass: collect all data from batch
            batch_items = []
            for item in batch:
                # Extract required fields
                chunk_id = item.get("chunk_id") or item.get("id")
                text = item.get("text", "")

                if not chunk_id or not text:
                    logging.warning("Skipping item with missing chunk_id or text: %s", item.get("id", "unknown"))
                    continue

                # Build metadata (exclude text and embedding-related fields)
                metadata = {
                    "doc_id": item.get("doc_id", ""),
                    "source_file": item.get("source_file", ""),
                    "category": category_override or item.get("category", ""),
                    "chunk_index": item.get("chunk_index", 0),
                    "token_count": item.get("token_count", 0),
                    "hash_short": item.get("hash_short", ""),
                    "version": item.get("version", 1.0),
                    "title": item.get("title", ""),
                    "mtime": item.get("mtime", ""),
                    "ingested_at": item.get("ingested_at", "")
                }

                # Add tags if present
                tags = item.get("tags")
                if tags:
                    if isinstance(tags, list):
                        metadata["tags"] = ",".join(tags)  # Store as comma-separated string
                    else:
                        metadata["tags"] = str(tags)

                batch_items.append((chunk_id, text, metadata))

            if not batch_items:
                continue

            # Preflight check: filter out existing IDs to avoid re-embedding
            if skip_existing:
                all_ids = [item[0] for item in batch_items]
                existing_ids = _preflight_filter_existing(db, all_ids)

                if existing_ids:
                    # Filter to only new items
                    new_items = [(cid, txt, meta) for cid, txt, meta in batch_items if cid not in existing_ids]
                    skipped_count = len(batch_items) - len(new_items)
                    total_skipped += skipped_count
                    batch_items = new_items

                    if skipped_count > 0:
                        logging.debug("Batch %d: Skipped %d existing documents", batch_num, skipped_count)

            # Build final lists for embedding
            for chunk_id, text, metadata in batch_items:
                documents.append(text)
                metadatas.append(metadata)
                ids.append(chunk_id)

            if documents:
                # Use upsert to handle potential re-runs and race conditions
                db.upsert_documents(documents=documents, metadatas=metadatas, ids=ids)
                total_loaded += len(documents)
                logging.info(
                    "Batch %d: Loaded %d documents (total: %d loaded, %d skipped)",
                    batch_num, len(documents), total_loaded, total_skipped
                )

    except Exception as e:
        logging.error("Error loading documents from %s: %s", file_path, e)
        raise

    logging.info(
        "Completed loading from %s: %d loaded, %d skipped",
        file_path, total_loaded, total_skipped
    )
    return {"loaded": total_loaded, "skipped": total_skipped}


def load_all_categories(
    db: VectorDB,
    data_dir: str = ".cursor/mcp/knowledge-base/data",
    batch_size: int = 100,
    skip_existing: bool = True,
    category_override: Optional[str] = None
) -> Dict[str, Dict[str, int]]:
    """
    Load all JSONL files from the data directory.

    Args:
        db: VectorDB instance
        data_dir: Directory containing JSONL chunk files
        batch_size: Number of documents to process per batch
        skip_existing: If True, skip documents that already exist
        category_override: Optional category to override for all files

    Returns:
        Dictionary mapping file paths to result dicts with 'loaded' and 'skipped' counts
    """
    data_path = Path(data_dir)
    if not data_path.exists():
        logging.error("Data directory not found: %s", data_dir)
        return {}

    results = {}
    jsonl_files = sorted(data_path.glob("*_chunks.jsonl"))

    if not jsonl_files:
        logging.warning("No *_chunks.jsonl files found in %s", data_dir)
        return results

    logging.info("Found %d JSONL files to process", len(jsonl_files))

    for jsonl_file in jsonl_files:
        try:
            result = load_documents_from_jsonl(
                db,
                str(jsonl_file),
                batch_size,
                category_override=category_override,
                skip_existing=skip_existing
            )
            results[str(jsonl_file)] = result
        except Exception as e:
            logging.error("Failed to load %s: %s", jsonl_file, e)
            results[str(jsonl_file)] = {"loaded": 0, "skipped": 0}

    return results


def main():
    """Main entry point for the vector DB loader."""
    parser = argparse.ArgumentParser(description="Load chunked documents into ChromaDB")
    parser.add_argument(
        "--data-dir",
        default=".cursor/mcp/knowledge-base/data",
        help="Directory containing JSONL chunk files"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of documents to process per batch"
    )
    parser.add_argument(
        "--persist-dir",
        default=".cursor/mcp/chromadb",
        help="ChromaDB persistence directory"
    )
    parser.add_argument(
        "--collection",
        default="fitvibe_knowledge",
        help="ChromaDB collection name"
    )
    parser.add_argument(
        "--file",
        help="Load a specific JSONL file instead of all files"
    )
    parser.add_argument(
        "--category",
        help="Override category for all loaded chunks (applies to both --file and all-files mode)"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing collection before loading"
    )
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Re-embed all documents even if they already exist (slower)"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify the collection, don't load data"
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level"
    )

    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    db = None
    try:
        # Initialize VectorDB
        logging.info("Initializing VectorDB...")
        db = VectorDB(
            persist_directory=args.persist_dir,
            collection_name=args.collection,
            distance_metric="cosine",
            lazy_model=False,
            batch_size=max(1, int(args.batch_size))  # keep encode batch size aligned
        )

        # Reset collection if requested
        if args.reset:
            logging.warning("Resetting collection: %s", args.collection)
            try:
                db.delete_collection()
                logging.info("Collection deleted successfully")
                # Recreate the collection
                db = VectorDB(
                    persist_directory=args.persist_dir,
                    collection_name=args.collection,
                    distance_metric="cosine",
                    lazy_model=False,
                    batch_size=max(1, int(args.batch_size))
                )
            except Exception as e:
                logging.warning("Could not delete collection (may not exist): %s", e)

        # Verify-only mode
        if args.verify_only:
            stats = db.get_collection_stats()
            logging.info("Collection verification:")
            logging.info("  Name: %s", stats["collection_name"])
            logging.info("  Documents: %d", stats["document_count"])
            logging.info("  Location: %s", stats["persist_directory"])
            logging.info("  Model: %s", stats["model_name"])
            return 0

        # Determine skip_existing flag
        skip_existing = not args.no_skip_existing

        # Load data
        if args.file:
            # Load a specific file
            file_path = Path(args.file)
            if not file_path.exists():
                logging.error("Specified --file does not exist: %s", file_path)
                return 1
            result = load_documents_from_jsonl(
                db,
                str(file_path),
                args.batch_size,
                category_override=args.category,
                skip_existing=skip_existing
            )
            logging.info(
                "Loaded %d documents from %s (%d skipped)",
                result["loaded"], file_path, result["skipped"]
            )
        else:
            # Load all files in data directory (--category applies here too)
            results = load_all_categories(
                db,
                args.data_dir,
                args.batch_size,
                skip_existing=skip_existing,
                category_override=args.category
            )

            # Summary
            total_loaded = sum(r["loaded"] for r in results.values())
            total_skipped = sum(r["skipped"] for r in results.values())
            logging.info("\n" + "="*60)
            logging.info("Loading Summary:")
            for file_path, result in results.items():
                logging.info(
                    "  %s: %d loaded, %d skipped",
                    Path(file_path).name, result["loaded"], result["skipped"]
                )
            logging.info("  TOTAL: %d loaded, %d skipped", total_loaded, total_skipped)
            logging.info("="*60)

        # Final verification
        stats = db.get_collection_stats()
        logging.info("\nFinal collection stats:")
        logging.info("  Name: %s", stats["collection_name"])
        logging.info("  Documents: %d", stats["document_count"])
        logging.info("  Location: %s", stats["persist_directory"])

        return 0

    except Exception as e:
        logging.error("Fatal error: %s", e, exc_info=True)
        return 1
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(main())
