#!/usr/bin/env python3
"""
Test runner for orchestration module tests.

This script runs tests for the orchestration module with proper path setup.
"""

import sys
import pytest
from pathlib import Path

# Add .cursor to Python path
cursor_path = Path(__file__).parent.parent
sys.path.insert(0, str(cursor_path))

if __name__ == "__main__":
    # Run tests
    test_dir = cursor_path / "orchestration" / "__tests__"
    exit_code = pytest.main([
        str(test_dir),
        "-v",
        "--tb=short"
    ])
    sys.exit(exit_code)
















