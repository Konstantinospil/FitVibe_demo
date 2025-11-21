#!/usr/bin/env python3
"""
Quick test script to verify vector search functionality.
"""

import sys
from pathlib import Path

# Add parent directory to path for vector_db import
sys.path.insert(0, str(Path(__file__).parent))
from vector_db import VectorDB


def test_search(query: str, n_results: int = 3):
    """Test vector search with a query."""
    print(f"\n{'='*80}")
    print(f"Query: {query}")
    print(f"{'='*80}\n")

    db = VectorDB(lazy_model=False)

    try:
        results = db.search(query=query, n_results=n_results, relevance_threshold=0.5)

        if not results:
            print("No results found.\n")
            return

        print(f"Found {len(results)} results:\n")

        for idx, result in enumerate(results, 1):
            # Safely encode text for Windows console
            text_preview = result['text'][:200].encode('ascii', errors='replace').decode('ascii')
            title_safe = result['metadata'].get('title', 'N/A').encode('ascii', errors='replace').decode('ascii')

            print(f"Result {idx} (score: {result['score']:.4f}):")
            print(f"  Title: {title_safe}")
            print(f"  Category: {result['metadata'].get('category', 'N/A')}")
            print(f"  Source: {result['metadata'].get('source_file', 'N/A')}")
            print(f"  Text preview: {text_preview}...")
            print()

    finally:
        db.close()


if __name__ == "__main__":
    print("\n[Testing Vector Search Functionality]\n")

    # Test 1: Authentication query
    test_search("How does authentication work with JWT tokens?", n_results=3)

    # Test 2: Database migrations query
    test_search("How do I create and run database migrations?", n_results=3)

    print("\n[Vector search tests completed successfully]")
