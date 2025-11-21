# Utility Scripts

This directory contains utility scripts used for development, maintenance, and quality assurance tasks across the FitVibe monorepo.

## Scripts Overview

| Script                     | Purpose                                                  | Usage                                     |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `dependency-audit.sh`      | Audits dependencies for known vulnerabilities            | `./scripts/dependency-audit.sh`           |
| `gdpr-compliance-check.sh` | Validates GDPR compliance requirements                   | `./scripts/gdpr-compliance-check.sh`      |
| `generate_requirements.py` | Generates requirement documents from structured data     | `python scripts/generate_requirements.py` |
| `organize_requirements.py` | Organizes requirement documents by implementation status | `python scripts/organize_requirements.py` |
| `secrets-scan.sh`          | Scans the codebase for potential secrets and credentials | `./scripts/secrets-scan.sh`               |
| `security-scan.sh`         | Runs comprehensive security scans                        | `./scripts/security-scan.sh`              |

## Prerequisites

- **Shell scripts**: Bash (available on Unix-like systems or Git Bash on Windows)
- **Python scripts**: Python 3.8+ with required dependencies

## Usage

### Dependency Auditing

```bash
./scripts/dependency-audit.sh
```

Scans all workspaces for vulnerable dependencies and generates a report.

### GDPR Compliance Check

```bash
./scripts/gdpr-compliance-check.sh
```

Validates that the codebase meets GDPR requirements, including:

- Data minimization checks
- Privacy-by-default settings
- Data Subject Rights (DSR) implementation
- Data retention policies

### Requirements Management

#### Generate Requirements

```bash
python scripts/generate_requirements.py
```

Generates requirement documents from structured data sources (e.g., CSV, JSON).

#### Organize Requirements

```bash
python scripts/organize_requirements.py
```

Organizes requirement documents into `done/`, `progressing/`, and `open/` directories based on implementation status. See [`docs/1.Product_Requirements/Requirements/README.md`](../docs/1.Product_Requirements/Requirements/README.md) for details.

### Security Scanning

#### Secrets Scan

```bash
./scripts/secrets-scan.sh
```

Scans the repository for potential secrets, API keys, passwords, and other sensitive information. Results are saved to `security-reports/` directory.

#### Comprehensive Security Scan

```bash
./scripts/security-scan.sh
```

Runs multiple security checks including:

- Dependency vulnerability scanning
- Secrets detection
- Code security analysis
- Configuration security review

## Output Locations

- **Security reports**: `security-reports/` (created automatically)
- **Audit results**: Console output and log files
- **Requirement documents**: `docs/1.Product_Requirements/Requirements/`

## Integration with CI/CD

These scripts are designed to be run in CI/CD pipelines:

- `dependency-audit.sh` - Run on every PR
- `secrets-scan.sh` - Run on every commit
- `security-scan.sh` - Run on scheduled basis and before releases
- `gdpr-compliance-check.sh` - Run before releases

## Notes

- All scripts should be run from the repository root
- Some scripts require environment variables (check individual script headers)
- Security scan results should be reviewed before merging PRs
- Requirements organization should be run after significant feature implementations

## Contributing

When adding new utility scripts:

1. Place them in this directory
2. Make them executable (`chmod +x script.sh`)
3. Add documentation to this README
4. Include usage examples and prerequisites
5. Ensure scripts work on both Unix-like systems and Windows (via Git Bash)
