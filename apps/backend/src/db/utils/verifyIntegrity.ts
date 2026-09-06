import { db } from "../connection.js";
import { logger } from "../../config/logger.js";
import { toErrorPayload } from "../../utils/error.utils.js";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";

const TABLES = [
  "roles",
  "genders",
  "fitness_levels",
  "exercise_types",
  "users",
  "profiles",
  "user_contacts",
  "user_tombstones",
  "user_state_history",
  "auth_sessions",
  "audit_log",
  "exercises",
  "sessions",
  "session_exercises",
  "exercise_sets",
  "planned_exercise_attributes",
  "personal_records",
  "user_points",
  "plans",
  "badge_catalog",
  "badges",
  "followers",
  "media",
  "feed_items",
  "feed_comments",
  "feed_likes",
  "session_bookmarks",
  "user_blocks",
  "idempotency_keys",
  "pending_2fa_sessions",
  "user_2fa_settings",
  "cookie_consents",
  "translations",
  "bio_attributes",
  "bio_attribute_values",
  "bio_attribute_selections",
  "perf_attributes",
  "perf_attribute_values",
  "perf_attribute_selections",
];

const VIEWS = ["session_summary", "weekly_aggregates", "mv_leaderboard"];

const REQUIRED_COUNTS = [
  { table: "roles", minCount: 4 },
  { table: "genders", minCount: 4 },
  { table: "fitness_levels", minCount: 5 },
  { table: "exercise_types", minCount: 24 },
  { table: "badge_catalog", minCount: 36 },
  { table: "bio_attributes", minCount: 11 },
  { table: "perf_attributes", minCount: 12 },
  { table: "translations", minCount: 1 },
] as const;

async function countRows(table: string): Promise<number> {
  const row = await db(table).count<{ count: string | number }>("* as count").first();
  return row ? Number(row.count) : 0;
}

async function verify(): Promise<void> {
  try {
    logger.info("Verifying database objects and required seed data...");

    const missingTables: string[] = [];
    for (const table of TABLES) {
      const exists = await db.schema.hasTable(table);
      logger.info(`${table.padEnd(40)} ${exists ? "present" : "missing"}`);
      if (!exists) {
        missingTables.push(table);
      }
    }
    if (missingTables.length > 0) {
      throw new Error(`Missing required database tables: ${missingTables.join(", ")}`);
    }

    for (const { table, minCount } of REQUIRED_COUNTS) {
      const count = await countRows(table);
      if (count < minCount) {
        throw new Error(`${table} has ${count} rows; expected at least ${minCount}`);
      }
      logger.info(`${table.padEnd(40)} ${count} required rows present`);
    }

    const globalExercises = await db("exercises")
      .whereNull("owner_id")
      .where({ is_public: true })
      .count<{ count: string | number }>("* as count")
      .first();
    const globalExerciseCount = globalExercises ? Number(globalExercises.count) : 0;
    if (globalExerciseCount < 300) {
      throw new Error(
        `Global exercise catalog has ${globalExerciseCount} rows; expected at least 300`,
      );
    }

    const admin = await db("users")
      .where({ id: ADMIN_ID, role_code: "admin", status: "active" })
      .first();
    const adminProfile = await db("profiles").where({ user_id: ADMIN_ID, alias: "admin" }).first();
    const adminContact = await db("user_contacts")
      .where({ user_id: ADMIN_ID, type: "email", is_primary: true, is_verified: true })
      .first();

    if (!admin || !adminProfile || !adminContact) {
      throw new Error("Bootstrap administrator is missing or incomplete");
    }
    logger.info("Bootstrap administrator verified");

    const missingViews: string[] = [];
    for (const view of VIEWS) {
      const result = await db
        .select("matviewname")
        .from("pg_matviews")
        .where("matviewname", view)
        .union([db.select("viewname as matviewname").from("pg_views").where("viewname", view)]);
      const exists = result.length > 0;
      logger.info(`${view.padEnd(40)} ${exists ? "present" : "missing"}`);
      if (!exists) {
        missingViews.push(view);
      }
    }
    if (missingViews.length > 0) {
      throw new Error(`Missing required database views: ${missingViews.join(", ")}`);
    }

    logger.info("Database integrity verification completed successfully.");
  } finally {
    await db.destroy();
  }
}

verify().catch((error: unknown) => {
  logger.error(toErrorPayload(error), "Integrity verification failed");
  process.exit(1);
});
