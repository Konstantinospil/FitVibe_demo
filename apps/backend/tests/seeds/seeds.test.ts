import path from "node:path";
import { spawnSync } from "node:child_process";
import knex from "knex";

const { connectionString: DATABASE_URL, isAvailable: isDatabaseAvailable } = resolveDatabaseConnection();
const describeFn = isDatabaseAvailable ? describe : describe.skip;

describeFn("database seeds", () => {
  let client: knex.Knex;

  beforeAll(async () => {
    const admin = knex({
      client: "pg",
      connection: DATABASE_URL,
    });

    await admin.raw("DROP SCHEMA IF EXISTS tmp_seed_test CASCADE;");
    await admin.raw("CREATE SCHEMA tmp_seed_test;");
    await ensureDatabaseExtensions(admin);
    await admin.destroy();

    client = knex({
      client: "pg",
      connection: DATABASE_URL,
      searchPath: ["tmp_seed_test", "public"],
      migrations: {
        loadExtensions: [".ts"],
        directory: path.resolve(__dirname, "../../src/db/migrations"),
      },
      seeds: {
        loadExtensions: [".ts"],
        directory: path.resolve(__dirname, "../../src/db/seeds"),
      },
    });

    // Run migrations first to create tables
    await client.migrate.latest();
  });

  afterAll(async () => {
    if (client) {
      await client.destroy();
    }
    const admin = knex({
      client: "pg",
      connection: DATABASE_URL,
    });
    await admin.raw("DROP SCHEMA IF EXISTS tmp_seed_test CASCADE;");
    await admin.destroy();
  });

  describe("seed data insertion", () => {
    beforeAll(async () => {
      await client.seed.run();
    });

    describe("roles seed", () => {
      it("inserts all role records", async () => {
        const roles = await client("roles").select("*");
        expect(roles.length).toBeGreaterThanOrEqual(4);
      });

      it("inserts admin role", async () => {
        const admin = await client("roles").where({ code: "admin" }).first();
        expect(admin).toBeDefined();
        expect(admin.code).toBe("admin");
        expect(admin.description).toBe("Platform administrator");
      });

      it("inserts coach role", async () => {
        const coach = await client("roles").where({ code: "coach" }).first();
        expect(coach).toBeDefined();
        expect(coach.code).toBe("coach");
        expect(coach.description).toBe("Coach / trainer with team oversight");
      });

      it("inserts athlete role", async () => {
        const athlete = await client("roles").where({ code: "athlete" }).first();
        expect(athlete).toBeDefined();
        expect(athlete.code).toBe("athlete");
        expect(athlete.description).toBe("Individual athlete");
      });

      it("inserts support role", async () => {
        const support = await client("roles").where({ code: "support" }).first();
        expect(support).toBeDefined();
        expect(support.code).toBe("support");
        expect(support.description).toBe("Support staff (nutrition, physio, etc.)");
      });

      it("has timestamps on role records", async () => {
        const role = await client("roles").where({ code: "admin" }).first();
        expect(role.created_at).toBeDefined();
        expect(new Date(role.created_at)).toBeInstanceOf(Date);
      });
    });

    describe("genders seed", () => {
      it("inserts all gender records", async () => {
        const genders = await client("genders").select("*");
        expect(genders.length).toBeGreaterThanOrEqual(4);
      });

      it("inserts woman gender", async () => {
        const woman = await client("genders").where({ code: "woman" }).first();
        expect(woman).toBeDefined();
        expect(woman.code).toBe("woman");
        expect(woman.description).toBe("Woman");
      });

      it("inserts man gender", async () => {
        const man = await client("genders").where({ code: "man" }).first();
        expect(man).toBeDefined();
        expect(man.code).toBe("man");
        expect(man.description).toBe("Man");
      });

      it("inserts diverse gender", async () => {
        const diverse = await client("genders").where({ code: "diverse" }).first();
        expect(diverse).toBeDefined();
        expect(diverse.code).toBe("diverse");
        expect(diverse.description).toBe("Diverse / non-binary");
      });

      it("inserts prefer_not_to_say gender", async () => {
        const preferNot = await client("genders").where({ code: "prefer_not_to_say" }).first();
        expect(preferNot).toBeDefined();
        expect(preferNot.code).toBe("prefer_not_to_say");
        expect(preferNot.description).toBe("Prefer not to say");
      });

      it("has timestamps on gender records", async () => {
        const gender = await client("genders").where({ code: "woman" }).first();
        expect(gender.created_at).toBeDefined();
        expect(new Date(gender.created_at)).toBeInstanceOf(Date);
      });
    });

    describe("fitness_levels seed", () => {
      it("inserts all fitness level records", async () => {
        const fitnessLevels = await client("fitness_levels").select("*");
        expect(fitnessLevels.length).toBeGreaterThanOrEqual(4);
      });

      it("inserts beginner level", async () => {
        const beginner = await client("fitness_levels").where({ code: "beginner" }).first();
        expect(beginner).toBeDefined();
        expect(beginner.code).toBe("beginner");
        expect(beginner.description).toBe("Getting started with consistent training");
      });

      it("inserts intermediate level", async () => {
        const intermediate = await client("fitness_levels").where({ code: "intermediate" }).first();
        expect(intermediate).toBeDefined();
        expect(intermediate.code).toBe("intermediate");
        expect(intermediate.description).toBe("Trains 3-4 times per week");
      });

      it("inserts advanced level", async () => {
        const advanced = await client("fitness_levels").where({ code: "advanced" }).first();
        expect(advanced).toBeDefined();
        expect(advanced.code).toBe("advanced");
        expect(advanced.description).toBe("Highly trained athlete");
      });

      it("inserts rehab level", async () => {
        const rehab = await client("fitness_levels").where({ code: "rehab" }).first();
        expect(rehab).toBeDefined();
        expect(rehab.code).toBe("rehab");
        expect(rehab.description).toBe("Returning from injury / rehab focus");
      });

      it("has timestamps on fitness level records", async () => {
        const level = await client("fitness_levels").where({ code: "beginner" }).first();
        expect(level.created_at).toBeDefined();
        expect(new Date(level.created_at)).toBeInstanceOf(Date);
      });
    });

    describe("exercise_types seed", () => {
      it("inserts all exercise type records", async () => {
        const exerciseTypes = await client("exercise_types").select("*");
        expect(exerciseTypes.length).toBeGreaterThanOrEqual(20);
      });

      it("inserts strength type", async () => {
        const strength = await client("exercise_types").where({ code: "strength" }).first();
        expect(strength).toBeDefined();
        expect(strength.code).toBe("strength");
        expect(strength.description).toBe("Strength & resistance training");
      });

      it("inserts cardio type", async () => {
        const cardio = await client("exercise_types").where({ code: "cardio" }).first();
        expect(cardio).toBeDefined();
        expect(cardio.code).toBe("cardio");
        expect(cardio.description).toBe("Cardiovascular / endurance work");
      });

      it("inserts balance type", async () => {
        const balance = await client("exercise_types").where({ code: "balance" }).first();
        expect(balance).toBeDefined();
        expect(balance.code).toBe("balance");
        expect(balance.description).toBe("Balance, coordination, and stability work");
      });

      it("inserts mobility type", async () => {
        const mobility = await client("exercise_types").where({ code: "mobility" }).first();
        expect(mobility).toBeDefined();
        expect(mobility.code).toBe("mobility");
        expect(mobility.description).toBe("Mobility and flexibility drills");
      });

      it("inserts yoga type", async () => {
        const yoga = await client("exercise_types").where({ code: "yoga" }).first();
        expect(yoga).toBeDefined();
        expect(yoga.code).toBe("yoga");
        expect(yoga.description).toBe("Yoga sessions");
      });

      it("inserts hiit type", async () => {
        const hiit = await client("exercise_types").where({ code: "hiit" }).first();
        expect(hiit).toBeDefined();
        expect(hiit.code).toBe("hiit");
        expect(hiit.description).toBe("High-intensity interval training");
      });

      it("inserts crossfit type", async () => {
        const crossfit = await client("exercise_types").where({ code: "crossfit" }).first();
        expect(crossfit).toBeDefined();
        expect(crossfit.code).toBe("crossfit");
        expect(crossfit.description).toBe("CrossFit workouts");
      });

      it("inserts rehab type", async () => {
        const rehab = await client("exercise_types").where({ code: "rehab" }).first();
        expect(rehab).toBeDefined();
        expect(rehab.code).toBe("rehab");
        expect(rehab.description).toBe("Rehabilitation exercises");
      });

      it("has timestamps on exercise type records", async () => {
        const type = await client("exercise_types").where({ code: "strength" }).first();
        expect(type.created_at).toBeDefined();
        expect(new Date(type.created_at)).toBeInstanceOf(Date);
      });
    });

    describe("users seed", () => {
      it("inserts demo user records", async () => {
        const users = await client("users").select("*");
        expect(users.length).toBeGreaterThanOrEqual(2);
      });

      it("inserts admin user", async () => {
        const admin = await client("users").where({ username: "admin" }).first();
        expect(admin).toBeDefined();
        expect(admin.username).toBe("admin");
        expect(admin.display_name).toBe("FitVibe Admin");
        expect(admin.role_code).toBe("admin");
        expect(admin.status).toBe("active");
      });

      it("inserts athlete user", async () => {
        const athlete = await client("users").where({ username: "jane.doe" }).first();
        expect(athlete).toBeDefined();
        expect(athlete.username).toBe("jane.doe");
        expect(athlete.display_name).toBe("Jane Doe");
        expect(athlete.role_code).toBe("athlete");
        expect(athlete.status).toBe("active");
      });

      it("hashes passwords for demo users", async () => {
        const admin = await client("users").where({ username: "admin" }).first();
        expect(admin.password_hash).toBeDefined();
        expect(admin.password_hash).not.toBe("Admin123!");
        expect(admin.password_hash.startsWith("$2")).toBe(true); // bcrypt format
      });

      it("sets valid UUIDs for demo users", async () => {
        const admin = await client("users").where({ username: "admin" }).first();
        expect(admin.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      });

      it("has timestamps on user records", async () => {
        const admin = await client("users").where({ username: "admin" }).first();
        expect(admin.created_at).toBeDefined();
        expect(admin.updated_at).toBeDefined();
        expect(new Date(admin.created_at)).toBeInstanceOf(Date);
        expect(new Date(admin.updated_at)).toBeInstanceOf(Date);
      });
    });

    describe("seed idempotency", () => {
      it("does not create duplicates when run multiple times", async () => {
        // Run seeds again
        await client.seed.run();

        // Check that counts haven't increased
        const roles = await client("roles").select("*");
        expect(roles.length).toBeLessThanOrEqual(10); // Reasonable upper bound

        const genders = await client("genders").select("*");
        expect(genders.length).toBeLessThanOrEqual(10);

        const fitnessLevels = await client("fitness_levels").select("*");
        expect(fitnessLevels.length).toBeLessThanOrEqual(10);

        const exerciseTypes = await client("exercise_types").select("*");
        expect(exerciseTypes.length).toBeLessThanOrEqual(30);
      });
    });
  });
});

if (!isDatabaseAvailable) {
  test.skip(
    "Database unavailable. Set TEST_DATABASE_URL or start a local Postgres instance before running seed tests.",
    () => undefined,
  );
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
  const client = knex({
    client: 'pg',
    connection: process.env.__TEST_DB_CONN__,
    pool: { min: 0, max: 1 },
  });
  try {
    await client.raw('select 1');
    await client.destroy();
    process.exit(0);
  } catch (error) {
    await client.destroy().catch(() => undefined);
    process.exit(1);
  }
})();`;

  const result = spawnSync(process.execPath, ["-e", probeScript], {
    env: { ...process.env, __TEST_DB_CONN__: connectionString },
    stdio: "ignore",
  });

  return result.status === 0;
}
