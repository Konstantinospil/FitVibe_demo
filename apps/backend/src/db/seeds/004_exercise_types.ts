import type { Knex } from "knex";

const EXERCISE_TYPES = [
  { code: "strength", description: "Strength & resistance training" },
  { code: "cardio", description: "Cardiovascular / endurance work" },
  { code: "balance", description: "Balance, coordination, and stability work" },
  { code: "mobility", description: "Mobility and flexibility drills" },
  { code: "skill", description: "Skill technique or sport-specific drills" },
  { code: "recovery", description: "Recovery and regeneration sessions" },
  { code: "endurance", description: "Endurance training" },
  { code: "hiit", description: "High-intensity interval training" },
  { code: "plyometrics", description: "Plyometric exercises" },
  { code: "circuit", description: "Circuit training" },
  { code: "crossfit", description: "CrossFit workouts" },
  { code: "yoga", description: "Yoga sessions" },
  { code: "pilates", description: "Pilates sessions" },
  { code: "functional", description: "Functional training" },
  { code: "bodyweight", description: "Bodyweight exercises" },
  { code: "warmup", description: "Warm-up activities" },
  { code: "cooldown", description: "Cool-down activities" },
  { code: "rehab", description: "Rehabilitation exercises" },
  { code: "sports", description: "Sports-specific training" },
  { code: "other", description: "Other types of exercise" },
  {
    code: "agility",
    description: "Agility, coordination, and movement skill — yield, play, flight",
  },
  {
    code: "explosivity",
    description: "Power, sprints, jumps, and throws — the spark that becomes a leap",
  },
  {
    code: "intelligence",
    description: "Skill, precision, and the inner game — riddles at the edge of the map",
  },
  {
    code: "regeneration",
    description: "Recovery, mobility, and restoration — the sleep that mends the hero",
  },
];

export async function seed(knex: Knex): Promise<void> {
  await knex("exercise_types").insert(EXERCISE_TYPES).onConflict("code").merge(["description"]);
}
