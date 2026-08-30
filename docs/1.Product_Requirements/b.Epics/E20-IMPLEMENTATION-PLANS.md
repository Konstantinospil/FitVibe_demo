# E20 Database Encryption - Implementation Plans

**Date**: 2025-12-21  
**Epic**: [E20: Database Encryption](./E20-database-encryption.md)  
**Status**: Implementation Plans for Immediate Actions

---

## Overview

This document provides detailed implementation plans for the 4 immediate actions identified in the [E20 Verification Report](./E20-VERIFICATION-REPORT.md) that must be completed before production deployment.

---

## 1. Performance Benchmarks

### Status: ⚠️ Not Yet Implemented

### Objective

Measure database query performance with encryption enabled to verify ≤5% overhead as specified in NFR-008 and US-20.2-AC03.

### Current State

- Performance testing framework exists (k6, performance baselines)
- No encryption-specific benchmarks exist
- No baseline measurements for encrypted vs unencrypted storage

### Implementation Plan

#### Step 1: Create Benchmark Script

**File**: `tests/backend/db/encryption-performance-benchmark.ts`

```typescript
import { performance } from "node:perf_hooks";
import { db } from "../../../apps/backend/src/db/index.js";
import { logger } from "../../../apps/backend/src/config/logger.js";

interface BenchmarkResult {
  query: string;
  iterations: number;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

async function benchmarkQuery(query: string, iterations: number = 1000): Promise<BenchmarkResult> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await db.raw(query);
    const end = performance.now();
    latencies.push(end - start);
  }

  latencies.sort((a, b) => a - b);

  return {
    query,
    iterations,
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
    p99: latencies[Math.floor(latencies.length * 0.99)],
    min: latencies[0],
    max: latencies[latencies.length - 1],
  };
}

export async function runEncryptionBenchmark(): Promise<void> {
  const queries = [
    "SELECT 1",
    "SELECT * FROM users LIMIT 100",
    "SELECT * FROM sessions WHERE user_id = 'test' LIMIT 50",
    "SELECT COUNT(*) FROM sessions",
    "SELECT * FROM exercises WHERE name LIKE '%test%' LIMIT 20",
  ];

  logger.info("Starting encryption performance benchmark...");

  const results: BenchmarkResult[] = [];

  for (const query of queries) {
    const result = await benchmarkQuery(query, 1000);
    results.push(result);
    logger.info(
      {
        query: result.query,
        avgLatency: `${result.avgLatency.toFixed(2)}ms`,
        p95: `${result.p95.toFixed(2)}ms`,
        p99: `${result.p99.toFixed(2)}ms`,
      },
      "Query benchmark completed",
    );
  }

  // Calculate overhead
  // Note: This requires baseline measurements from unencrypted storage
  // For now, we'll just report the metrics
  logger.info({ results }, "Encryption benchmark completed");

  return results;
}
```

#### Step 2: Create Baseline Measurement Script

**File**: `scripts/measure-baseline-performance.sh`

```bash
#!/bin/bash
# Measure baseline performance (before encryption)
# Run this before enabling encryption to establish baseline

set -euo pipefail

echo "Measuring baseline database performance..."
pnpm --filter @fitvibe/backend test tests/backend/db/encryption-performance-benchmark.ts > baseline-results.json

echo "Baseline measurements saved to baseline-results.json"
```

#### Step 3: Create Comparison Script

**File**: `scripts/compare-encryption-performance.sh`

```bash
#!/bin/bash
# Compare encrypted vs unencrypted performance

set -euo pipefail

BASELINE_FILE="${1:-baseline-results.json}"
CURRENT_FILE="${2:-current-results.json}"

echo "Comparing baseline vs encrypted performance..."

# Use jq or similar to calculate overhead percentage
# Alert if overhead > 5%
```

#### Step 4: Add to CI/CD

**File**: `.github/workflows/performance-benchmark.yml`

```yaml
name: Encryption Performance Benchmark

on:
  schedule:
    - cron: "0 2 * * 0" # Weekly on Sunday
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: pnpm install
      - run: pnpm --filter @fitvibe/backend test tests/backend/db/encryption-performance-benchmark.ts
      - name: Check overhead
        run: |
          # Compare against baseline
          # Fail if overhead > 5%
```

### Acceptance Criteria

- [ ] Benchmark script created and tested
- [ ] Baseline measurements documented
- [ ] Encrypted performance measured
- [ ] Overhead calculated and documented (must be ≤5%)
- [ ] CI/CD integration added
- [ ] Results documented in performance dashboard

### Estimated Effort

- **Time**: 4-6 hours
- **Priority**: High (blocks production deployment)

---

## 2. Backup Encryption

### Status: ⚠️ Partially Implemented

### Current State

- ✅ Shell script (`backup-database.sh`) uses GPG encryption
- ❌ TypeScript script (`backupDatabase.ts`) does NOT encrypt
- ❌ No AES-256 encryption option (GPG uses different algorithm)

### Implementation Plan

#### Step 1: Update TypeScript Backup Script

**File**: `apps/backend/src/db/utils/backupDatabase.ts`

```typescript
import { spawnSync } from "child_process";
import { createCipheriv, randomBytes, createHash } from "crypto";
import { createWriteStream, readFileSync } from "fs";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";
import { logger } from "../../config/logger.js";
import { DB_CONFIG } from "../db.config.js";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = `backup_${DB_CONFIG.database}_${timestamp}.sql`;

/**
 * Create encrypted database backup using AES-256-GCM
 * @param encryptionKey - 32-byte key (hex string or Buffer)
 * @returns Path to encrypted backup file
 */
export async function createEncryptedBackup(encryptionKey?: string): Promise<string> {
  const key = encryptionKey
    ? Buffer.from(encryptionKey, "hex")
    : process.env.BACKUP_ENCRYPTION_KEY
      ? Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, "hex")
      : null;

  if (!key || key.length !== 32) {
    throw new Error(
      "Backup encryption key required (32 bytes, hex encoded). Set BACKUP_ENCRYPTION_KEY environment variable.",
    );
  }

  logger.info(`Creating encrypted database backup: ${file}`);

  // Generate IV
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  // Create pg_dump process
  const pgDump = spawnSync(
    "pg_dump",
    [
      `--host=${DB_CONFIG.host}`,
      `--port=${DB_CONFIG.port}`,
      `--username=${DB_CONFIG.user}`,
      "--no-password",
      "--format=p",
      DB_CONFIG.database,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  if (pgDump.status !== 0) {
    logger.error({ error: pgDump.stderr?.toString() }, "Backup failed");
    throw new Error("pg_dump failed");
  }

  const encryptedFile = `${file}.enc`;
  const ivFile = `${file}.iv`;
  const checksumFile = `${file}.sha256`;

  // Pipe: pg_dump -> gzip -> encrypt -> file
  await pipeline(pgDump.stdout!, createGzip(), cipher, createWriteStream(encryptedFile));

  // Save IV (required for decryption)
  await writeFile(ivFile, iv);

  // Generate checksum
  const backupData = readFileSync(encryptedFile);
  const checksum = createHash("sha256").update(backupData).digest("hex");
  await writeFile(checksumFile, checksum);

  logger.info(
    {
      backupFile: encryptedFile,
      ivFile,
      checksumFile,
      checksum,
    },
    "Encrypted backup created successfully",
  );

  return encryptedFile;
}

/**
 * Restore encrypted backup
 */
export async function restoreEncryptedBackup(
  encryptedFile: string,
  ivFile: string,
  encryptionKey?: string,
): Promise<void> {
  // Implementation for restore
  // Similar to createEncryptedBackup but in reverse
}
```

#### Step 2: Update Shell Script to Support AES-256

**File**: `infra/scripts/backup-database.sh`

Add option for AES-256 encryption:

```bash
# Add AES-256 option
if [ "${ENCRYPTION_METHOD:-gpg}" = "aes256" ]; then
    # Use OpenSSL AES-256-GCM
    ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
    if [ -z "$ENCRYPTION_KEY" ]; then
        error "BACKUP_ENCRYPTION_KEY required for AES-256 encryption"
        exit 1
    fi

    IV=$(openssl rand -hex 16)
    echo "$IV" > "${BACKUP_FILE}.iv"

    openssl enc -aes-256-gcm -salt -pbkdf2 \
        -in "$BACKUP_FILE" \
        -out "$ENCRYPTED_FILE" \
        -K "$ENCRYPTION_KEY" \
        -iv "$IV"
else
    # Use GPG (existing method)
    gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$ENCRYPTED_FILE" "$BACKUP_FILE"
fi
```

#### Step 3: Add Environment Variable Documentation

**File**: `docs/LOCAL_DEVELOPMENT.md` (update existing section)

Add:

```markdown
### Backup Encryption

- `BACKUP_ENCRYPTION_KEY`: 32-byte hex-encoded key for AES-256-GCM encryption
- Generate key: `openssl rand -hex 32`
- Store securely (Vault, Secrets Manager)
```

#### Step 4: Create Restore Script

**File**: `infra/scripts/restore-encrypted-backup.sh`

```bash
#!/bin/bash
# Restore encrypted backup

set -euo pipefail

ENCRYPTED_FILE="${1}"
IV_FILE="${ENCRYPTED_FILE%.enc}.iv"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "ERROR: BACKUP_ENCRYPTION_KEY required"
    exit 1
fi

IV=$(cat "$IV_FILE")
DECRYPTED_FILE="${ENCRYPTED_FILE%.enc}"

# Decrypt
openssl enc -d -aes-256-gcm -pbkdf2 \
    -in "$ENCRYPTED_FILE" \
    -out "$DECRYPTED_FILE" \
    -K "$ENCRYPTION_KEY" \
    -iv "$IV"

# Restore
psql < "$DECRYPTED_FILE"

# Cleanup
rm -f "$DECRYPTED_FILE"
```

### Acceptance Criteria

- [ ] TypeScript backup script supports AES-256-GCM encryption
- [ ] Shell script supports both GPG and AES-256 options
- [ ] Restore script created and tested
- [ ] Environment variable documentation updated
- [ ] Tests verify encryption/decryption works
- [ ] Backup integrity verified (checksums)

### Estimated Effort

- **Time**: 6-8 hours
- **Priority**: High (blocks production deployment)

---

## 3. Security Audit

### Status: ⚠️ Not Yet Conducted

### Objective

Conduct security audit to verify encryption configuration meets requirements and best practices.

### Implementation Plan

#### Step 1: Create Security Audit Checklist

**File**: `docs/security/E20-ENCRYPTION-AUDIT-CHECKLIST.md`

```markdown
# E20 Database Encryption Security Audit Checklist

## Encryption in Transit

- [ ] TLS 1.3 (minimum TLS 1.2) configured
- [ ] Certificate verification enabled in production (`rejectUnauthorized: true`)
- [ ] CA certificates properly configured
- [ ] Client certificates configured (if using mutual TLS)
- [ ] SSL connection failures logged
- [ ] SSL connection monitoring configured
- [ ] Certificate expiration monitoring configured

## Encryption at Rest

- [ ] Encrypted storage volumes configured (Kubernetes)
- [ ] Encrypted EBS/disk volumes configured (cloud provider)
- [ ] Storage class encryption verified
- [ ] Backup encryption implemented (AES-256)
- [ ] Backup encryption verified via restore test

## Key Management

- [ ] Encryption keys stored securely (Vault, Secrets Manager)
- [ ] Key rotation procedures documented
- [ ] Key rotation schedule defined (6 months per policy)
- [ ] Key access logging enabled
- [ ] Two-person rule enforced for key operations

## Configuration Verification

- [ ] Environment variables properly configured
- [ ] SSL configuration tested in all environments
- [ ] Production SSL strict mode verified
- [ ] Development relaxed SSL verified
- [ ] Error handling tested

## Performance

- [ ] Performance benchmarks completed
- [ ] Overhead ≤5% verified
- [ ] Performance monitoring configured
- [ ] Alerts configured for performance degradation

## Documentation

- [ ] Setup guides complete
- [ ] Troubleshooting guides complete
- [ ] Key rotation procedures documented
- [ ] Incident response procedures documented
```

#### Step 2: Create Audit Script

**File**: `scripts/audit-encryption-config.sh`

```bash
#!/bin/bash
# Automated encryption configuration audit

set -euo pipefail

echo "=== Database Encryption Configuration Audit ==="
echo ""

# Check SSL configuration
echo "1. SSL Configuration:"
if [ "${PGSSL:-}" = "true" ]; then
    echo "   ✅ SSL enabled"
else
    echo "   ⚠️  SSL not enabled (PGSSL not set to 'true')"
fi

if [ "${NODE_ENV:-}" = "production" ]; then
    if [ "${PGSSL:-}" != "true" ]; then
        echo "   ❌ ERROR: SSL required in production"
        exit 1
    fi
    echo "   ✅ Production environment detected"
fi

# Check certificate paths
if [ -n "${PGSSL_CA:-}" ]; then
    if [ -f "$PGSSL_CA" ]; then
        echo "   ✅ CA certificate found: $PGSSL_CA"
    else
        echo "   ❌ CA certificate not found: $PGSSL_CA"
    fi
fi

# Check backup encryption
echo ""
echo "2. Backup Encryption:"
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    KEY_LENGTH=${#BACKUP_ENCRYPTION_KEY}
    if [ $KEY_LENGTH -eq 64 ]; then  # 32 bytes = 64 hex chars
        echo "   ✅ Backup encryption key configured (32 bytes)"
    else
        echo "   ❌ Backup encryption key invalid length (expected 64 hex chars)"
    fi
else
    echo "   ⚠️  Backup encryption key not configured"
fi

# Check Kubernetes storage class
echo ""
echo "3. Kubernetes Storage:"
if kubectl get storageclass encrypted-ssd &>/dev/null; then
    echo "   ✅ Encrypted storage class exists"
else
    echo "   ⚠️  Encrypted storage class not found"
fi

echo ""
echo "=== Audit Complete ==="
```

#### Step 3: Schedule Security Review

- **Frequency**: Quarterly
- **Owner**: Security Team
- **Process**: Use checklist + automated script + manual review

### Acceptance Criteria

- [ ] Security audit checklist created
- [ ] Automated audit script created
- [ ] Initial security audit conducted
- [ ] All checklist items verified
- [ ] Audit report generated
- [ ] Remediation plan for any findings

### Estimated Effort

- **Time**: 8-12 hours (initial audit)
- **Priority**: High (blocks production deployment)

---

## 4. Key Rotation

### Status: ⚠️ Not Yet Implemented

### Current State

- ✅ KEY_MANAGEMENT_POLICY.md defines rotation schedule (6 months for DB encryption keys)
- ✅ JWT key rotation runbook exists
- ❌ Database encryption key rotation runbook does NOT exist
- ❌ Database encryption key rotation script does NOT exist

### Implementation Plan

#### Step 1: Create Database Encryption Key Rotation Runbook

**File**: `docs/5.Policies/5.a.Ops/DATABASE_ENCRYPTION_KEY_ROTATION_RUNBOOK.md`

````markdown
# Database Encryption Key Rotation Runbook

**Version:** 1.0  
**Last Updated:** 2025-12-21  
**Owner:** Security & DevOps Team  
**Frequency:** Every 6 months (per KEY_MANAGEMENT_POLICY.md)

## Overview

This runbook provides step-by-step procedures for rotating database encryption keys (AES-256) used for:

- Database volume encryption (at rest)
- Backup encryption

## Pre-Rotation Checklist

- [ ] Schedule rotation during maintenance window
- [ ] Notify team 48 hours in advance
- [ ] Backup current database
- [ ] Verify restore procedure works
- [ ] Document current key age

## Rotation Procedure

### Phase 1: Generate New Key

1. Generate new AES-256 key:
   ```bash
   openssl rand -hex 32 > new_db_encryption_key.hex
   ```
````

2. Store in secrets manager:

   ```bash
   # Vault
   vault kv put secret/fitvibe/production/db-encryption-key \
     key=$(cat new_db_encryption_key.hex) \
     created=$(date +%Y-%m-%d)

   # AWS Secrets Manager
   aws secretsmanager create-secret \
     --name fitvibe/production/db-encryption-key-new \
     --secret-string $(cat new_db_encryption_key.hex)
   ```

### Phase 2: Re-encrypt Data

**Note**: For volume encryption, this typically requires:

- Creating new encrypted volume
- Migrating data to new volume
- Updating storage class configuration

**For Backup Encryption**:

- Update BACKUP_ENCRYPTION_KEY environment variable
- Old backups remain encrypted with old key (document key mapping)
- New backups use new key

### Phase 3: Update Configuration

1. Update environment variables
2. Update Kubernetes secrets
3. Restart services
4. Verify encryption works

### Phase 4: Archive Old Key

1. Archive old key (encrypted) in secure location
2. Document key mapping (which backups use which key)
3. Update key rotation log

## Verification

- [ ] New key in use
- [ ] Database accessible
- [ ] Backups working with new key
- [ ] Old key archived
- [ ] Documentation updated

## Rollback Procedure

If issues occur:

1. Revert to old key
2. Investigate issue
3. Reschedule rotation

````

#### Step 2: Create Key Rotation Script
**File**: `infra/scripts/rotate-db-encryption-key.sh`

```bash
#!/bin/bash
# Rotate database encryption key

set -euo pipefail

ENVIRONMENT="${1:-production}"
NEW_KEY=$(openssl rand -hex 32)

echo "Generating new database encryption key for $ENVIRONMENT..."
echo "New key: $NEW_KEY"

# Store in secrets manager
# (Implementation depends on secrets manager)

# Update Kubernetes secret
kubectl create secret generic db-encryption-key \
  --from-literal=key="$NEW_KEY" \
  --namespace="$ENVIRONMENT" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Key rotation initiated. Follow runbook for data re-encryption."
````

#### Step 3: Update KEY_MANAGEMENT_POLICY.md

Add reference to database encryption key rotation runbook.

### Acceptance Criteria

- [ ] Database encryption key rotation runbook created
- [ ] Key rotation script created
- [ ] Key rotation tested in staging
- [ ] Documentation updated
- [ ] Key rotation schedule defined
- [ ] Monitoring/alerting for key age configured

### Estimated Effort

- **Time**: 8-10 hours
- **Priority**: High (required before production)

---

## Summary

### Implementation Priority

| Action                 | Status         | Effort | Priority | Blocking |
| ---------------------- | -------------- | ------ | -------- | -------- |
| Performance Benchmarks | ⚠️ Not Started | 4-6h   | High     | Yes      |
| Backup Encryption      | ⚠️ Partial     | 6-8h   | High     | Yes      |
| Security Audit         | ⚠️ Not Started | 8-12h  | High     | Yes      |
| Key Rotation           | ⚠️ Not Started | 8-10h  | High     | Yes      |

### Total Estimated Effort

- **Time**: 26-36 hours
- **Timeline**: 1-2 weeks (depending on team availability)

### Next Steps

1. **Week 1**:
   - Implement backup encryption (TypeScript script)
   - Create performance benchmark script
   - Run initial benchmarks

2. **Week 2**:
   - Create key rotation runbook and script
   - Conduct security audit
   - Document findings and remediation

3. **Before Production**:
   - All 4 actions completed
   - Security audit passed
   - Performance verified (≤5% overhead)
   - Key rotation tested in staging

---

**Document Created**: 2025-12-21  
**Owner**: DevOps & Security Team  
**Next Review**: After implementation completion
