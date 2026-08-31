import type { Knex } from "knex";
import bcrypt from "bcryptjs";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const ATHLETE_ID = "22222222-2222-2222-2222-222222222222";
const ADMIN_CONTACT_ID = "33333333-3333-3333-3333-333333333333";
const ATHLETE_CONTACT_ID = "44444444-4444-4444-4444-444444444444";

const DOMAIN_CODES = [
  "strength",
  "agility",
  "endurance",
  "explosivity",
  "intelligence",
  "regeneration",
] as const;

const INITIAL_VIBE_LEVEL = 1000.0;
const INITIAL_RD = 350.0;
const INITIAL_VOLATILITY = 0.06;

export async function seed(knex: Knex): Promise<void> {
  const [adminPassword, athletePassword] = await Promise.all([
    bcrypt.hash("Admin123!", 12),
    bcrypt.hash("Athlete123!", 12),
  ]);

  const now = new Date();
  const users = [
    {
      id: ADMIN_ID,
      display_name: "FitVibe Admin",
      locale: "en-US",
      preferred_lang: "en",
      status: "active",
      role_code: "admin",
      password_hash: adminPassword,
      created_at: now,
      updated_at: now,
    },
    {
      id: ATHLETE_ID,
      display_name: "Jane Doe",
      locale: "en-GB",
      preferred_lang: "en",
      status: "active",
      role_code: "athlete",
      password_hash: athletePassword,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("users").insert(users).onConflict("id").ignore();

  const contacts = [
    {
      id: ADMIN_CONTACT_ID,
      user_id: ADMIN_ID,
      type: "email",
      value: "admin@fitvibe.local",
      is_primary: true,
      is_recovery: true,
      is_verified: true,
      verified_at: now,
      created_at: now,
    },
    {
      id: ATHLETE_CONTACT_ID,
      user_id: ATHLETE_ID,
      type: "email",
      value: "jane.doe@example.com",
      is_primary: true,
      is_recovery: false,
      is_verified: true,
      verified_at: now,
      created_at: now,
    },
  ];

  await knex("user_contacts").insert(contacts).onConflict("id").ignore();

  const profiles = [
    {
      user_id: ADMIN_ID,
      alias: "admin",
      alias_changed_at: null,
      visibility: "private",
      created_at: now,
      updated_at: now,
    },
    {
      user_id: ATHLETE_ID,
      alias: "jane.doe",
      alias_changed_at: null,
      visibility: "private",
      created_at: now,
      updated_at: now,
    },
  ];

  await knex("profiles").insert(profiles).onConflict("user_id").ignore();

  const vibeRows = [ADMIN_ID, ATHLETE_ID].flatMap((userId) =>
    DOMAIN_CODES.map((domainCode) => ({
      user_id: userId,
      domain_code: domainCode,
      vibe_level: INITIAL_VIBE_LEVEL,
      rating_deviation: INITIAL_RD,
      volatility: INITIAL_VOLATILITY,
      last_updated_at: now,
      created_at: now,
      updated_at: now,
    })),
  );

  await knex("user_domain_vibe_levels")
    .insert(vibeRows)
    .onConflict(["user_id", "domain_code"])
    .ignore();
}
