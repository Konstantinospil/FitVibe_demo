import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

const STORAGE_ROOT = path.resolve(env.mediaStorageRoot);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function extensionFromMime(mime: string): string {
  if (mime === "image/png") {
    return ".png";
  }
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return ".jpg";
  }
  if (mime === "image/webp") {
    return ".webp";
  }
  return "";
}

function normalizeKey(...segments: string[]): string {
  return segments.join("/").replace(/\\/g, "/");
}

/**
 * Safely resolve a storage path, preventing path traversal attacks.
 * @param storageKey - The storage key to resolve
 * @returns The resolved absolute path
 * @throws Error if the resolved path escapes the storage root (path traversal attempt)
 */
function resolveStoragePath(storageKey: string): string {
  // Remove any path traversal attempts (../, ..\, etc.)
  const sanitized = storageKey.replace(/\.\./g, "").replace(/^[\\/]+/, "");

  const parts = sanitized.split(/[\\/]+/).filter((part) => {
    // Filter out empty parts, dots, and any remaining parent directory references
    return part && part !== "." && part !== ".." && part.length > 0;
  });

  const resolvedPath = path.join(STORAGE_ROOT, ...parts);

  // CRITICAL SECURITY CHECK: Ensure the resolved path is within STORAGE_ROOT
  // This prevents path traversal attacks (OWASP A01:2021 - Broken Access Control)
  const normalizedResolved = path.resolve(resolvedPath);
  const normalizedRoot = path.resolve(STORAGE_ROOT);

  if (!normalizedResolved.startsWith(normalizedRoot)) {
    throw new Error(`Path traversal attempt detected: ${storageKey}`);
  }

  return normalizedResolved;
}

export async function saveUserAvatarFile(userId: string, buffer: Buffer, mimeType: string) {
  const ext = extensionFromMime(mimeType) || ".bin";
  const dir = path.join(STORAGE_ROOT, "avatars", userId);
  await ensureDir(dir);
  const fileName = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, buffer);
  const storageKey = normalizeKey("avatars", userId, fileName);
  return {
    storageKey,
    bytes: buffer.length,
  };
}

export async function readStorageObject(storageKey: string): Promise<Buffer> {
  const fullPath = resolveStoragePath(storageKey);
  return fs.readFile(fullPath);
}

export async function deleteStorageObject(storageKey: string): Promise<void> {
  const fullPath = resolveStoragePath(storageKey);
  await fs.rm(fullPath, { force: true });
}
