import type { Knex } from "knex";

const REQUIRED_ROLES = [
  { code: "admin", description: "Keeps the map: platform steward for the six stories" },
  {
    code: "coach",
    description: "Mentor for a chapter, with the athlete's consent — then you leave",
  },
  { code: "athlete", description: "The one who must live all six elemental stories" },
  { code: "support", description: "Mends the hero: nutrition, physio, and care between quests" },
] as const;

/**
 * Roles are application reference data, not demo data.
 *
 * Registration always creates users with role_code="athlete", so these rows must
 * exist in every environment before the application can accept registrations.
 * This migration also repairs existing installations where the lookup-table
 * migration ran but the optional seed step did not.
 */
export async function up(knex: Knex): Promise<void> {
  await knex("roles").insert(REQUIRED_ROLES).onConflict("code").merge(["description"]);
}

/**
 * Intentionally keep required application roles on rollback.
 *
 * Removing them while users still reference roles.code would violate the users
 * foreign key. The original lookup-table migration owns creation/removal of the
 * roles table during a complete rollback.
 */
export async function down(): Promise<void> {
  // No-op by design.
}
