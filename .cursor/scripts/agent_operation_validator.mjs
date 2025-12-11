#!/usr/bin/env node
/**
 * Agent Operation Validator
 * Validates agent operations against security standards at runtime
 * 
 * Usage:
 *   node .cursor/scripts/agent_operation_validator.mjs --agent <agent_id> --operation <operation> --file <file_path>
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../..');

// Agent security restrictions (from SECURITY_STANDARDS.md)
const AGENT_RESTRICTIONS = {
  'planner-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'webfetch', 'todowrite', 'askuser'],
    restrictedOperations: ['write', 'edit', 'git', 'commit'],
    allowedPaths: ['**/docs/**', '**/.cursor/**', '**/PROJECT_*.md', '**/ISSUE_*.md'],
    restrictedPaths: ['**/apps/**/*.ts', '**/apps/**/*.tsx', '**/.env*', '**/*.pem', '**/*.key'],
  },
  'requirements-analyst-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'webfetch', 'todowrite', 'write', 'askuser'],
    restrictedOperations: ['edit', 'git', 'commit'],
    allowedPaths: ['**/docs/**', '**/.cursor/**'],
    restrictedPaths: ['**/apps/**/*.ts', '**/apps/**/*.tsx', '**/.env*'],
  },
  'backend-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'edit', 'write', 'bash', 'todowrite'],
    restrictedOperations: ['git', 'commit', 'push'],
    allowedPaths: ['**/apps/backend/**', '**/apps/backend/src/**'],
    restrictedPaths: ['**/.env*', '**/*.pem', '**/*.key', '**/apps/frontend/**'],
  },
  'senior-frontend-developer': {
    allowedOperations: ['read', 'grep', 'glob', 'edit', 'write', 'bash', 'todowrite'],
    restrictedOperations: ['git', 'commit', 'push'],
    allowedPaths: ['**/apps/frontend/**', '**/apps/frontend/src/**'],
    restrictedPaths: ['**/.env*', '**/*.pem', '**/*.key', '**/apps/backend/**'],
  },
  'fullstack-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'edit', 'write', 'bash', 'todowrite'],
    restrictedOperations: ['git', 'commit', 'push'],
    allowedPaths: ['**/apps/**', '**/apps/**/src/**'],
    restrictedPaths: ['**/.env*', '**/*.pem', '**/*.key'],
  },
  'test-manager': {
    allowedOperations: ['read', 'grep', 'glob', 'edit', 'write', 'bash', 'todowrite'],
    restrictedOperations: ['git', 'commit', 'push'],
    allowedPaths: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**', '**/tests/**'],
    restrictedPaths: ['**/.env*', '**/*.pem', '**/*.key'],
  },
  'code-review-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'webfetch', 'todowrite', 'bash'],
    restrictedOperations: ['write', 'edit', 'git', 'commit'],
    allowedPaths: ['**'],
    restrictedPaths: [], // Read-only, can read everything but cannot modify
    readOnly: true,
  },
  'security-review-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'webfetch', 'todowrite', 'bash'],
    restrictedOperations: ['write', 'edit', 'git', 'commit'],
    allowedPaths: ['**'],
    restrictedPaths: [],
    readOnly: true,
  },
  'api-contract-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'todowrite', 'bash'],
    restrictedOperations: ['write', 'edit', 'git', 'commit'],
    allowedPaths: ['**'],
    restrictedPaths: [],
    readOnly: true,
  },
  'documentation-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'webfetch', 'edit', 'write', 'todowrite'],
    restrictedOperations: ['git', 'commit', 'push'],
    allowedPaths: ['**/docs/**', '**/*.md', '**/README.md'],
    restrictedPaths: ['**/apps/**/*.ts', '**/apps/**/*.tsx', '**/.env*'],
  },
  'version-controller': {
    allowedOperations: ['read', 'grep', 'glob', 'edit', 'write', 'bash', 'todowrite', 'git', 'commit', 'push'],
    restrictedOperations: [],
    allowedPaths: ['**'],
    restrictedPaths: ['**/.env*'], // Can read but must scan before commit
    canCommit: true,
  },
  'agent-quality-agent': {
    allowedOperations: ['read', 'grep', 'glob', 'edit', 'write', 'todowrite'],
    restrictedOperations: ['git', 'commit', 'push', 'bash'],
    allowedPaths: ['**/.cursor/agents/**'],
    restrictedPaths: ['**/apps/**', '**/.env*'],
  },
};

/**
 * Check if a file path matches a glob pattern
 */
function matchesPattern(filePath, pattern) {
  // Simple glob matching - convert ** to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Check if file path is in allowed paths
 */
function isPathAllowed(filePath, allowedPaths) {
  if (allowedPaths.length === 0 || allowedPaths.includes('**')) {
    return true;
  }
  return allowedPaths.some(pattern => matchesPattern(filePath, pattern));
}

/**
 * Check if file path is in restricted paths
 */
function isPathRestricted(filePath, restrictedPaths) {
  return restrictedPaths.some(pattern => matchesPattern(filePath, pattern));
}

/**
 * Validate agent operation
 */
function validateOperation(agentId, operation, filePath = null) {
  const restrictions = AGENT_RESTRICTIONS[agentId];
  
  if (!restrictions) {
    return {
      valid: false,
      error: `Agent ${agentId} not found in security restrictions`,
    };
  }
  
  // Check if operation is restricted
  if (restrictions.restrictedOperations.includes(operation.toLowerCase())) {
    return {
      valid: false,
      error: `Operation '${operation}' is restricted for ${agentId} according to security standards`,
    };
  }
  
  // Check if operation is allowed
  if (!restrictions.allowedOperations.includes(operation.toLowerCase()) && 
      !restrictions.allowedOperations.includes('*')) {
    return {
      valid: false,
      error: `Operation '${operation}' is not in allowed operations for ${agentId}`,
    };
  }
  
  // Check file path restrictions if provided
  if (filePath) {
    const relativePath = relative(ROOT_DIR, resolve(ROOT_DIR, filePath));
    
    // Check restricted paths first (more specific)
    if (isPathRestricted(relativePath, restrictions.restrictedPaths)) {
      return {
        valid: false,
        error: `File path '${relativePath}' is restricted for ${agentId}`,
      };
    }
    
    // Check if path is allowed (if restrictions are defined)
    if (restrictions.allowedPaths.length > 0 && 
        !restrictions.allowedPaths.includes('**') &&
        !isPathAllowed(relativePath, restrictions.allowedPaths)) {
      return {
        valid: false,
        error: `File path '${relativePath}' is not in allowed paths for ${agentId}`,
      };
    }
    
    // Check for secrets in restricted file types
    if (relativePath.match(/\.(env|pem|key|p12|pfx)$/i)) {
      return {
        valid: false,
        error: `Access to secrets file '${relativePath}' is prohibited`,
      };
    }
  }
  
  // Check read-only restriction
  if (restrictions.readOnly && ['write', 'edit', 'commit'].includes(operation.toLowerCase())) {
    return {
      valid: false,
      error: `${agentId} is read-only and cannot perform '${operation}' operation`,
    };
  }
  
  return { valid: true };
}

/**
 * Scan file for secrets
 */
function scanForSecrets(filePath) {
  if (!existsSync(filePath)) {
    return { hasSecrets: false };
  }
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Simple secret patterns (basic check)
  const secretPatterns = [
    /password\s*[:=]\s*['"]([^'"]+)['"]/i,
    /api[_-]?key\s*[:=]\s*['"]([^'"]+)['"]/i,
    /secret\s*[:=]\s*['"]([^'"]+)['"]/i,
    /token\s*[:=]\s*['"]([^'"]+)['"]/i,
    /-----BEGIN (RSA )?PRIVATE KEY-----/,
    /-----BEGIN CERTIFICATE-----/,
  ];
  
  const matches = [];
  for (const pattern of secretPatterns) {
    const match = content.match(pattern);
    if (match) {
      matches.push(pattern.toString());
    }
  }
  
  return {
    hasSecrets: matches.length > 0,
    matches,
  };
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const agentIndex = args.indexOf('--agent');
  const operationIndex = args.indexOf('--operation');
  const fileIndex = args.indexOf('--file');
  const scanIndex = args.indexOf('--scan');
  
  if (agentIndex === -1 || operationIndex === -1) {
    console.error('Usage: node agent_operation_validator.mjs --agent <agent_id> --operation <operation> [--file <file_path>] [--scan]');
    process.exit(1);
  }
  
  const agentId = args[agentIndex + 1];
  const operation = args[operationIndex + 1];
  const filePath = fileIndex !== -1 ? args[fileIndex + 1] : null;
  const shouldScan = scanIndex !== -1;
  
  // Validate operation
  const result = validateOperation(agentId, operation, filePath);
  
  if (!result.valid) {
    console.error(`❌ Validation failed: ${result.error}`);
    process.exit(1);
  }
  
  // Scan for secrets if requested
  if (shouldScan && filePath) {
    const scanResult = scanForSecrets(filePath);
    if (scanResult.hasSecrets) {
      console.error(`❌ Secrets detected in file: ${filePath}`);
      console.error(`   Patterns found: ${scanResult.matches.join(', ')}`);
      process.exit(1);
    }
  }
  
  console.log(`✅ Operation validated: ${agentId} can perform '${operation}'${filePath ? ` on '${filePath}'` : ''}`);
}

export { validateOperation, scanForSecrets, AGENT_RESTRICTIONS };


















