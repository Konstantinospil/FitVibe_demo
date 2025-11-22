# FitVibe MCP Vector Database

This directory contains Python scripts for managing a vector database of FitVibe documentation using ChromaDB and multilingual sentence embeddings.

## Overview

The vector database enables semantic search over FitVibe documentation, allowing agents to quickly find relevant information based on natural language queries rather than exact keyword matches.

## Components

### `vector_db.py`

Core vector database implementation using ChromaDB:

- **Model**: `paraphrase-multilingual-MiniLM-L12-v2` (multilingual sentence embeddings)
- **Storage**: Persistent ChromaDB collection
- **Features**:
  - Document storage with metadata
  - Semantic search with relevance scoring
  - Category filtering
  - Batch processing support
  - Result sanitization

### `load_vector_db.py`

Script to load chunked documents from JSONL files:

- Batch processing for efficiency
- Skip existing documents (idempotent)
- Category override support
- Collection reset option
- Progress logging

### `test_search.py`

Simple test script to verify search functionality:

- Quick query testing
- Result preview
- Basic validation

### `verify_search_quality.py`

Comprehensive quality verification:

- Ground truth validation
- Category filter enforcement
- Ranking consistency checks
- Retrieval metrics (P@1, Recall@k, latency)
- Negative controls
- Prompt injection detection
- JSON report output for CI

## Setup

### Install Dependencies

```bash
cd .cursor/mcp
pip install -r requirements.txt
```

### Initialize Vector Database

```bash
# Load all documents from knowledge base
python load_vector_db.py --data-dir .cursor/mcp/knowledge-base/data

# Load specific file
python load_vector_db.py --file path/to/chunks.jsonl

# Reset and reload
python load_vector_db.py --reset
```

### Test Search

```bash
# Quick test
python test_search.py

# Comprehensive quality verification
python verify_search_quality.py --report-json search_quality_report.json
```

## Usage

### Basic Search

```python
from vector_db import VectorDB

db = VectorDB()
results = db.search(
    query="How does JWT authentication work?",
    n_results=5,
    relevance_threshold=0.6
)

for result in results:
    print(f"Score: {result['score']:.4f}")
    print(f"Title: {result['metadata'].get('title', 'N/A')}")
    print(f"Text: {result['text'][:200]}...")
    print()
```

### Category Filtering

```python
# Search within specific category
results = db.search_by_category(
    category="standards",
    query="API versioning",
    n_results=10
)
```

## Configuration

### Default Paths

- **Persistence**: `.cursor/mcp/chromadb`
- **Data Directory**: `.cursor/mcp/knowledge-base/data`
- **Collection Name**: `fitvibe_knowledge`

### Environment Variables

None required - all configuration is via script arguments or code.

## Data Format

Documents should be in JSONL format with the following structure:

```json
{
  "chunk_id": "doc-001-chunk-000",
  "doc_id": "doc-001",
  "text": "Document chunk text content...",
  "source_file": "docs/api-design.md",
  "category": "standards",
  "chunk_index": 0,
  "token_count": 150,
  "title": "API Design Standards",
  "tags": ["api", "design", "standards"]
}
```

## Integration with Agents

The vector database can be used by agents to:

- Search domain knowledge
- Find code examples
- Access standards and best practices
- Retrieve relevant documentation

## Quality Metrics

The verification script checks:

- **P@1**: Precision at rank 1 (top result relevance)
- **Recall@k**: Percentage of expected documents found in top-k
- **Latency**: Query response time (target: P95 < 800ms)
- **Pass Rate**: Minimum 90% of queries should pass

## Troubleshooting

### Model Loading Issues

- Ensure `sentence-transformers` is installed
- First load may take time to download the model
- Use `lazy_model=True` for faster startup in tests

### ChromaDB Issues

- Check persistence directory permissions
- Clear and rebuild if collection is corrupted: `--reset`
- Verify ChromaDB version compatibility

### Search Quality Issues

- Run `verify_search_quality.py` to diagnose
- Check if documents are properly loaded
- Verify category metadata is correct
- Adjust relevance threshold if needed

## Notes

- The vector database is separate from the MCP servers configured in `servers.json`
- These scripts are utility tools for managing the knowledge base
- For production use, consider adding these as MCP server tools
- Results are sanitized to prevent prompt injection attacks
