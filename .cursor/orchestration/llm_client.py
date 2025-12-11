"""
OpenAI LLM Client - Integration with ChatGPT/OpenAI API.

This module provides a client for interacting with OpenAI's API, including
GPT-4, GPT-3.5-turbo, and other models. It handles prompt assembly, API calls,
streaming, token tracking, and error handling.

Version: 1.0
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

logger = logging.getLogger(__name__)


class ModelTier(Enum):
    """OpenAI model tiers mapped from our internal model names."""
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


class OpenAIClient:
    """Client for OpenAI API interactions."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        organization: Optional[str] = None,
        timeout: float = 60.0,
        max_retries: int = 3
    ):
        """
        Initialize OpenAI client.

        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            organization: OpenAI organization ID (optional)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries
        """
        if not OPENAI_AVAILABLE:
            raise ImportError(
                "OpenAI package not installed. Install with: pip install openai"
            )

        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not provided. Set OPENAI_API_KEY environment variable "
                "or pass api_key parameter."
            )

        self.organization = organization or os.environ.get("OPENAI_ORG_ID")
        self.timeout = timeout
        self.max_retries = max_retries

        # Initialize clients
        client_kwargs = {
            "api_key": self.api_key,
            "timeout": timeout,
            "max_retries": max_retries
        }
        if self.organization:
            client_kwargs["organization"] = self.organization

        self.client = OpenAI(**client_kwargs)
        self.async_client = AsyncOpenAI(**client_kwargs) if OPENAI_AVAILABLE else None

        # Model mapping
        self.model_mapping = {
            "haiku": ModelTier.HAIKU.value,
            "sonnet": ModelTier.SONNET.value,
            "opus": ModelTier.OPUS.value,
            "gpt-3.5-turbo": ModelTier.HAIKU.value,
            "gpt-4": ModelTier.SONNET.value,
            "gpt-4-turbo-preview": ModelTier.OPUS.value,
        }

    def _map_model(self, model_name: str) -> str:
        """Map internal model name to OpenAI model name."""
        return self.model_mapping.get(model_name.lower(), ModelTier.SONNET.value)

    def _assemble_messages(
        self,
        system_prompt: str,
        user_prompt: str,
        context: Optional[Dict[str, Any]] = None,
        previous_messages: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, str]]:
        """
        Assemble messages for OpenAI API.

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
        Complete a prompt using OpenAI API.

        Args:
            system_prompt: System/instruction prompt
            user_prompt: User query/task
            model: Model to use (haiku, sonnet, opus, or OpenAI model name)
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
            audit_logger.log_tool_call(
                agent_id="OpenAIClient",
                tool_name="complete",
                params={
                    "model": mapped_model,
                    "temperature": temperature,
                    "max_tokens": max_tokens
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
            audit_logger.log_error(
                error_message=f"OpenAI API call failed: {error_msg}",
                agent_id="OpenAIClient",
                tool_name="complete",
                context={"model": mapped_model, "error": error_msg}
            )

            # Re-raise with classification
            if classified.category == ErrorCategory.RATE_LIMIT:
                raise Exception(f"Rate limit exceeded: {error_msg}") from e
            elif classified.category == ErrorCategory.TIMEOUT:
                raise Exception(f"Request timeout: {error_msg}") from e
            else:
                raise Exception(f"OpenAI API error: {error_msg}") from e

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
_llm_client: Optional[OpenAIClient] = None


def get_llm_client() -> OpenAIClient:
    """Get or create global LLM client instance."""
    global _llm_client

    if _llm_client is None:
        try:
            _llm_client = OpenAIClient(
                timeout=config_loader.get("agent_executor.default_timeout_seconds", 300),
                max_retries=config_loader.get("agent_executor.retry_attempts", 3)
            )
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise

    return _llm_client


