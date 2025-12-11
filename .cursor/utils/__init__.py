"""Utility modules for Cursor agent infrastructure."""

from .sanitization import (
    TaintLevel,
    TaintedString,
    SanitizationConfig,
    sanitize_text,
    sanitize_tool_output,
    mark_external,
    mark_system,
    mark_search,
    mark_user,
    strip_ansi_codes,
    remove_control_chars,
    normalize_whitespace,
    detect_instruction_injection,
)

__all__ = [
    "TaintLevel",
    "TaintedString",
    "SanitizationConfig",
    "sanitize_text",
    "sanitize_tool_output",
    "mark_external",
    "mark_system",
    "mark_search",
    "mark_user",
    "strip_ansi_codes",
    "remove_control_chars",
    "normalize_whitespace",
    "detect_instruction_injection",
]



