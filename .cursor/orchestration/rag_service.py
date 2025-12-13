"""
RAG Service - Retrieval-Augmented Generation for the multi-agent system.

This module provides RAG capabilities, integrating vector database retrieval
with LLM generation to provide context-aware responses.

Version: 1.0
Last Updated: 2025-01-21
"""

import logging
from typing import Dict, Any, Optional, List, TYPE_CHECKING
from pathlib import Path

# Import vector DB
try:
    import sys
    mcp_path = Path(__file__).parent.parent / "mcp"
    if mcp_path.exists():
        sys.path.insert(0, str(mcp_path))
    from vector_db import VectorDB
    VECTOR_DB_AVAILABLE = True
except ImportError:
    VECTOR_DB_AVAILABLE = False
    VectorDB = None  # Type placeholder
    logging.warning("VectorDB not available. RAG retrieval will be limited.")

if TYPE_CHECKING:
    # For type checking only
    if VectorDB is None:
        from typing import Any as VectorDB

from .llm_client import get_llm_client, OpenAIClient
from .config_loader import config_loader
from .audit_logger_fallback import _audit_logger_fallback as audit_logger

logger = logging.getLogger(__name__)


class RAGService:
    """
    Retrieval-Augmented Generation service.
    
    Combines vector database retrieval with LLM generation to provide
    context-aware responses for agents.
    """
    
    def __init__(
        self,
        vector_db: Optional[Any] = None,  # VectorDB type when available
        llm_client: Optional[OpenAIClient] = None,
        persist_directory: str = ".cursor/mcp/chromadb",
        collection_name: str = "fitvibe_knowledge"
    ):
        """
        Initialize RAG service.
        
        Args:
            vector_db: Optional VectorDB instance (will create if not provided)
            llm_client: Optional LLM client (will use global if not provided)
            persist_directory: Directory for vector DB persistence
            collection_name: Vector DB collection name
        """
        # Initialize vector DB
        if vector_db:
            self.vector_db = vector_db
        elif VECTOR_DB_AVAILABLE:
            try:
                self.vector_db = VectorDB(
                    persist_directory=persist_directory,
                    collection_name=collection_name,
                    lazy_model=True  # Lazy load for faster startup
                )
            except Exception as e:
                logger.warning(f"Failed to initialize VectorDB: {e}")
                self.vector_db = None
        else:
            self.vector_db = None
        
        # Initialize LLM client
        try:
            self.llm_client = llm_client or get_llm_client()
        except Exception as e:
            logger.warning(f"Failed to initialize LLM client: {e}")
            self.llm_client = None
        
        # Configuration
        self.default_n_results = config_loader.get("rag.default_n_results", 5)
        self.default_relevance_threshold = config_loader.get("rag.relevance_threshold", 0.6)
        self.max_context_length = config_loader.get("rag.max_context_length", 4000)
    
    def retrieve(
        self,
        query: str,
        n_results: int = 5,
        category: Optional[str] = None,
        relevance_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents from vector database.
        
        Args:
            query: Search query
            n_results: Number of results to return
            category: Optional category filter
            relevance_threshold: Minimum relevance score (0-1)
        
        Returns:
            List of retrieved documents with metadata and scores
        """
        if not self.vector_db:
            logger.warning("VectorDB not available. Cannot retrieve documents.")
            return []
        
        if not query or not query.strip():
            logger.warning("Empty query provided to RAG retrieve")
            return []
        
        try:
            threshold = relevance_threshold or self.default_relevance_threshold
            
            if category:
                results = self.vector_db.search_by_category(
                    category=category,
                    query=query,
                    n_results=n_results,
                    relevance_threshold=threshold
                )
            else:
                results = self.vector_db.search(
                    query=query,
                    n_results=n_results,
                    relevance_threshold=threshold
                )
            
            # Log retrieval
            audit_logger.log_tool_call(
                agent_id="RAGService",
                tool_name="retrieve",
                params={
                    "query": query[:100],  # Truncate for logging
                    "n_results": n_results,
                    "category": category
                },
                output_summary=f"Retrieved {len(results)} documents",
                status="success"
            )
            
            return results
        
        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            audit_logger.log_error(
                error_message=f"RAG retrieval failed: {str(e)}",
                agent_id="RAGService",
                tool_name="retrieve",
                context={"query": query[:100]}
            )
            return []
    
    def generate(
        self,
        query: str,
        context: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None,
        model: str = "sonnet",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate response using LLM with optional context.
        
        Args:
            query: User query
            context: Optional list of context documents
            system_prompt: Optional system prompt
            model: LLM model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated response text
        """
        if not self.llm_client:
            logger.warning("LLM client not available. Cannot generate response.")
            return "LLM client not available."
        
        # Assemble context
        context_text = ""
        if context:
            context_parts = []
            for i, doc in enumerate(context[:5], 1):  # Limit to top 5
                text = doc.get("text", "")
                metadata = doc.get("metadata", {})
                title = metadata.get("title", f"Document {i}")
                source = metadata.get("source_file", "Unknown")
                
                # Truncate if too long
                if len(text) > 500:
                    text = text[:500] + "..."
                
                context_parts.append(f"[{i}] {title} ({source}):\n{text}")
            
            context_text = "\n\n".join(context_parts)
            
            # Truncate if exceeds max length
            if len(context_text) > self.max_context_length:
                context_text = context_text[:self.max_context_length] + "\n...[truncated]"
        
        # Default system prompt
        if not system_prompt:
            system_prompt = (
                "You are a helpful assistant for the FitVibe project. "
                "Use the provided context to answer questions accurately. "
                "If the context doesn't contain relevant information, say so."
            )
        
        # Assemble user prompt
        if context_text:
            user_prompt = f"Context:\n{context_text}\n\nQuestion: {query}\n\nAnswer:"
        else:
            user_prompt = f"Question: {query}\n\nAnswer:"
        
        try:
            # Generate response
            response = self.llm_client.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Log generation
            audit_logger.log_tool_call(
                agent_id="RAGService",
                tool_name="generate",
                params={
                    "query": query[:100],
                    "model": model,
                    "context_docs": len(context) if context else 0
                },
                output_summary=f"Generated {len(response.content)} characters",
                status="success"
            )
            
            return response.content
        
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            audit_logger.log_error(
                error_message=f"RAG generation failed: {str(e)}",
                agent_id="RAGService",
                tool_name="generate",
                context={"query": query[:100]}
            )
            return f"Error generating response: {str(e)}"
    
    def retrieve_and_generate(
        self,
        query: str,
        n_results: int = 5,
        category: Optional[str] = None,
        relevance_threshold: Optional[float] = None,
        system_prompt: Optional[str] = None,
        model: str = "sonnet",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Retrieve relevant documents and generate response in one call.
        
        Args:
            query: User query
            n_results: Number of documents to retrieve
            category: Optional category filter
            relevance_threshold: Minimum relevance score
            system_prompt: Optional system prompt
            model: LLM model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
        
        Returns:
            Dictionary with 'retrieved_docs', 'response', and 'metadata'
        """
        # Retrieve documents
        retrieved_docs = self.retrieve(
            query=query,
            n_results=n_results,
            category=category,
            relevance_threshold=relevance_threshold
        )
        
        # Generate response
        response = self.generate(
            query=query,
            context=retrieved_docs,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return {
            "retrieved_docs": retrieved_docs,
            "response": response,
            "metadata": {
                "query": query,
                "n_results": n_results,
                "category": category,
                "docs_retrieved": len(retrieved_docs),
                "model": model
            }
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG service statistics."""
        stats = {
            "vector_db_available": self.vector_db is not None,
            "llm_client_available": self.llm_client is not None,
        }
        
        if self.vector_db:
            try:
                db_stats = self.vector_db.get_collection_stats()
                stats["vector_db"] = db_stats
            except Exception as e:
                stats["vector_db_error"] = str(e)
        
        return stats


# Global RAG service instance
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """Get or create global RAG service instance."""
    global _rag_service
    
    if _rag_service is None:
        _rag_service = RAGService()
    
    return _rag_service













