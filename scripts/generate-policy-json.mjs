#!/usr/bin/env node
/**
 * Generate i18n JSON files from markdown policy documents
 *
 * This script parses the markdown policy files and generates the corresponding
 * JSON translation files, ensuring the markdown files are the single source of truth.
 *
 * Usage: node scripts/generate-policy-json.mjs [--terms|--privacy|--all]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Paths
const POLICY_DIR = path.join(rootDir, "docs/5.Policies");
const TERMS_MD = path.join(POLICY_DIR, "terms-and-conditions.md");
const PRIVACY_MD = path.join(POLICY_DIR, "Privacy_Policy.md");
const I18N_DIR = path.join(rootDir, "apps/frontend/src/i18n/locales/en");

/**
 * Extract effective date from markdown
 */
function extractEffectiveDate(content, type) {
  if (type === "terms") {
    const match = content.match(/\*\*Effective Date:\*\*\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  } else if (type === "privacy") {
    const match = content.match(/\*\*Effective date:\*\*\s*([^\n]+)/);
    return match ? match[1].trim() : null;
  }
  return null;
}

/**
 * Parse markdown section into structured data
 */
function parseMarkdownSection(content, sectionNum) {
  const sectionRegex = new RegExp(
    `##\\s+${sectionNum}\\.\\s+([^\\n]+)\\n([\\s\\S]*?)(?=##\\s+${sectionNum + 1}\\.|$)`,
    "i",
  );
  const match = content.match(sectionRegex);

  if (!match) return null;

  const title = match[1].trim();
  let body = match[2].trim();

  // Check for subtitle
  const subtitleMatch = body.match(/^([^\\n]+)\\n/);
  const subtitle = subtitleMatch ? subtitleMatch[1].trim() : null;

  // Extract list items
  const listItems = [];
  const listRegex = /^-\s+(.+)$/gm;
  let listMatch;
  while ((listMatch = listRegex.exec(body)) !== null) {
    listItems.push(listMatch[1].trim());
  }

  // Extract paragraphs (non-list content)
  const paragraphs = body
    .split("\n")
    .filter((line) => line.trim() && !line.match(/^-\s+/) && !line.match(/^##/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    title,
    subtitle: subtitle || undefined,
    items: listItems.length > 0 ? listItems : undefined,
    content: paragraphs.length > 0 ? paragraphs.join(" ") : undefined,
  };
}

/**
 * Generate Terms JSON from markdown
 */
function generateTermsJSON(markdownContent) {
  const effectiveDate = extractEffectiveDate(markdownContent, "terms");

  const result = {
    eyebrow: "Legal",
    title: "Terms and Conditions",
    description: "Please read our Terms and Conditions carefully before using FitVibe.",
    effectiveDate: "Effective Date",
    effectiveDateValue: effectiveDate || "2024-06-01",
    intro: markdownContent.match(/^These Terms[^]*?By using the Services[^]*?\./m)?.[0] || "",
  };

  // Parse sections 1-16
  for (let i = 1; i <= 16; i++) {
    const section = parseMarkdownSection(markdownContent, i);
    if (section) {
      const sectionKey = `section${i}`;
      result[sectionKey] = {
        title: section.title,
      };

      if (section.subtitle) {
        result[sectionKey].subtitle = section.subtitle;
      }

      if (section.items && section.items.length > 0) {
        result[sectionKey].items = section.items;
      }

      if (section.content) {
        result[sectionKey].content = section.content;
      }
    }
  }

  return result;
}

/**
 * Generate Privacy JSON from markdown
 */
function generatePrivacyJSON(markdownContent) {
  const effectiveDate = extractEffectiveDate(markdownContent, "privacy");

  const result = {
    eyebrow: "Legal",
    title: "Privacy Policy",
    description: "Learn how we collect, use, and protect your personal data.",
    effectiveDate: "Effective date",
    effectiveDateValue: effectiveDate || "26 October 2025",
    intro1: markdownContent.match(/FitVibe helps[^]*?data protection laws\./)?.[0] || "",
    intro2:
      "By using the Services, you acknowledge that your personal data will be processed as described in this Privacy Policy.",
  };

  // Parse sections 1-16
  for (let i = 1; i <= 16; i++) {
    const section = parseMarkdownSection(markdownContent, i);
    if (section) {
      const sectionKey = `section${i}`;
      result[sectionKey] = {
        title: section.title,
      };

      if (section.subtitle) {
        result[sectionKey].subtitle = section.subtitle;
      }

      if (section.items && section.items.length > 0) {
        result[sectionKey].items = section.items;
      }

      if (section.content) {
        result[sectionKey].content = section.content;
      }
    }
  }

  return result;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const generateAll = args.includes("--all") || args.length === 0;
  const generateTerms = generateAll || args.includes("--terms");
  const generatePrivacy = generateAll || args.includes("--privacy");

  console.log("Generating policy JSON files from markdown...\n");

  if (generateTerms) {
    try {
      const termsMD = fs.readFileSync(TERMS_MD, "utf8");
      const termsJSON = generateTermsJSON(termsMD);
      const outputPath = path.join(I18N_DIR, "terms.json");
      fs.writeFileSync(outputPath, JSON.stringify(termsJSON, null, 2) + "\n");
      console.log(`✅ Generated: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error generating terms.json:`, error.message);
      process.exit(1);
    }
  }

  if (generatePrivacy) {
    try {
      const privacyMD = fs.readFileSync(PRIVACY_MD, "utf8");
      const privacyJSON = generatePrivacyJSON(privacyMD);
      const outputPath = path.join(I18N_DIR, "privacy.json");
      fs.writeFileSync(outputPath, JSON.stringify(privacyJSON, null, 2) + "\n");
      console.log(`✅ Generated: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error generating privacy.json:`, error.message);
      process.exit(1);
    }
  }

  console.log("\n✨ Done!");
  console.log("\nNote: This script generates the English JSON files.");
  console.log("Other language translations should maintain the same structure.");
}

main();
