import path from "node:path";
import { spawnSync } from "node:child_process";
import knex from "knex";

const { connectionString: DATABASE_URL, isAvailable: isDatabaseAvailable } =
  resolveDatabaseConnection();
const describeFn = isDatabaseAvailable ? describe : describe.skip;

describeFn("database migrations", () => {
  let client: knex.Knex;

  beforeAll(async () => {
    const admin = knex({
      client: "pg",
      connection: DATABASE_URL,
    });

    await admin.raw("DROP SCHEMA IF EXISTS tmp_migration_test CASCADE;");
    await admin.raw("CREATE SCHEMA tmp_migration_test;");
    await ensureDatabaseExtensions(admin);
    await admin.destroy();

    client = knex({
      client: "pg",
      connection: DATABASE_URL,
      searchPath: ["tmp_migration_test", "public"],
      migrations: {
        loadExtensions: [".ts"],
        directory: path.resolve(__dirname, "../../src/db/migrations"),
      },
    });
  });

  afterAll(async () => {
    if (client) {
      await client.destroy();
    }
    const admin = knex({
      client: "pg",
      connection: DATABASE_URL,
    });
    await admin.raw("DROP SCHEMA IF EXISTS tmp_migration_test CASCADE;");
    await admin.destroy();
  });

  it("applies latest migrations and rolls back cleanly", async () => {
    await client.migrate.latest();
    await client.migrate.rollback(undefined, true);
  });

  describe("table schemas after migration", () => {
    beforeAll(async () => {
      await client.migrate.latest();
    });

    it("creates roles table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("roles");
      expect(hasTable).toBe(true);

      const columns = await client("roles").columnInfo();
      expect(columns.code).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.created_at).toBeDefined();
    });

    it("creates genders table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("genders");
      expect(hasTable).toBe(true);

      const columns = await client("genders").columnInfo();
      expect(columns.code).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.created_at).toBeDefined();
    });

    it("creates fitness_levels table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("fitness_levels");
      expect(hasTable).toBe(true);

      const columns = await client("fitness_levels").columnInfo();
      expect(columns.code).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.created_at).toBeDefined();
    });

    it("creates exercise_types table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("exercise_types");
      expect(hasTable).toBe(true);

      const columns = await client("exercise_types").columnInfo();
      expect(columns.code).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.created_at).toBeDefined();
    });

    it("creates users table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("users");
      expect(hasTable).toBe(true);

      const columns = await client("users").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.username).toBeDefined();
      expect(columns.email).toBeDefined();
      expect(columns.password_hash).toBeDefined();
      expect(columns.role_code).toBeDefined();
      expect(columns.email_verified).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("creates profiles table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("profiles");
      expect(hasTable).toBe(true);

      const columns = await client("profiles").columnInfo();
      expect(columns.user_id).toBeDefined();
      expect(columns.display_name).toBeDefined();
      expect(columns.bio).toBeDefined();
      expect(columns.date_of_birth).toBeDefined();
      expect(columns.gender_id).toBeDefined();
      expect(columns.fitness_level).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("creates sessions table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("sessions");
      expect(hasTable).toBe(true);

      const columns = await client("sessions").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.user_id).toBeDefined();
      expect(columns.plan_id).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.status).toBeDefined();
      expect(columns.visibility).toBeDefined();
      expect(columns.planned_at).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("creates exercises table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("exercises");
      expect(hasTable).toBe(true);

      const columns = await client("exercises").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.owner_id).toBeDefined();
      expect(columns.category_id).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("creates session_exercises table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("session_exercises");
      expect(hasTable).toBe(true);

      const columns = await client("session_exercises").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.session_id).toBeDefined();
      expect(columns.exercise_id).toBeDefined();
      expect(columns.order_index).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("creates exercise_sets table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("exercise_sets");
      expect(hasTable).toBe(true);

      const columns = await client("exercise_sets").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.session_exercise_id).toBeDefined();
      expect(columns.set_number).toBeDefined();
      expect(columns.reps).toBeDefined();
      expect(columns.weight_kg).toBeDefined();
      expect(columns.rpe).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("creates personal_records table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("personal_records");
      expect(hasTable).toBe(true);

      const columns = await client("personal_records").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.user_id).toBeDefined();
      expect(columns.exercise_id).toBeDefined();
      expect(columns.metric_type).toBeDefined();
      expect(columns.value).toBeDefined();
      expect(columns.achieved_at).toBeDefined();
      expect(columns.is_current).toBeDefined();
      expect(columns.visibility).toBeDefined();
      expect(columns.created_at).toBeDefined();
    });

    it("creates feed_items table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("feed_items");
      expect(hasTable).toBe(true);

      const columns = await client("feed_items").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.user_id).toBeDefined();
      expect(columns.content).toBeDefined();
      expect(columns.visibility).toBeDefined();
      expect(columns.created_at).toBeDefined();
      expect(columns.updated_at).toBeDefined();
    });

    it("creates user_points table with correct schema", async () => {
      const hasTable = await client.schema.hasTable("user_points");
      expect(hasTable).toBe(true);

      const columns = await client("user_points").columnInfo();
      expect(columns.id).toBeDefined();
      expect(columns.user_id).toBeDefined();
      expect(columns.points).toBeDefined();
      expect(columns.reason).toBeDefined();
      expect(columns.awarded_at).toBeDefined();
    });

    it("creates foreign key constraints between users and profiles", async () => {
      const foreignKeys = await client.raw(`
        SELECT constraint_name, table_name, column_name,
               foreign_table_name, foreign_column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = 'tmp_migration_test'
          AND table_name = 'profiles'
          AND constraint_name LIKE '%foreign%'
      `);

      expect(foreignKeys.rows.length).toBeGreaterThan(0);
    });

    it("creates indexes on frequently queried columns", async () => {
      const indexes = await client.raw(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE schemaname = 'tmp_migration_test'
          AND tablename IN ('users', 'sessions', 'exercises')
      `);

      expect(indexes.rows.length).toBeGreaterThan(0);
    });
  });
});

if (!isDatabaseAvailable) {
  test.skip("Database unavailable. Set TEST_DATABASE_URL or start a local Postgres instance before running migration tests.", () =>
    undefined);
}

async function ensureDatabaseExtensions(admin: knex.Knex): Promise<void> {
  await admin.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  try {
    await admin.raw('CREATE EXTENSION IF NOT EXISTS "citext";');
  } catch (error) {
    await admin.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'citext') THEN
          CREATE DOMAIN citext AS text;
        END IF;
      END $$;
    `);
  }
}

function resolveDatabaseConnection(): { connectionString: string; isAvailable: boolean } {
  const candidates = collectConnectionCandidates();
  for (const candidate of candidates) {
    const isAvailable = checkDatabaseAvailability(candidate);
    if (isAvailable) {
      return { connectionString: candidate, isAvailable };
    }
  }
  return { connectionString: candidates[0] ?? "", isAvailable: false };
}

function collectConnectionCandidates(): string[] {
  const user = encodeURIComponent(process.env.PGUSER ?? "fitvibe");
  const password = encodeURIComponent(process.env.PGPASSWORD ?? "fitvibe");
  const database = process.env.PGDATABASE ?? "fitvibe_db";
  const port = Number(process.env.PGPORT ?? 5432);
  const hostCandidates = [
    process.env.TEST_DATABASE_HOST,
    process.env.PGHOST,
    process.env.DB_HOST,
    process.env.DATABASE_HOST,
    "localhost",
    "127.0.0.1",
    "postgres",
    "db",
    "fitvibe-postgres",
    "fitvibe_db",
  ].filter(Boolean) as string[];

  const connectionStrings = hostCandidates.map(
    (host) => `postgresql://${user}:${password}@${host}:${port}/${database}`,
  );

  const manualSources = [
    process.env.TEST_DATABASE_URL,
    process.env.USE_APP_DATABASE_FOR_TESTS === "true" ? process.env.DATABASE_URL : undefined,
  ];
  const manual = manualSources.filter((value): value is string => Boolean(value?.trim()));

  const unique = new Set<string>();
  const ordered = [...manual, ...connectionStrings];
  return ordered.filter((entry) => {
    if (!entry) {
      return false;
    }
    if (unique.has(entry)) {
      return false;
    }
    unique.add(entry);
    return true;
  });
}

function checkDatabaseAvailability(connectionString: string): boolean {
  if (!connectionString) {
    return false;
  }

  const probeScript = `
const knex = require('knex');
(async () => {
  let client;
  try {
    client = knex({
      client: 'pg',
      connection: process.env.__TEST_DB_CONN__,
      pool: { min: 0, max: 1 },
      acquireConnectionTimeout: 2000,
    });
    
    // Set a timeout for the connection attempt
    const timeout = setTimeout(() => {
      if (client) {
        client.destroy().catch(() => undefined);
      }
      process.exit(1);
    }, 3000);
    
    await client.raw('select 1');
    clearTimeout(timeout);
    await client.destroy();
    process.exit(0);
  } catch (error) {
    if (client) {
      await client.destroy().catch(() => undefined);
    }
    process.exit(1);
  }
})();`;

  const result = spawnSync(process.execPath, ["-e", probeScript], {
    env: { ...process.env, __TEST_DB_CONN__: connectionString },
    stdio: "ignore",
    timeout: 5000, // 5 second timeout for the entire spawn
    killSignal: "SIGTERM", // Ensure process is killed on timeout
  });

  // If the process was killed due to timeout, ensure it's terminated
  if (result.signal) {
    return false;
  }

  return result.status === 0;
}
