import type { Knex } from "knex";

const FITNESS_LEVELS = [
  { code: "beginner", description: "Getting started with consistent training" },
  { code: "intermediate", description: "Trains 3-4 times per week" },
  { code: "advanced", description: "Highly trained athlete" },
  { code: "elite", description: "Lives every story at a high level" },
  { code: "rehab", description: "Returning from injury / rehab focus" },
];

export async function seed(knex: Knex): Promise<void> {
  await knex("fitness_levels").insert(FITNESS_LEVELS).onConflict("code").merge(["description"]);
}
