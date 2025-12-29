import type { Knex } from "knex";

const UNIQUE_ALIAS_INDEX = "profiles_alias_unique_idx";
const ALIAS_INDEX = "idx_profiles_alias";

export async function up(knex: Knex): Promise<void> {
  const hasAlias = await knex.schema.hasColumn("profiles", "alias");
  if (!hasAlias) {
    await knex.schema.alterTable("profiles", (table) => {
      table.specificType("alias", "citext").nullable().comment("Public profile alias/username");
    });
  }

  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${UNIQUE_ALIAS_INDEX} ON profiles(alias) WHERE alias IS NOT NULL;`,
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS ${ALIAS_INDEX} ON profiles(alias) WHERE alias IS NOT NULL;`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ${ALIAS_INDEX};`);
  await knex.raw(`DROP INDEX IF EXISTS ${UNIQUE_ALIAS_INDEX};`);

  const hasAlias = await knex.schema.hasColumn("profiles", "alias");
  if (hasAlias) {
    await knex.schema.alterTable("profiles", (table) => {
      table.dropColumn("alias");
    });
  }
}
