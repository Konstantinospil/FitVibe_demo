import type { Knex } from "knex";

const TRANSLATIONS_TABLE = "translations";

/**
 * Migration to update email addresses in privacy and terms translations
 * Changes:
 * - privacy@fitvibe.example.com -> kpilpilidis@gmail.com
 * - legal@fitvibe.example.com -> kpilpilidis@gmail.com
 */
export async function up(knex: Knex): Promise<void> {
  // Check if translations table exists
  const hasTable = await knex.schema.hasTable(TRANSLATIONS_TABLE);
  if (!hasTable) {
    console.warn(`Table ${TRANSLATIONS_TABLE} does not exist. Skipping email address update.`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log("Updating email addresses in translations...");

  // Update privacy@fitvibe.example.com to kpilpilidis@gmail.com
  const privacyUpdated = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "privacy")
    .where("value", "like", "%privacy@fitvibe.example.com%")
    .update({
      value: knex.raw("REPLACE(value, 'privacy@fitvibe.example.com', 'kpilpilidis@gmail.com')"),
      updated_at: knex.fn.now(),
    });

  // eslint-disable-next-line no-console
  console.log(`Updated ${privacyUpdated} privacy translation entries`);

  // Update legal@fitvibe.example.com to kpilpilidis@gmail.com
  const legalUpdated = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "terms")
    .where("value", "like", "%legal@fitvibe.example.com%")
    .update({
      value: knex.raw("REPLACE(value, 'legal@fitvibe.example.com', 'kpilpilidis@gmail.com')"),
      updated_at: knex.fn.now(),
    });

  // eslint-disable-next-line no-console
  console.log(`Updated ${legalUpdated} terms translation entries`);

  // Also update with backticks (for markdown-formatted strings)
  const privacyBacktickUpdated = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "privacy")
    .where(knex.raw("value LIKE ?", ["%`privacy@fitvibe.example.com`%"]))
    .update({
      value: knex.raw("REPLACE(value, '`privacy@fitvibe.example.com`', '`kpilpilidis@gmail.com`')"),
      updated_at: knex.fn.now(),
    });

  // eslint-disable-next-line no-console
  console.log(`Updated ${privacyBacktickUpdated} privacy translation entries (with backticks)`);

  const legalBacktickUpdated = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "terms")
    .where(knex.raw("value LIKE ?", ["%`legal@fitvibe.example.com`%"]))
    .update({
      value: knex.raw("REPLACE(value, '`legal@fitvibe.example.com`', '`kpilpilidis@gmail.com`')"),
      updated_at: knex.fn.now(),
    });

  // eslint-disable-next-line no-console
  console.log(`Updated ${legalBacktickUpdated} terms translation entries (with backticks)`);

  const totalUpdated =
    privacyUpdated + legalUpdated + privacyBacktickUpdated + legalBacktickUpdated;
  // eslint-disable-next-line no-console
  console.log(`Successfully updated ${totalUpdated} translation entries.`);
}

export async function down(knex: Knex): Promise<void> {
  // Reverse the changes: kpilpilidis@gmail.com -> original emails
  const hasTable = await knex.schema.hasTable(TRANSLATIONS_TABLE);
  if (!hasTable) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log("Reverting email addresses in translations...");

  // Revert privacy email
  const privacyReverted = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "privacy")
    .where("value", "like", "%kpilpilidis@gmail.com%")
    .update({
      value: knex.raw("REPLACE(value, 'kpilpilidis@gmail.com', 'privacy@fitvibe.example.com')"),
      updated_at: knex.fn.now(),
    });

  // Revert legal email
  const legalReverted = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "terms")
    .where("value", "like", "%kpilpilidis@gmail.com%")
    .update({
      value: knex.raw("REPLACE(value, 'kpilpilidis@gmail.com', 'legal@fitvibe.example.com')"),
      updated_at: knex.fn.now(),
    });

  // Revert with backticks
  const privacyBacktickReverted = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "privacy")
    .where(knex.raw("value LIKE ?", ["%`kpilpilidis@gmail.com`%"]))
    .update({
      value: knex.raw("REPLACE(value, '`kpilpilidis@gmail.com`', '`privacy@fitvibe.example.com`')"),
      updated_at: knex.fn.now(),
    });

  const legalBacktickReverted = await knex(TRANSLATIONS_TABLE)
    .where("namespace", "terms")
    .where(knex.raw("value LIKE ?", ["%`kpilpilidis@gmail.com`%"]))
    .update({
      value: knex.raw("REPLACE(value, '`kpilpilidis@gmail.com`', '`legal@fitvibe.example.com`')"),
      updated_at: knex.fn.now(),
    });

  const totalReverted =
    privacyReverted + legalReverted + privacyBacktickReverted + legalBacktickReverted;
  // eslint-disable-next-line no-console
  console.log(`Reverted ${totalReverted} translation entries.`);
}
