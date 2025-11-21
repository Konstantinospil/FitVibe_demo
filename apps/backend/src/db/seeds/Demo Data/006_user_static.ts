import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  const rows = [
    {
      user_id: "11111111-1111-1111-1111-111111111111",
      date_of_birth: null,
      gender_code: "prefer_not_to_say",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: "22222222-2222-2222-2222-222222222222",
      date_of_birth: "1994-05-12",
      gender_code: "woman",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  await knex("user_static").insert(rows).onConflict("user_id").merge();
}
