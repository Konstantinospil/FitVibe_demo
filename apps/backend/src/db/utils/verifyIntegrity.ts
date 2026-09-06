import { db } from "../connection.js";
import { logger } from "../../config/logger.js";
import { toErrorPayload } from "../../utils/error.utils.js";

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
  "perf_attributes",
];

const VIEWS = ["session_summary", "weekly_aggregates", "mv_leaderboard"];
const REQUIRED_ROLES = ["admin", "athlete", "coach", "support"] as const;

async function verify(): Promise<void> {
  try {
    logger.info("Verifying database objects...");
    for (const table of TABLES) {
      const exists = await db.schema.hasTable(table);
      logger.info(`${table.padEnd(40)} ${exists ? "present" : "missing"}`);
    }
    const roleRows = await db("roles").select("code").whereIn("code", [...REQUIRED_ROLES]);
    const presentRoles = new Set(roleRows.map((row: { code: string }) => row.code));
    const missingRoles = REQUIRED_ROLES.filter((role) => !presentRoles.has(role));
    if (missingRoles.length > 0) {
      throw new Error(`Missing required application roles: ${missingRoles.join(", ")}`);
    }
    logger.info("Required application roles verified");

    for (const view of VIEWS) {
      const result = await db
        .select("matviewname")
        .from("pg_matviews")
        .where("matviewname", view)
        .union([db.select("viewname as matviewname").from("pg_views").where("viewname", view)]);
      logger.info(`${view.padEnd(40)} ${result.length > 0 ? "present" : "missing"}`);
    }
  } finally {
    await db.destroy();
  }
}

verify().catch((error: unknown) => {
  logger.error(toErrorPayload(error), "Integrity verification failed");
  process.exit(1);
});
