#!/usr/bin/env node
/**
 * Agent Audit Logger
 * Logs agent operations for security auditing
 * 
 * Usage:
 *   node .cursor/scripts/agent_audit_logger.mjs --agent <agent_id> --operation <operation> --file <file_path> --result <success|failure>
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../..');
const AUDIT_LOG_DIR = resolve(ROOT_DIR, '.cursor/logs');
const AUDIT_LOG_FILE = resolve(AUDIT_LOG_DIR, 'agent_operations.log');

/**
 * Ensure audit log directory exists
 */
function ensureLogDirectory() {
  if (!existsSync(AUDIT_LOG_DIR)) {
    mkdirSync(AUDIT_LOG_DIR, { recursive: true });
  }
}

/**
 * Log agent operation
 */
function logOperation(agentId, operation, filePath = null, result = 'success', details = {}) {
  ensureLogDirectory();
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    agent_id: agentId,
    operation,
    file_path: filePath,
    result,
    details,
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  appendFileSync(AUDIT_LOG_FILE, logLine, 'utf-8');
  
  return logEntry;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const agentIndex = args.indexOf('--agent');
  const operationIndex = args.indexOf('--operation');
  const fileIndex = args.indexOf('--file');
  const resultIndex = args.indexOf('--result');
  
  if (agentIndex === -1 || operationIndex === -1) {
    console.error('Usage: node agent_audit_logger.mjs --agent <agent_id> --operation <operation> [--file <file_path>] [--result <success|failure>]');
    process.exit(1);
  }
  
  const agentId = args[agentIndex + 1];
  const operation = args[operationIndex + 1];
  const filePath = fileIndex !== -1 ? args[fileIndex + 1] : null;
  const result = resultIndex !== -1 ? args[resultIndex + 1] : 'success';
  
  const logEntry = logOperation(agentId, operation, filePath, result);
  console.log(`📝 Logged: ${JSON.stringify(logEntry, null, 2)}`);
}

export { logOperation, AUDIT_LOG_FILE };


















