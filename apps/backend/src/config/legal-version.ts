/**
 * Legal document version calculation
 *
 * Calculates the version of legal documents (terms, privacy, cookie) by finding
 * the latest created_at timestamp across all translations in a namespace.
 *
 * This ensures that when ANY language version is updated, ALL languages are
 * considered changed, so users don't need to re-accept based on which language
 * they originally accepted in.
 */

import { statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger.js";
import { db } from "../db/connection.js";
import type { SupportedLanguage } from "../modules/translations/translations.types.js";

type LegalNamespace = "terms" | "privacy" | "cookie";

// Resolve path relative to this file's location, then go up to workspace root
// Handle both CommonJS (Jest) and ES module environments
// In Jest test environment, __filename is available as a local variable in CommonJS modules
// In ES module runtime, we use import.meta.url

// Helper to safely access __filename and __dirname in CommonJS/Jest environment
// Using eval to avoid declaration conflicts
const getCommonJSFilename = (): string | undefined => {
  try {
    return eval('typeof __filename !== "undefined" ? __filename : undefined') as string | undefined;
  } catch {
    return undefined;
  }
};

const getCommonJSDirname = (): string | undefined => {
  try {
    return eval('typeof __dirname !== "undefined" ? __dirname : undefined') as string | undefined;
  } catch {
    return undefined;
  }
};

// Determine file path based on environment
// Since TypeScript compiles to CommonJS, __dirname and __filename should always be available
// Check CommonJS variables first, fallback to import.meta.url only if not available
const commonJSFilename = getCommonJSFilename();
const commonJSDirname = getCommonJSDirname();

let currentFilename: string;
let currentDirname: string;

if (typeof commonJSFilename !== "undefined" && typeof commonJSDirname !== "undefined") {
  // CommonJS environment (Jest tests, tsx dev, compiled code) - use local variables
  currentFilename = commonJSFilename;
  currentDirname = commonJSDirname;
} else {
  // ES module environment - use dynamic evaluation to avoid compilation issues
  // This string-based approach prevents ts-jest from trying to compile import.meta
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const getImportMeta = new Function("return import.meta.url");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const metaUrl = getImportMeta();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    currentFilename = fileURLToPath(metaUrl);
    currentDirname = dirname(currentFilename);
  } catch {
    // Fallback if dynamic evaluation fails
    throw new Error("Unable to determine file path: import.meta.url is not available");
  }
}
// Go from apps/backend/src/config to workspace root
const WORKSPACE_ROOT = resolve(currentDirname, "..", "..", "..", "..");
const TRANSLATIONS_BASE_PATH = join(WORKSPACE_ROOT, "apps", "frontend", "src", "i18n", "locales");

// Cache for calculated versions to avoid reading files on every call
// Cache is invalidated on server restart, which is acceptable since versions change infrequently
const versionCache = new Map<LegalNamespace, { version: string; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

/**
 * Format a date as YYYY-MM-DD for version string
 */
function formatVersionDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the latest created_at timestamp from the translations database table
 */
async function getLatestCreatedAtFromDatabase(namespace: LegalNamespace): Promise<Date | null> {
  try {
    const result = (await db("translations")
      .where({ namespace })
      .whereNull("deleted_at")
      .max("created_at as latest")
      .first()) as { latest?: string | Date } | undefined;

    if (result?.latest) {
      const date = result.latest instanceof Date ? result.latest : new Date(result.latest);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch (error) {
    // If table doesn't exist or query fails, log and return null
    // This allows the system to work even if the translations table isn't set up yet
    logger.debug(
      { err: error, namespace },
      "[legal-version] Failed to read from database (table may not exist)",
    );
    return null;
  }
}

/**
 * Get the latest modified timestamp across translation files for a namespace
 */
function getLatestModifiedAtFromFiles(
  namespace: LegalNamespace,
  languages: SupportedLanguage[],
): Date | null {
  const dates: Date[] = [];

  for (const language of languages) {
    const filePath = join(TRANSLATIONS_BASE_PATH, language, `${namespace}.json`);
    try {
      const stats = statSync(filePath);
      dates.push(stats.mtime);
    } catch (error) {
      logger.debug(
        { err: error, namespace, language },
        "[legal-version] Failed to stat translation file",
      );
    }
  }

  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((latest, current) => (current > latest ? current : latest));
}

/**
 * Calculate the latest version for a legal document namespace
 * by finding the maximum created_at across all translations
 * Checks the translations database table first, then falls back to file timestamps
 *
 * @param namespace - The legal document namespace (terms, privacy, or cookie)
 * @returns The latest date in YYYY-MM-DD format, or a fallback date if parsing fails
 */
export async function calculateLegalDocumentVersion(namespace: LegalNamespace): Promise<string> {
  // Check cache first
  const cached = versionCache.get(namespace);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.version;
  }

  const languages: SupportedLanguage[] = ["en", "de", "es", "fr", "el"];
  const dates: Date[] = [];
  let source: "database" | "files" | "fallback" = "fallback";

  const latestDatabaseDate = await getLatestCreatedAtFromDatabase(namespace);
  if (latestDatabaseDate) {
    dates.push(latestDatabaseDate);
    source = "database";
  } else {
    const latestFileDate = getLatestModifiedAtFromFiles(namespace, languages);
    if (latestFileDate) {
      dates.push(latestFileDate);
      source = "files";
    }
  }

  if (dates.length === 0) {
    logger.error({ namespace }, "[legal-version] No valid dates found, using fallback");
    // Fallback to a safe default date
    const fallbackVersion = "2024-06-01";
    versionCache.set(namespace, { version: fallbackVersion, timestamp: now });
    return fallbackVersion;
  }

  // Find the latest date
  const latestDate = dates.reduce((latest, current) => {
    return current > latest ? current : latest;
  });

  const version = formatVersionDate(latestDate);
  logger.debug({ namespace, version, source }, "[legal-version] Calculated version");

  // Update cache
  versionCache.set(namespace, { version, timestamp: now });
  return version;
}

/**
 * Get the current Terms and Conditions version
 * Calculated from the latest created_at across all translations in the namespace
 * Checks the translations database table first, then falls back to file timestamps
 */
export async function getCurrentTermsVersion(): Promise<string> {
  return calculateLegalDocumentVersion("terms");
}

/**
 * Get the current Privacy Policy version
 * Calculated from the latest created_at across all translations in the namespace
 * Checks the translations database table first, then falls back to file timestamps
 */
export async function getCurrentPrivacyPolicyVersion(): Promise<string> {
  return calculateLegalDocumentVersion("privacy");
}

/**
 * Get the current Cookie Policy version
 * Calculated from the latest created_at across all translations in the namespace
 * Checks the translations database table first, then falls back to file timestamps
 */
export async function getCurrentCookiePolicyVersion(): Promise<string> {
  return calculateLegalDocumentVersion("cookie");
}

/**
 * Check if a user's accepted terms version is outdated
 */
export async function isTermsVersionOutdated(
  userVersion: string | null | undefined,
): Promise<boolean> {
  if (!userVersion) {
    return true; // No version means not accepted
  }
  const currentVersion = await getCurrentTermsVersion();
  return userVersion !== currentVersion;
}

/**
 * Check if a user's accepted privacy policy version is outdated
 */
export async function isPrivacyPolicyVersionOutdated(
  userVersion: string | null | undefined,
): Promise<boolean> {
  if (!userVersion) {
    return true; // No version means not accepted
  }
  const currentVersion = await getCurrentPrivacyPolicyVersion();
  return userVersion !== currentVersion;
}
