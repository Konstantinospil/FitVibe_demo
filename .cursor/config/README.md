# Configuration Files

**Version**: 1.0  
**Last Updated**: 2025-01-21

---

## Overview

This directory contains configuration files for the FitVibe multi-agent system. Configuration files are loaded in order of precedence:

1. `default.json` - Base configuration (always loaded)
2. `development.json` - Development overrides (if exists)
3. `staging.json` - Staging overrides (if exists)
4. `production.json` - Production overrides (if exists)
5. Environment variables - Highest precedence

---

## Configuration Files

### default.json

Base configuration with all default values. This file should contain sensible defaults for all configuration options.

### development.json (Optional)

Development-specific overrides. Example:
```json
{
  "model_router": {
    "cost_optimization": {
      "enabled": false
    }
  },
  "quota_limits": {
    "tokens_per_day": 1000000
  }
}
```

### staging.json (Optional)

Staging-specific overrides.

### production.json (Optional)

Production-specific overrides.

---

## Environment Variables

All configuration values can be overridden via environment variables using dot notation:

- `MODEL_ROUTER.COST_OPTIMIZATION.ENABLED=false`
- `QUOTA_LIMITS.TOKENS_PER_DAY=500000`

---

## Configuration Schema

See individual configuration files for schema documentation.

---

**Last Updated**: 2025-01-21
















