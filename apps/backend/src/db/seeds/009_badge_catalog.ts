import type { Knex } from "knex";
import fs from "node:fs";
import path from "node:path";

interface CatalogBadge {
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  priority: number;
  criteria: Record<string, unknown>;
}

function loadCatalog(): CatalogBadge[] {
  const filePath = path.join(__dirname, "../fixtures/badge-catalog.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as CatalogBadge[];
}

export async function seed(knex: Knex): Promise<void> {
  const catalog = loadCatalog();
  const rows = catalog.map((badge) => ({
    code: badge.code,
    name: badge.name,
    description: badge.description,
    category: badge.category,
    icon: badge.icon,
    priority: badge.priority,
    criteria: badge.criteria,
  }));

  await knex("badge_catalog").insert(rows).onConflict("code").merge();
}
