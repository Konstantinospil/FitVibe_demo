#!/usr/bin/env node
/**
 * Script to add timeouts to waitFor calls that don't have them
 * This helps prevent tests from hanging indefinitely
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, "..");
const testsDir = resolve(frontendDir, "../../tests/frontend");

function findTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      findTestFiles(filePath, fileList);
    } else if (file.match(/\.test\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Pattern to match waitFor(() => { ... }) without timeout
const waitForWithoutTimeout = /await\s+waitFor\s*\(\s*\(\)\s*=>\s*\{/g;
const waitForWithTimeout = /await\s+waitFor\s*\([^)]*timeout/;

async function processFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  let modified = false;

  // Check if file has waitFor calls without timeouts
  const lines = content.split("\n");
  const modifiedLines = [];
  let inWaitFor = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts a waitFor without timeout
    if (waitForWithoutTimeout.test(line) && !waitForWithTimeout.test(line)) {
      // Check if this waitFor already has a timeout in the same line or nearby
      const nextFewLines = lines.slice(i, Math.min(i + 10, lines.length)).join("\n");
      if (!waitForWithTimeout.test(nextFewLines)) {
        inWaitFor = true;
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        modifiedLines.push(line);
        continue;
      }
    }

    if (inWaitFor) {
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      modifiedLines.push(line);

      // If we've closed all braces, this is the end of the waitFor callback
      if (braceCount === 0 && line.trim().endsWith("});")) {
        // Add timeout option
        const lastLine = modifiedLines[modifiedLines.length - 1];
        if (!lastLine.includes("timeout")) {
          modifiedLines[modifiedLines.length - 1] = lastLine.replace(
            /\}\);?\s*$/,
            "}, { timeout: 5000 });",
          );
          modified = true;
        }
        inWaitFor = false;
      }
    } else {
      modifiedLines.push(line);
    }
  }

  if (modified) {
    writeFileSync(filePath, modifiedLines.join("\n"), "utf-8");
    return true;
  }

  return false;
}

async function main() {
  const testFiles = findTestFiles(testsDir);

  console.log(`Found ${testFiles.length} test files`);
  console.log("Processing files to add timeouts to waitFor calls...\n");

  const modified = [];
  for (const file of testFiles) {
    try {
      if (await processFile(file)) {
        modified.push(file);
        console.log(`✓ Modified: ${file.replace(testsDir + "/", "")}`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\nModified ${modified.length} files`);
}

main().catch(console.error);

