import type { Knex } from "knex";
import fs from "node:fs";
import path from "node:path";

interface CatalogExercise {
  id: string;
  name: string;
  type_code: string;
  muscle_group: string;
  equipment: string;
  tags: string[];
  description: string;
}

function loadCatalog(): CatalogExercise[] {
  const filePath = path.join(__dirname, "../fixtures/global-exercises.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as CatalogExercise[];
}

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();
  const catalog = loadCatalog();
  const rows = catalog.map((exercise) => ({
    id: exercise.id,
    owner_id: null,
    name: exercise.name,
    type_code: exercise.type_code,
    muscle_group: exercise.muscle_group,
    equipment: exercise.equipment,
    tags: JSON.stringify(exercise.tags),
    is_public: true,
    description: exercise.description,
    created_at: now,
    updated_at: now,
    archived_at: null,
  }));

  await knex("exercises").insert(rows).onConflict("id").ignore();
}
