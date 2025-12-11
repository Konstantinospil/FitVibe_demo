import type { Knex } from "knex";
import fs from "node:fs";
import path from "node:path";

function readSql(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

export async function up(knex: Knex): Promise<void> {
  await knex.raw(readSql("../types/exercise_difficulty_enum.sql"));

  // Drop function first to avoid "tuple concurrently updated" errors
  // This makes the CREATE OR REPLACE more reliable in concurrent scenarios
  await knex.raw("DROP FUNCTION IF EXISTS public.ensure_monthly_partitions() CASCADE;");

  // Create function with retry logic for concurrent updates
  let retries = 3;
  while (retries > 0) {
    try {
      await knex.raw(readSql("../functions/ensure_partitions.sql"));
      break;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("tuple concurrently updated") && retries > 1) {
        retries--;
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      throw error;
    }
  }

  await knex.raw(readSql("../functions/refresh_session_summary.sql"));
  // Note: v_session_summary view and trigger are created in 202510140028_create_session_summary_view.ts
  // after the session_summary materialized view is created
}

export async function down(knex: Knex): Promise<void> {
  // Only drop what this migration created in up()
  // Note: trigger, trigger function, and view are created in 202510140028_create_session_summary_view.ts
  await knex.raw("DROP FUNCTION IF EXISTS refresh_session_summary(boolean);");
  await knex.raw("DROP FUNCTION IF EXISTS ensure_monthly_partitions();");
  await knex.raw("DROP TYPE IF EXISTS exercise_difficulty_enum;");
}
