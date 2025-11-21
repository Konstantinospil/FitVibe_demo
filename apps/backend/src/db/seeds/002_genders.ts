import type { Knex } from "knex";

const GENDERS = [
  { code: "woman", description: "Woman" },
  { code: "man", description: "Man" },
  { code: "diverse", description: "Diverse / non-binary" },
  { code: "prefer_not_to_say", description: "Prefer not to say" },
];

export async function seed(knex: Knex): Promise<void> {
  await knex("genders").insert(GENDERS).onConflict("code").ignore();
}
