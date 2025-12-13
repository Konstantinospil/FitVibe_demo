"""
Configuration Loader - Loads and validates configuration files.

This module provides configuration loading with environment variable overrides,
validation, and multi-environment support.

Version: 1.0
Last Updated: 2025-01-21
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path


class ConfigLoader:
    """Loads and manages configuration with environment variable overrides."""
    
    def __init__(self, config_dir: str = ".cursor/config"):
        self.config_dir = Path(config_dir)
        self.config: Dict[str, Any] = {}
        self._load_config()
    
    def _load_config(self):
        """Loads configuration files in order of precedence."""
        # Start with default config
        default_file = self.config_dir / "default.json"
        if default_file.exists():
            with open(default_file, 'r') as f:
                self.config = json.load(f)
        else:
            # Default config is optional, only log at debug level
            logging.debug(f"Default config file not found (optional): {default_file}")
            self.config = {}
        
        # Load environment-specific config
        env = os.environ.get("ENV", "development")
        env_file = self.config_dir / f"{env}.json"
        if env_file.exists():
            with open(env_file, 'r') as f:
                env_config = json.load(f)
                self._merge_config(self.config, env_config)
        
        # Apply environment variable overrides
        self._apply_env_overrides()
    
    def _merge_config(self, base: Dict[str, Any], override: Dict[str, Any]):
        """Recursively merges override config into base config."""
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._merge_config(base[key], value)
            else:
                base[key] = value
    
    def _apply_env_overrides(self):
        """Applies environment variable overrides using dot notation."""
        for key, value in os.environ.items():
            if key.startswith("CURSOR_"):
                # Remove CURSOR_ prefix and convert to config path
                config_path = key[7:].lower().split("_")
                self._set_nested_value(self.config, config_path, self._parse_env_value(value))
    
    def _set_nested_value(self, config: Dict[str, Any], path: List[str], value: Any):
        """Sets a nested value in config using path list."""
        current = config
        for key in path[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[path[-1]] = value
    
    def _parse_env_value(self, value: str) -> Any:
        """Parses environment variable value to appropriate type."""
        # Try to parse as JSON first
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            pass
        
        # Try boolean
        if value.lower() in ("true", "false"):
            return value.lower() == "true"
        
        # Try number
        try:
            if "." in value:
                return float(value)
            return int(value)
        except ValueError:
            pass
        
        # Return as string
        return value
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Gets a configuration value using dot notation.
        
        Example:
            config.get("model_router.routing_rules.trivial.model")
        """
        keys = key.split(".")
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def get_section(self, section: str) -> Dict[str, Any]:
        """Gets an entire configuration section."""
        return self.config.get(section, {})


# Global instance
config_loader = ConfigLoader()

