/**
 * Legal document version calculation
 *
 * Calculates the version of legal documents (terms, privacy, cookie) by finding
 * the latest effectiveDateValue across all language translations.
 *
 * This ensures that when ANY language version is updated, ALL languages are
 * considered changed, so users don't need to re-accept based on which language
 * they originally accepted in.
 */

import { readFileSync } from "node:fs";
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
const CACHE_TTL_MS = 10 * 60 * 1000; // 5 minutes cache TTL

/**
 * Parse a date string that can be in ISO format (YYYY-MM-DD) or human-readable format
 * Returns null if parsing fails
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try human-readable formats (e.g., "26 October 2025", "26. Oktober 2025")
  // JavaScript's Date constructor can parse many formats, but we validate the result
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    // Additional validation: ensure the parsed date makes sense
    // Check if the year is reasonable (between 2000 and 2100)
    const year = date.getFullYear();
    if (year >= 2000 && year <= 2100) {
      return date;
    }
  }

  return null;
}

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
 * Get the effective date value from a translation file
 */
function getEffectiveDateFromFile(
  namespace: LegalNamespace,
  language: SupportedLanguage,
): string | null {
  try {
    const filePath = join(TRANSLATIONS_BASE_PATH, language, `${namespace}.json`);
    const fileContent = readFileSync(filePath, "utf-8");
    const translation = JSON.parse(fileContent) as { effectiveDateValue?: string };

    if (translation.effectiveDateValue) {
      return translation.effectiveDateValue;
    }

    logger.warn(
      { namespace, language },
      "[legal-version] No effectiveDateValue found in translation file",
    );
    return null;
  } catch (error) {
    logger.error(
      { err: error, namespace, language },
      "[legal-version] Failed to read translation file",
    );
    return null;
  }
}

/**
 * Get the effective date value from the translations database table
 */
async function getEffectiveDateFromDatabase(
  namespace: LegalNamespace,
  language: SupportedLanguage,
): Promise<string | null> {
  try {
    const result = (await db("translations")
      .where({
        namespace,
        key_path: "effectiveDateValue",
        language,
      })
      .select("value")
      .first()) as { value: string } | undefined;

    if (result?.value && typeof result.value === "string") {
      return result.value;
    }

    return null;
  } catch (error) {
    // If table doesn't exist or query fails, log and return null
    // This allows the system to work even if the translations table isn't set up yet
    logger.debug(
      { err: error, namespace, language },
      "[legal-version] Failed to read from database (table may not exist)",
    );
    return null;
  }
}

/**
 * Calculate the latest version for a legal document namespace
 * by finding the maximum effectiveDateValue across all languages
 * Checks both translation files and the translations database table
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

  // Check both files and database for each language
  for (const language of languages) {
    // Try database first (more up-to-date if translations are managed via API)
    let dateValue = await getEffectiveDateFromDatabase(namespace, language);

    // Fallback to file if database doesn't have it
    if (!dateValue) {
      dateValue = getEffectiveDateFromFile(namespace, language);
    }

    if (dateValue) {
      const parsedDate = parseDate(dateValue);
      if (parsedDate) {
        dates.push(parsedDate);
      } else {
        logger.warn(
          { namespace, language, dateValue },
          "[legal-version] Failed to parse date value, skipping",
        );
      }
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
  logger.debug(
    { namespace, version, dateCount: dates.length },
    "[legal-version] Calculated version",
  );

  // Update cache
  versionCache.set(namespace, { version, timestamp: now });
  return version;
}

/**
 * Get the current Terms and Conditions version
 * Calculated from the latest effectiveDateValue across all language translations
 * Checks both translation files and the translations database table
 */
export async function getCurrentTermsVersion(): Promise<string> {
  return calculateLegalDocumentVersion("terms");
}

/**
 * Get the current Privacy Policy version
 * Calculated from the latest effectiveDateValue across all language translations
 * Checks both translation files and the translations database table
 */
export async function getCurrentPrivacyPolicyVersion(): Promise<string> {
  return calculateLegalDocumentVersion("privacy");
}

/**
 * Get the current Cookie Policy version
 * Calculated from the latest effectiveDateValue across all language translations
 * Checks both translation files and the translations database table
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
