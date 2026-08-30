import type { Knex } from "knex";

type AttributeRow = { key: string; label: string };

const TRANSLATIONS_TABLE = "translations";
const DEFAULT_LANGUAGE = "en";
const NAMESPACE = "user_attributes";

async function ensureTranslationsForAttributes(knex: Knex, table: string): Promise<void> {
  const rows = (await knex<AttributeRow>(table).select("key", "label")) ?? [];
  for (const row of rows) {
    const keyPath = `${NAMESPACE}.${row.key}`;
    const existing = await knex(TRANSLATIONS_TABLE)
      .where({
        namespace: NAMESPACE,
        key_path: keyPath,
        language: DEFAULT_LANGUAGE,
      })
      .orderBy("deleted_at", "desc")
      .first<{ id: string; deleted_at: string | null }>();

    if (!existing) {
      await knex(TRANSLATIONS_TABLE).insert({
        namespace: NAMESPACE,
        key_path: keyPath,
        language: DEFAULT_LANGUAGE,
        value: row.label,
      });
      continue;
    }

    if (existing.deleted_at) {
      await knex(TRANSLATIONS_TABLE).where({ id: existing.id }).update({
        value: row.label,
        deleted_at: null,
        updated_at: knex.fn.now(),
      });
    }
  }
}

export async function up(knex: Knex): Promise<void> {
  const hasTranslations = await knex.schema.hasTable(TRANSLATIONS_TABLE);
  if (!hasTranslations) {
    return;
  }
  const hasBio = await knex.schema.hasTable("bio_attributes");
  const hasPerf = await knex.schema.hasTable("perf_attributes");
  if (hasBio) {
    await ensureTranslationsForAttributes(knex, "bio_attributes");
  }
  if (hasPerf) {
    await ensureTranslationsForAttributes(knex, "perf_attributes");
  }
}

export function down(_knex: Knex): Promise<void> {
  return Promise.resolve();
}
