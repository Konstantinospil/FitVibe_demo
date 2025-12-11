#!/usr/bin/env python3
"""
Test script for LLM integration.
Tests OpenAI API connection and basic functionality.
"""

import os
import sys
from pathlib import Path

# Add .cursor to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set API key if provided as argument
if len(sys.argv) > 1:
    os.environ["OPENAI_API_KEY"] = sys.argv[1]

try:
    from orchestration import get_llm_client
    
    print("Testing LLM Integration...")
    print("-" * 50)
    
    # Initialize client
    try:
        client = get_llm_client()
        print("[OK] LLM client initialized successfully")
        print(f"  Model mapping: {list(client.model_mapping.keys())}")
    except Exception as e:
        print(f"[ERROR] Failed to initialize LLM client: {e}")
        sys.exit(1)
    
    # Test a simple completion
    print("\nTesting API call...")
    try:
        response = client.complete(
            system_prompt="You are a helpful assistant.",
            user_prompt="Say 'Hello, FitVibe!' in one sentence.",
            model="haiku",  # Use cheapest model for testing
            max_tokens=50
        )
        
        print("[OK] API call successful")
        print(f"  Response: {response.content[:100]}...")
        print(f"  Model: {response.model}")
        print(f"  Tokens: {response.token_usage.total_tokens} (prompt: {response.token_usage.prompt_tokens}, completion: {response.token_usage.completion_tokens})")
        print(f"  Cost: ${response.token_usage.cost_usd:.6f}")
        print(f"  Response time: {response.response_time_ms:.0f}ms")
        
    except Exception as e:
        print(f"[ERROR] API call failed: {e}")
        sys.exit(1)
    
    print("\n" + "-" * 50)
    print("All tests passed! [OK]")
    
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    print("\nMake sure you're running from the project root and all dependencies are installed:")
    print("  pip install openai")
    sys.exit(1)

