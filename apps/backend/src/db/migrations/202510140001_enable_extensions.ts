import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  // Note: uuid-ossp is not needed - we use gen_random_uuid() from pgcrypto
  // Attempt to create citext extension, fallback to domain if not available
  try {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "citext";');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If citext extension is not available, create a domain as fallback
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
    } else if (
      // Handle concurrent creation race condition - extension is being created by another process
      errorMessage.includes("duplicate key value violates unique constraint") ||
      errorMessage.includes("pg_extension_name_index")
    ) {
      // Extension is being created concurrently, verify it exists now
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const checkExt = await knex.raw(`
        SELECT 1 FROM pg_extension WHERE extname = 'citext'
      `);
      const checkExtRows = (checkExt as { rows: Array<Record<string, unknown>> }).rows;
      if (checkExtRows.length === 0) {
        // Extension doesn't exist yet, wait a bit and retry once
        await new Promise((resolve) => setTimeout(resolve, 100));
        try {
          await knex.raw('CREATE EXTENSION IF NOT EXISTS "citext";');
        } catch (retryError: unknown) {
          // If it still fails, check if it exists now (might have been created by another process)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const checkAgain = await knex.raw(`
            SELECT 1 FROM pg_extension WHERE extname = 'citext'
          `);
          const checkAgainRows = (checkAgain as { rows: Array<Record<string, unknown>> }).rows;
          if (checkAgainRows.length === 0) {
            // Still doesn't exist and retry failed, re-throw
            throw retryError;
          }
          // Extension exists now, continue silently
        }
      }
      // Extension exists, continue silently
    } else {
      // Re-throw if it's a different error
      throw error;
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Try to drop extension first (if it exists)
  await knex.raw('DROP EXTENSION IF EXISTS "citext" CASCADE;');
  // Drop domain if it exists (fallback for citext - only if extension doesn't exist)
  // Check if domain exists before trying to drop it
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const domainExists = await knex.raw(`
    SELECT 1 FROM pg_type WHERE typname = 'citext' AND typtype = 'd'
  `);
  const domainExistsRows = (domainExists as { rows: Array<Record<string, unknown>> }).rows;
  if (domainExistsRows.length > 0) {
    await knex.raw("DROP DOMAIN IF EXISTS citext CASCADE;");
  }
  // uuid-ossp was never created, so no need to drop it
  await knex.raw('DROP EXTENSION IF EXISTS "pgcrypto";');
}
