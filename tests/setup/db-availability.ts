import { spawnSync } from "node:child_process";
import { describe, it } from "@jest/globals";

type AvailabilityResult = { connectionString: string; isAvailable: boolean };

const dbAvailability: AvailabilityResult = resolveDatabaseConnection();

export const testDatabaseAvailable = dbAvailability.isAvailable;
export const testDatabaseConnectionString = dbAvailability.connectionString;

const SKIP_REASON =
  "Test database unavailable. Set TEST_DATABASE_URL or start Postgres (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE).";

if (process.env.CI && !testDatabaseAvailable) {
  throw new Error(`Test database is unavailable in CI. ${SKIP_REASON}`);
}

if (!testDatabaseAvailable) {
  console.warn(`\n⚠️  ${SKIP_REASON}\n`);
}

/** Skip the suite locally when Postgres is down. In CI the import above already threw. */
export const describeWithTestDatabase = testDatabaseAvailable ? describe : describe.skip;

/** Per-test variant of {@link describeWithTestDatabase}. Prefer suite-level skip. */
export const itWithTestDatabase = testDatabaseAvailable ? it : it.skip;

function resolveDatabaseConnection(): AvailabilityResult {
  const candidates = collectConnectionCandidates();
  for (const candidate of candidates) {
    const isAvailable = checkDatabaseAvailability(candidate);
    if (isAvailable) {
      return { connectionString: candidate, isAvailable: true };
    }
  }
  return { connectionString: candidates[0] ?? "", isAvailable: false };
}

function collectConnectionCandidates(): string[] {
  const user = encodeURIComponent(process.env.PGUSER ?? "fitvibe");
  const password = encodeURIComponent(process.env.PGPASSWORD ?? "fitvibe");
  const database = process.env.PGDATABASE ?? "fitvibe_test";
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

  const timeout = process.env.CI ? 8000 : 5000;
  const acquireTimeout = process.env.CI ? 5000 : 2000;

  const probeScript = `
const knex = require('knex');
(async () => {
  let client;
  try {
    client = knex({
      client: 'pg',
      connection: process.env.__TEST_DB_CONN__,
      pool: { min: 0, max: 1 },
      acquireConnectionTimeout: ${acquireTimeout},
    });

    const timeout = setTimeout(() => {
      if (client) {
        client.destroy().catch(() => undefined);
      }
      process.exit(1);
    }, ${process.env.CI ? 6000 : 3000});

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
    timeout,
    killSignal: "SIGTERM",
  });

  if (result.signal) {
    return false;
  }

  return result.status === 0;
}
