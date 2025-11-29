import type { Knex } from "knex";
import { jest } from "@jest/globals";
import { seed as seedRoles } from "../001_roles.js";
import { seed as seedGenders } from "../002_genders.js";
import { seed as seedFitnessLevels } from "../003_fitness_levels.js";
import { seed as seedExerciseTypes } from "../004_exercise_types.js";
import { seed as seedUsers } from "../005_users.js";
import { seed as seedProfiles } from "../Demo Data/006_profiles.js";
import { seed as seedUserContacts } from "../Demo Data/007_user_contacts.js";
import { seed as seedUserMetrics } from "../Demo Data/008_user_metrics.js";
import { seed as seedExercises } from "../Demo Data/009_exercises.js";
import { seed as seedSessions } from "../Demo Data/010_sessions.js";
import { seed as seedSessionExercises } from "../Demo Data/011_session_exercises.js";
import { seed as seedPlannedAttributes } from "../Demo Data/012_planned_exercise_attributes.js";
import { seed as seedActualAttributes } from "../Demo Data/013_actual_exercise_attributes.js";
import { seed as seedUserPoints } from "../Demo Data/014_user_points.js";
import { seed as seedBadges } from "../Demo Data/015_badges.js";
import { seed as seedFollowers } from "../Demo Data/016_followers.js";
import { seed as seedMedia } from "../Demo Data/017_media.js";
import { seed as seedTranslationCache } from "../Demo Data/018_translation_cache.js";
import { seed as seedExerciseSets } from "../Demo Data/019_exercise_sets.js";
import { seed as seedPlans } from "../Demo Data/020_plans.js";
import bcrypt from "bcryptjs";

jest.mock("bcryptjs", () => ({
  hash: jest.fn((value: string) => Promise.resolve(`hashed-${value}`)),
}));

type InsertChain = {
  insert: jest.Mock;
  onConflict: jest.Mock;
  ignore: jest.Mock;
  merge: jest.Mock;
};

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";

function createInsertChain(): InsertChain {
  const chain: InsertChain = {
    insert: jest.fn(),
    onConflict: jest.fn(),
    ignore: jest.fn(),
    merge: jest.fn(),
  };
  chain.insert.mockReturnValue(chain);
  chain.onConflict.mockReturnValue(chain);
  chain.ignore.mockResolvedValue(undefined);
  chain.merge.mockResolvedValue(undefined);
  return chain;
}

function createKnexMock() {
  const chains = new Map<string, InsertChain>();
  const knexSpy = jest.fn((table: string) => {
    if (!chains.has(table)) {
      chains.set(table, createInsertChain());
    }
    return chains.get(table)!;
  });
  const rawMock = jest.fn().mockResolvedValue(undefined);
  const schemaMock = {
    hasTable: jest.fn().mockResolvedValue(false),
  };
  const knex = Object.assign(knexSpy, {
    raw: rawMock,
    schema: schemaMock,
  }) as unknown as Knex;

  return {
    knex,
    knexSpy,
    rawMock,
    schemaMock,
    getChain: (table: string): InsertChain => {
      const chain = chains.get(table);
      if (!chain) {
        throw new Error(`No insert chain recorded for table ${table}`);
      }
      return chain;
    },
  };
}

interface SeedTestCase {
  name: string;
  seedFn: (knex: Knex) => Promise<void>;
  table: string;
  conflict: string | string[];
  strategy: "ignore" | "merge";
  sampleMatcher?: Record<string, unknown>;
  rawCalls?: string[];
  assertInsert?: (rows: unknown[]) => void;
}

describe("database seed modules", () => {
  const seedCases: SeedTestCase[] = [
    {
      name: "roles",
      seedFn: seedRoles,
      table: "roles",
      conflict: "code",
      strategy: "ignore",
      sampleMatcher: { code: "admin" },
    },
    {
      name: "genders",
      seedFn: seedGenders,
      table: "genders",
      conflict: "code",
      strategy: "ignore",
      sampleMatcher: { code: "woman" },
    },
    {
      name: "fitness levels",
      seedFn: seedFitnessLevels,
      table: "fitness_levels",
      conflict: "code",
      strategy: "ignore",
      sampleMatcher: { code: "intermediate" },
    },
    {
      name: "exercise types",
      seedFn: seedExerciseTypes,
      table: "exercise_types",
      conflict: "code",
      strategy: "ignore",
      sampleMatcher: { code: "strength" },
    },
    {
      name: "users",
      seedFn: seedUsers,
      table: "users",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { id: ADMIN_ID },
      assertInsert: (rows) => {
        const hashMock = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
        expect(hashMock).toHaveBeenNthCalledWith(1, "Admin123!", 12);
        expect(hashMock).toHaveBeenNthCalledWith(2, "Athlete123!", 12);
        const row = (rows as Array<{ id?: string; password_hash?: string }>).find(
          (entry) => entry.id === ADMIN_ID,
        ) as {
          password_hash: string;
        };
        expect(row.password_hash).toBe("hashed-Admin123!");
      },
    },
    {
      name: "profiles",
      seedFn: seedProfiles,
      table: "profiles",
      conflict: "user_id",
      strategy: "merge",
      sampleMatcher: { gender_code: "woman" },
    },
    {
      name: "user_contacts",
      seedFn: seedUserContacts,
      table: "user_contacts",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { type: "email" },
    },
    {
      name: "user_metrics",
      seedFn: seedUserMetrics,
      table: "user_metrics",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { unit: "kg" },
    },
    {
      name: "exercises",
      seedFn: seedExercises,
      table: "exercises",
      conflict: "id",
      strategy: "ignore",
      assertInsert: (rows) => {
        const compound = (rows as Array<{ id: string; tags?: string }>).find(
          (entry) => entry.id === "77777777-7777-7777-7777-777777777777",
        ) as { tags: string };
        expect(typeof compound.tags).toBe("string");
        expect(JSON.parse(compound.tags)).toContain("compound");
      },
    },
    {
      name: "sessions",
      seedFn: seedSessions,
      table: "sessions",
      conflict: ["id", "planned_at"],
      strategy: "ignore",
      rawCalls: ["SELECT public.ensure_monthly_partitions();"],
    },
    {
      name: "session_exercises",
      seedFn: seedSessionExercises,
      table: "session_exercises",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { order_index: 1 },
    },
    {
      name: "planned attribute rows",
      seedFn: seedPlannedAttributes,
      table: "planned_exercise_attributes",
      conflict: "session_exercise_id",
      strategy: "merge",
      sampleMatcher: { rest: "00:03:00" },
    },
    {
      name: "actual attribute rows",
      seedFn: seedActualAttributes,
      table: "actual_exercise_attributes",
      conflict: "session_exercise_id",
      strategy: "merge",
      sampleMatcher: { duration: "00:38:45" },
    },
    {
      name: "user_points",
      seedFn: seedUserPoints,
      table: "user_points",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { source_type: "session_completed" },
    },
    {
      name: "followers",
      seedFn: seedFollowers,
      table: "followers",
      conflict: ["follower_id", "following_id"],
      strategy: "ignore",
      sampleMatcher: { follower_id: ADMIN_ID },
    },
    {
      name: "media",
      seedFn: seedMedia,
      table: "media",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { media_type: "photo" },
    },
    {
      name: "translation cache",
      seedFn: seedTranslationCache,
      table: "translation_cache",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { lang: "de" },
    },
    {
      name: "exercise sets",
      seedFn: seedExerciseSets,
      table: "exercise_sets",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { order_index: 1 },
    },
    {
      name: "plans",
      seedFn: seedPlans,
      table: "plans",
      conflict: "id",
      strategy: "ignore",
      sampleMatcher: { name: "Autumn Marathon Build" },
    },
  ];

  it.each(seedCases)(
    "inserts data for %s",
    async ({ seedFn, table, conflict, strategy, sampleMatcher, rawCalls, assertInsert }) => {
      const { knex, knexSpy, rawMock, schemaMock, getChain } = createKnexMock();

      // For the profiles seed, mock hasTable to return true for "profiles"
      if (table === "profiles") {
        schemaMock.hasTable.mockResolvedValue(true);
      }

      await seedFn(knex);

      expect(knexSpy).toHaveBeenCalledWith(table);
      const chain = getChain(table);
      expect(chain.insert).toHaveBeenCalled();
      expect(chain.onConflict).toHaveBeenCalledWith(conflict);
      if (strategy === "ignore") {
        expect(chain.ignore).toHaveBeenCalled();
        expect(chain.merge).not.toHaveBeenCalled();
      } else {
        expect(chain.merge).toHaveBeenCalled();
        expect(chain.ignore).not.toHaveBeenCalled();
      }

      const insertedRows = chain.insert.mock.calls[0][0] as unknown[];
      expect(Array.isArray(insertedRows)).toBe(true);
      if (sampleMatcher) {
        expect(insertedRows).toEqual(
          expect.arrayContaining([expect.objectContaining(sampleMatcher)]),
        );
      }
      assertInsert?.(insertedRows);

      rawCalls?.forEach((sql) => {
        expect(rawMock).toHaveBeenCalledWith(sql);
      });
    },
  );

  it("seeds badge catalog and user badges with correct strategies", async () => {
    const { knex, getChain } = createKnexMock();

    await seedBadges(knex);

    const catalogChain = getChain("badge_catalog");
    expect(catalogChain.insert).toHaveBeenCalled();
    expect(catalogChain.onConflict).toHaveBeenCalledWith("code");
    expect(catalogChain.merge).toHaveBeenCalled();

    const badgesChain = getChain("badges");
    expect(badgesChain.insert).toHaveBeenCalled();
    expect(badgesChain.onConflict).toHaveBeenCalledWith("id");
    expect(badgesChain.ignore).toHaveBeenCalled();
    const insertedBadges = badgesChain.insert.mock.calls[0][0];
    expect(insertedBadges[0]).toHaveProperty("metadata");
  });
});
