#!/usr/bin/env python3
"""
Test script for RAG service.
"""

import sys
from pathlib import Path

# Add .cursor to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestration.rag_service import get_rag_service

def main():
    print("Testing RAG Service...")
    print("-" * 70)
    
    try:
        rag = get_rag_service()
        
        # Get stats
        stats = rag.get_stats()
        print("\nRAG Service Status:")
        print(f"  Vector DB Available: {stats.get('vector_db_available', False)}")
        print(f"  LLM Client Available: {stats.get('llm_client_available', False)}")
        
        if stats.get('vector_db'):
            db_stats = stats['vector_db']
            print(f"  Vector DB Documents: {db_stats.get('document_count', 0)}")
        
        # Test retrieval
        print("\n" + "-" * 70)
        print("Testing Retrieval...")
        
        query = "How does authentication work in FitVibe?"
        results = rag.retrieve(query, n_results=3)
        
        print(f"\nQuery: {query}")
        print(f"Results: {len(results)}")
        
        for i, result in enumerate(results, 1):
            print(f"\n[{i}] Score: {result.get('score', 0):.4f}")
            metadata = result.get('metadata', {})
            print(f"    Title: {metadata.get('title', 'N/A')}")
            print(f"    Source: {metadata.get('source_file', 'N/A')}")
            text = result.get('text', '')[:200]
            print(f"    Text: {text}...")
        
        # Test generation (if LLM available)
        if stats.get('llm_client_available'):
            print("\n" + "-" * 70)
            print("Testing Generation...")
            
            response = rag.generate(
                query=query,
                context=results[:2] if results else None
            )
            
            print(f"\nQuery: {query}")
            print(f"Response: {response[:500]}...")
        
        # Test retrieve and generate
        if stats.get('llm_client_available') and stats.get('vector_db_available'):
            print("\n" + "-" * 70)
            print("Testing Retrieve and Generate...")
            
            result = rag.retrieve_and_generate(
                query="What are the coding standards for TypeScript?",
                n_results=3
            )
            
            print(f"\nQuery: {result['metadata']['query']}")
            print(f"Documents Retrieved: {result['metadata']['docs_retrieved']}")
            print(f"Response: {result['response'][:500]}...")
        
        print("\n" + "-" * 70)
        print("[OK] RAG service test completed")
        
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()













