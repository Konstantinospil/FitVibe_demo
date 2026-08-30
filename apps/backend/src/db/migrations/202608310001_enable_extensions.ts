import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  try {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "citext";');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("could not open extension control file") ||
      (errorMessage.includes("extension") && errorMessage.includes("does not exist"))
    ) {
      await knex.raw(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'citext') THEN
            CREATE DOMAIN citext AS text;
          END IF;
        END $$;
      `);
    } else {
      throw error;
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP EXTENSION IF EXISTS "citext" CASCADE;');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- knex.raw() is untyped
  const domainExists = await knex.raw(`
    SELECT 1 FROM pg_type WHERE typname = 'citext' AND typtype = 'd'
  `);
  const rows =
    typeof domainExists === "object" &&
    domainExists !== null &&
    "rows" in domainExists &&
    Array.isArray((domainExists as { rows: unknown }).rows)
      ? (domainExists as { rows: unknown[] }).rows
      : [];
  if (rows.length > 0) {
    await knex.raw("DROP DOMAIN IF EXISTS citext CASCADE;");
  }
  await knex.raw('DROP EXTENSION IF EXISTS "pgcrypto";');
}
