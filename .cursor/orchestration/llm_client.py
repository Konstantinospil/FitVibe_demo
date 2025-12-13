"""
LLM Client - Multi-provider LLM integration (OpenAI, Cursor, etc.).

This module provides a client for interacting with LLM APIs, including
OpenAI (GPT-4, GPT-3.5-turbo) and Cursor AI. It handles prompt assembly, API calls,
streaming, token tracking, and error handling.

Version: 2.0
Last Updated: 2025-01-21
"""

import os
import json
import logging
import time
from typing import Dict, Any, Optional, List, Iterator, AsyncIterator
from dataclasses import dataclass, field
from enum import Enum

try:
    import openai
    from openai import OpenAI, AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logging.warning("OpenAI package not installed. Install with: pip install openai")

from .config_loader import config_loader
from .error_handling import error_classifier, ErrorCategory
from .audit_logger_fallback import _audit_logger_fallback as audit_logger

# Load .env file if it exists (when module is imported)
try:
    from dotenv import load_dotenv
    from pathlib import Path
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=False)
except ImportError:
    # python-dotenv not installed, will use manual loading in __init__.py
    pass
except Exception:
    # Silently fail if .env loading fails
    pass

logger = logging.getLogger(__name__)


class LLMProvider(Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    CURSOR = "cursor"
    OLLAMA = "ollama"  # Local LLM, no API key needed


class ModelTier(Enum):
    """Model tiers mapped from our internal model names."""
    HAIKU = "gpt-3.5-turbo"  # Fast, cost-effective
    SONNET = "gpt-4"  # Balanced quality and cost
    OPUS = "gpt-4-turbo-preview"  # Highest quality


@dataclass
class TokenUsage:
    """Token usage statistics."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    @property
    def cost_usd(self) -> float:
        """Calculate estimated cost in USD."""
        # OpenAI pricing (as of 2024, adjust as needed)
        # GPT-3.5-turbo: $0.0015/1K input, $0.002/1K output
        # GPT-4: $0.03/1K input, $0.06/1K output
        # GPT-4-turbo: $0.01/1K input, $0.03/1K output
        # For now, use average pricing
        input_cost = (self.prompt_tokens / 1000) * 0.01
        output_cost = (self.completion_tokens / 1000) * 0.03
        return input_cost + output_cost


@dataclass
class LLMResponse:
    """Response from LLM API."""
    content: str
    model: str
    token_usage: TokenUsage
    finish_reason: str
    response_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class LLMClient:
    """Multi-provider LLM client supporting OpenAI and Cursor."""

    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        organization: Optional[str] = None,
        timeout: float = 60.0,
        max_retries: int = 3
    ):
        """
        Initialize LLM client.

        Args:
            provider: Provider name ("openai", "cursor") - defaults to LLM_PROVIDER env var or "openai"
            api_key: API key (defaults to OPENAI_API_KEY or CURSOR_API_KEY env var based on provider)
            base_url: Custom API base URL (optional, provider-specific defaults used if not provided)
            organization: Organization ID (OpenAI only, optional)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries
        """
        if not OPENAI_AVAILABLE:
            raise ImportError(
                "OpenAI package not installed. Install with: pip install openai"
            )

        # Determine provider
        provider_str = provider or os.environ.get("LLM_PROVIDER", "openai").lower()
        try:
            self.provider = LLMProvider(provider_str)
        except ValueError:
            logger.warning(f"Unknown provider '{provider_str}', defaulting to 'openai'")
            self.provider = LLMProvider.OPENAI

        # Get API key based on provider (Ollama doesn't need one)
        if api_key:
            self.api_key = api_key
        elif self.provider == LLMProvider.OLLAMA:
            # Ollama doesn't require an API key
            self.api_key = "ollama"  # Placeholder, not actually used
        elif self.provider == LLMProvider.CURSOR:
            self.api_key = os.environ.get("CURSOR_API_KEY") or os.environ.get("OPENAI_API_KEY")
        else:
            self.api_key = os.environ.get("OPENAI_API_KEY")

        if not self.api_key and self.provider != LLMProvider.OLLAMA:
            if self.provider == LLMProvider.CURSOR:
                raise ValueError(
                    "CURSOR API key not provided. Set CURSOR_API_KEY environment variable "
                    "or pass api_key parameter."
                )
            else:
                raise ValueError(
                    "OpenAI API key not provided. Set OPENAI_API_KEY environment variable "
                    "or pass api_key parameter."
                )

        # Set base URL based on provider
        if base_url:
            self.base_url = base_url
        elif self.provider == LLMProvider.OLLAMA:
            # Ollama runs locally on port 11434
            self.base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
            logger.info(f"Using Ollama local LLM at {self.base_url}")
        elif self.provider == LLMProvider.CURSOR:
            # Cursor uses OpenAI-compatible API
            # Note: Cursor IDE may use OpenAI's API with a proxy, or a local server
            # Default to OpenAI's endpoint as Cursor typically proxies through OpenAI
            # Users can override with CURSOR_API_BASE_URL if Cursor has a custom endpoint
            cursor_base = os.environ.get("CURSOR_API_BASE_URL")
            if cursor_base:
                self.base_url = cursor_base
            else:
                # Cursor typically uses OpenAI's API, so use OpenAI endpoint
                # If you have a Cursor-specific endpoint, set CURSOR_API_BASE_URL
                self.base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
                logger.info(
                    "Using OpenAI-compatible endpoint for Cursor. "
                    "If Cursor has a custom endpoint, set CURSOR_API_BASE_URL environment variable."
                )
        else:
            # OpenAI default
            self.base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

        self.organization = organization or os.environ.get("OPENAI_ORG_ID")
        self.timeout = timeout
        self.max_retries = max_retries

        # Initialize clients (OpenAI SDK works with Cursor's OpenAI-compatible API)
        client_kwargs = {
            "api_key": self.api_key,
            "base_url": self.base_url,
            "timeout": timeout,
            "max_retries": max_retries
        }
        if self.organization and self.provider == LLMProvider.OPENAI:
            client_kwargs["organization"] = self.organization

        self.client = OpenAI(**client_kwargs)
        self.async_client = AsyncOpenAI(**client_kwargs) if OPENAI_AVAILABLE else None

        # Model mapping (works for both OpenAI and Cursor)
        self.model_mapping = {
            "haiku": ModelTier.HAIKU.value,
            "sonnet": ModelTier.SONNET.value,
            "opus": ModelTier.OPUS.value,
            "gpt-3.5-turbo": ModelTier.HAIKU.value,
            "gpt-4": ModelTier.SONNET.value,
            "gpt-4-turbo-preview": ModelTier.OPUS.value,
        }

    def _map_model(self, model_name: str) -> str:
        """Map internal model name to provider model name."""
        # For Cursor, use the same model names (OpenAI-compatible)
        return self.model_mapping.get(model_name.lower(), ModelTier.SONNET.value)

    def _assemble_messages(
        self,
        system_prompt: str,
        user_prompt: str,
        context: Optional[Dict[str, Any]] = None,
        previous_messages: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, str]]:
        """
        Assemble messages for LLM API (OpenAI-compatible format).

        Args:
            system_prompt: System/instruction prompt
            user_prompt: User query/task
            context: Additional context (codebase, docs, etc.)
            previous_messages: Previous conversation messages

        Returns:
            List of message dictionaries
        """
        messages = []

        # System message
        if system_prompt:
            messages.append({
                "role": "system",
                "content": system_prompt
            })

        # Add context if provided
        if context:
            context_text = self._format_context(context)
            if context_text:
                messages.append({
                    "role": "system",
                    "content": f"Additional Context:\n{context_text}"
                })

        # Previous messages (for conversation continuity)
        if previous_messages:
            messages.extend(previous_messages)

        # User message
        messages.append({
            "role": "user",
            "content": user_prompt
        })

        return messages

    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context dictionary into text."""
        parts = []

        if "codebase" in context:
            parts.append(f"Codebase Context:\n{context['codebase']}")

        if "documentation" in context:
            parts.append(f"Documentation:\n{context['documentation']}")

        if "previous_executions" in context:
            prev = context["previous_executions"]
            if prev:
                parts.append(f"Previous Agent Executions:\n{json.dumps(prev, indent=2)}")

        if "input_data" in context:
            parts.append(f"Input Data:\n{json.dumps(context['input_data'], indent=2)}")

        return "\n\n".join(parts)

    def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "sonnet",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None,
        previous_messages: Optional[List[Dict[str, str]]] = None,
        stream: bool = False
    ) -> LLMResponse:
        """
        Complete a prompt using LLM API (OpenAI or Cursor).

        Args:
            system_prompt: System/instruction prompt
            user_prompt: User query/task
            model: Model to use (haiku, sonnet, opus, or provider model name)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            context: Additional context
            previous_messages: Previous conversation messages
            stream: Whether to stream the response

        Returns:
            LLMResponse with content and metadata
        """
        start_time = time.time()
        mapped_model = self._map_model(model)

        # Assemble messages
        messages = self._assemble_messages(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context=context,
            previous_messages=previous_messages
        )

        # Prepare API call
        api_kwargs = {
            "model": mapped_model,
            "messages": messages,
            "temperature": temperature,
        }

        if max_tokens:
            api_kwargs["max_tokens"] = max_tokens

        try:
            if stream:
                # Handle streaming
                response = self._complete_stream(api_kwargs)
            else:
                # Handle non-streaming
                response_obj = self.client.chat.completions.create(**api_kwargs)

                # Extract response
                content = response_obj.choices[0].message.content
                finish_reason = response_obj.choices[0].finish_reason

                # Token usage
                usage = response_obj.usage
                token_usage = TokenUsage(
                    prompt_tokens=usage.prompt_tokens if usage else 0,
                    completion_tokens=usage.completion_tokens if usage else 0,
                    total_tokens=usage.total_tokens if usage else 0
                )

                response = LLMResponse(
                    content=content or "",
                    model=mapped_model,
                    token_usage=token_usage,
                    finish_reason=finish_reason or "stop",
                    response_time_ms=(time.time() - start_time) * 1000,
                    metadata={
                        "response_id": response_obj.id,
                        "created": response_obj.created
                    }
                )

            # Log usage
            provider_name = f"{self.provider.value.capitalize()}Client"
            audit_logger.log_tool_call(
                agent_id=provider_name,
                tool_name="complete",
                params={
                    "model": mapped_model,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "provider": self.provider.value
                },
                output_summary=f"Generated {len(response.content)} characters",
                duration_ms=response.response_time_ms,
                status="success"
            )

            return response

        except Exception as e:
            error_msg = str(e)
            classified = error_classifier.classify(e)

            # Log error
            provider_name = f"{self.provider.value.capitalize()}Client"
            audit_logger.log_error(
                error_message=f"{self.provider.value.upper()} API call failed: {error_msg}",
                agent_id=provider_name,
                tool_name="complete",
                context={
                    "model": mapped_model,
                    "provider": self.provider.value,
                    "base_url": self.base_url,
                    "error": error_msg
                }
            )

            # Provide helpful error messages for API key errors (401)
            if "invalid_api_key" in error_msg.lower() or "401" in error_msg or "Incorrect API key" in error_msg:
                if self.provider == LLMProvider.CURSOR:
                    helpful_msg = (
                        f"❌ Cursor API key rejected by {self.base_url}\n\n"
                        f"⚠️  Issue: Cursor IDE may not have a public API compatible with OpenAI's endpoint.\n"
                        f"   The Cursor API key format (key_...) is different from OpenAI's format (sk-...).\n\n"
                        f"💡 Solutions:\n"
                        f"   1. Use OpenAI's API directly:\n"
                        f"      - Set LLM_PROVIDER=openai in .cursor/.env\n"
                        f"      - Set OPENAI_API_KEY=sk-your-openai-key in .cursor/.env\n"
                        f"   2. If Cursor has a custom endpoint, set CURSOR_API_BASE_URL\n"
                        f"   3. Check Cursor documentation for the correct API endpoint\n\n"
                        f"📝 Note: Cursor IDE's API key may only work within Cursor IDE itself, "
                        f"not for external API calls."
                    )
                    raise Exception(helpful_msg) from e

            # Provide helpful error messages for connection errors
            if "Connection" in error_msg or "connection" in error_msg.lower() or "Failed to establish" in error_msg:
                if self.provider == LLMProvider.CURSOR:
                    helpful_msg = (
                        f"Cursor API connection failed to {self.base_url}.\n"
                        f"Note: Cursor IDE may not expose a public API endpoint.\n"
                        f"Please verify:\n"
                        f"  1. Your CURSOR_API_KEY is valid\n"
                        f"  2. Cursor has a public API endpoint (check Cursor documentation)\n"
                        f"  3. If Cursor doesn't have a public API, use LLM_PROVIDER=openai with OPENAI_API_KEY instead"
                    )
                    raise Exception(helpful_msg) from e

            # Re-raise with classification
            if classified.category == ErrorCategory.RATE_LIMIT:
                raise Exception(f"Rate limit exceeded: {error_msg}") from e
            elif classified.category == ErrorCategory.TIMEOUT:
                raise Exception(f"Request timeout: {error_msg}") from e
            else:
                raise Exception(f"{self.provider.value.upper()} API error: {error_msg}") from e

    def _complete_stream(self, api_kwargs: Dict[str, Any]) -> LLMResponse:
        """Handle streaming response."""
        # For now, collect all chunks and return as single response
        # In the future, this could return an iterator
        content_parts = []
        start_time = time.time()

        stream = self.client.chat.completions.create(
            **api_kwargs,
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                content_parts.append(chunk.choices[0].delta.content)

        content = "".join(content_parts)

        # Estimate token usage (rough approximation)
        estimated_tokens = len(content.split()) * 1.3  # Rough estimate

        return LLMResponse(
            content=content,
            model=api_kwargs["model"],
            token_usage=TokenUsage(
                prompt_tokens=0,  # Would need to track separately
                completion_tokens=int(estimated_tokens),
                total_tokens=int(estimated_tokens)
            ),
            finish_reason="stop",
            response_time_ms=(time.time() - start_time) * 1000,
            metadata={"streamed": True}
        )

    def count_tokens(self, text: str, model: str = "sonnet") -> int:
        """
        Estimate token count for text.

        Note: This is a rough estimation. For accurate counts, use tiktoken.
        """
        # Rough estimation: ~4 characters per token for English text
        # For more accuracy, install tiktoken: pip install tiktoken
        return len(text) // 4


# Global instance (lazy initialization)
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get or create global LLM client instance."""
    global _llm_client

    if _llm_client is None:
        try:
            provider = config_loader.get("llm.provider") or os.environ.get("LLM_PROVIDER", "openai")
            _llm_client = LLMClient(
                provider=provider,
                timeout=config_loader.get("agent_executor.default_timeout_seconds", 300),
                max_retries=config_loader.get("agent_executor.retry_attempts", 3)
            )
        except Exception as e:
            logger.error(f"Failed to initialize LLM client: {e}")
            raise

    return _llm_client


# Backward compatibility alias
OpenAIClient = LLMClient


