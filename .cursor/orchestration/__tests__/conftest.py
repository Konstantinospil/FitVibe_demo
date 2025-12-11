"""
Pytest configuration for orchestration tests.
"""

import sys
from pathlib import Path

# Add .cursor to path for imports
cursor_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(cursor_path))
















