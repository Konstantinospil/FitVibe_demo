#!/usr/bin/env python3
"""
Document Chunking Script - Processes markdown files from docs folder and creates JSONL chunks.

This script:
1. Recursively finds all markdown files in the docs folder
2. Splits them into chunks
3. Creates JSONL files with chunk metadata
4. Optionally loads them into the vector database
"""

import os
import re
import json
import hashlib
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any, Iterator
from datetime import datetime

# Add parent directory to path for vector_db import
import sys
sys.path.insert(0, str(Path(__file__).parent))

try:
    from vector_db import VectorDB
    VECTOR_DB_AVAILABLE = True
except ImportError:
    VECTOR_DB_AVAILABLE = False
    logging.warning("VectorDB not available. Will only create JSONL files.")


def extract_title(content: str) -> str:
    """Extract title from markdown content."""
    # Try to find first H1
    h1_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if h1_match:
        return h1_match.group(1).strip()
    
    # Fallback to filename
    return ""


def determine_category(file_path: Path) -> str:
    """Determine category based on file path."""
    path_str = str(file_path)
    
    if "Product_Requirements" in path_str or "1." in path_str:
        return "requirements"
    elif "Technical_Design" in path_str or "2." in path_str:
        return "technical"
    elif "Sensory_Design" in path_str or "3." in path_str:
        return "design"
    elif "Testing" in path_str or "4." in path_str:
        return "testing"
    elif "Policies" in path_str or "5." in path_str:
        return "policies"
    elif "Implementation" in path_str or "6." in path_str:
        return "implementation"
    elif "rules" in path_str.lower():
        return "rules"
    elif "workflows" in path_str.lower():
        return "workflows"
    elif "agents" in path_str.lower():
        return "agents"
    else:
        return "documentation"


def chunk_markdown(
    content: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> List[str]:
    """
    Split markdown content into chunks.
    
    Args:
        content: Markdown content
        chunk_size: Target chunk size in characters
        chunk_overlap: Overlap between chunks in characters
    
    Returns:
        List of text chunks
    """
    # Remove excessive whitespace
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    # Split by sections (headers)
    sections = re.split(r'\n(#{1,6}\s+.+)\n', content)
    
    chunks = []
    current_chunk = ""
    
    for i, section in enumerate(sections):
        # If it's a header, add it to current chunk
        if re.match(r'^#{1,6}\s+', section):
            if current_chunk and len(current_chunk) > chunk_size:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap
                if chunk_overlap > 0:
                    overlap_text = current_chunk[-chunk_overlap:]
                    current_chunk = overlap_text + "\n\n" + section + "\n"
                else:
                    current_chunk = section + "\n"
            else:
                current_chunk += "\n" + section + "\n" if current_chunk else section + "\n"
        else:
            # Regular content
            current_chunk += section
            
            # If chunk is large enough, split it
            if len(current_chunk) > chunk_size:
                # Try to split at sentence boundaries
                sentences = re.split(r'([.!?]\s+)', current_chunk)
                temp_chunk = ""
                
                for sentence in sentences:
                    if len(temp_chunk) + len(sentence) > chunk_size and temp_chunk:
                        chunks.append(temp_chunk.strip())
                        # Start new chunk with overlap
                        if chunk_overlap > 0 and len(temp_chunk) > chunk_overlap:
                            overlap_text = temp_chunk[-chunk_overlap:]
                            temp_chunk = overlap_text + sentence
                        else:
                            temp_chunk = sentence
                    else:
                        temp_chunk += sentence
                
                current_chunk = temp_chunk
    
    # Add remaining chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks


def process_markdown_file(
    file_path: Path,
    output_dir: Path,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> str:
    """
    Process a single markdown file and create JSONL chunks.
    
    Args:
        file_path: Path to markdown file
        output_dir: Directory to write JSONL file
        chunk_size: Target chunk size
        chunk_overlap: Overlap between chunks
    
    Returns:
        Path to created JSONL file
    """
    # Read file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        logging.error(f"Error reading {file_path}: {e}")
        return ""
    
    if not content.strip():
        logging.warning(f"Empty file: {file_path}")
        return ""
    
    # Get file metadata
    file_stat = file_path.stat()
    mtime = datetime.fromtimestamp(file_stat.st_mtime).isoformat()
    
    # Extract title
    title = extract_title(content)
    if not title:
        title = file_path.stem.replace('-', ' ').replace('_', ' ').title()
    
    # Determine category
    category = determine_category(file_path)
    
    # Chunk content
    chunks = chunk_markdown(content, chunk_size, chunk_overlap)
    
    if not chunks:
        logging.warning(f"No chunks created for {file_path}")
        return ""
    
    # Create doc_id from file path
    doc_id = str(file_path).replace('\\', '/').replace('/', '_').replace('.md', '')
    
    # Create JSONL file
    output_file = output_dir / f"{file_path.stem}_chunks.jsonl"
    
    ingested_at = datetime.utcnow().isoformat()
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for idx, chunk_text in enumerate(chunks):
            # Create chunk ID
            chunk_id = f"{doc_id}_chunk_{idx:03d}"
            
            # Create hash
            chunk_hash = hashlib.sha256(chunk_text.encode('utf-8')).hexdigest()
            hash_short = chunk_hash[:8]
            
            # Estimate token count (rough: ~4 chars per token)
            token_count = len(chunk_text) // 4
            
            # Create chunk record
            chunk_record = {
                "chunk_id": chunk_id,
                "doc_id": doc_id,
                "text": chunk_text,
                "source_file": str(file_path).replace('\\', '/'),
                "category": category,
                "chunk_index": idx,
                "token_count": token_count,
                "hash_short": hash_short,
                "version": 1.0,
                "title": title,
                "mtime": mtime,
                "ingested_at": ingested_at,
                "tags": [category, file_path.suffix[1:]]  # category and file extension
            }
            
            # Write as JSONL
            f.write(json.dumps(chunk_record, ensure_ascii=False) + '\n')
    
    logging.info(f"Created {len(chunks)} chunks for {file_path.name} -> {output_file.name}")
    return str(output_file)


def process_docs_folder(
    docs_dir: Path,
    output_dir: Path,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> List[str]:
    """
    Process all markdown files in docs folder.
    
    Args:
        docs_dir: Directory containing markdown files
        output_dir: Directory to write JSONL files
        chunk_size: Target chunk size
        chunk_overlap: Overlap between chunks
    
    Returns:
        List of created JSONL file paths
    """
    if not docs_dir.exists():
        logging.error(f"Docs directory not found: {docs_dir}")
        return []
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all markdown files
    md_files = list(docs_dir.rglob("*.md"))
    
    if not md_files:
        logging.warning(f"No markdown files found in {docs_dir}")
        return []
    
    logging.info(f"Found {len(md_files)} markdown files")
    
    jsonl_files = []
    for md_file in md_files:
        # Skip certain files
        if md_file.name in ["README.md", "INDEX.md", "TEMPLATE.md"]:
            continue
        
        try:
            jsonl_file = process_markdown_file(
                md_file,
                output_dir,
                chunk_size,
                chunk_overlap
            )
            if jsonl_file:
                jsonl_files.append(jsonl_file)
        except Exception as e:
            logging.error(f"Error processing {md_file}: {e}")
    
    return jsonl_files


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Chunk markdown files from docs folder and load into vector DB"
    )
    parser.add_argument(
        "--docs-dir",
        default="docs",
        help="Directory containing markdown files (default: docs)"
    )
    parser.add_argument(
        "--output-dir",
        default=".cursor/mcp/knowledge-base/data",
        help="Directory to write JSONL chunk files"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Target chunk size in characters (default: 1000)"
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=200,
        help="Overlap between chunks in characters (default: 200)"
    )
    parser.add_argument(
        "--load",
        action="store_true",
        help="Load chunks into vector database after creating them"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset vector database collection before loading"
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
    
    # Process docs folder
    docs_dir = Path(args.docs_dir)
    output_dir = Path(args.output_dir)
    
    logging.info(f"Processing markdown files from: {docs_dir}")
    logging.info(f"Output directory: {output_dir}")
    
    jsonl_files = process_docs_folder(
        docs_dir,
        output_dir,
        args.chunk_size,
        args.chunk_overlap
    )
    
    logging.info(f"Created {len(jsonl_files)} JSONL files")
    
    # Load into vector DB if requested
    if args.load and VECTOR_DB_AVAILABLE:
        logging.info("Loading chunks into vector database...")
        
        try:
            db = VectorDB(
                persist_directory=".cursor/mcp/chromadb",
                collection_name="fitvibe_knowledge"
            )
            
            if args.reset:
                logging.warning("Resetting collection...")
                db.delete_collection()
                db = VectorDB(
                    persist_directory=".cursor/mcp/chromadb",
                    collection_name="fitvibe_knowledge"
                )
            
            # Load all JSONL files
            from load_vector_db import load_all_categories
            
            results = load_all_categories(
                db,
                data_dir=str(output_dir),
                batch_size=100,
                skip_existing=True
            )
            
            total_loaded = sum(r.get("loaded", 0) for r in results.values())
            total_skipped = sum(r.get("skipped", 0) for r in results.values())
            
            logging.info(f"Loaded {total_loaded} chunks, skipped {total_skipped} existing")
            
        except Exception as e:
            logging.error(f"Error loading into vector DB: {e}")
            import traceback
            traceback.print_exc()
    elif args.load and not VECTOR_DB_AVAILABLE:
        logging.warning("VectorDB not available. Skipping load step.")
        logging.info("To load chunks manually, run:")
        logging.info(f"  python .cursor/mcp/load_vector_db.py --data-dir {output_dir}")


if __name__ == "__main__":
    main()













