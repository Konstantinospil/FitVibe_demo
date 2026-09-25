import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("legal_document_versions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("document_type", 20).notNullable();
    table.string("version", 50).notNullable();
    table.string("change_class", 20).notNullable();
    table.string("user_action", 20).notNullable();
    table.timestamp("effective_at", { useTz: true }).notNullable();
    table.timestamp("published_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid("published_by").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("source", 30).notNullable().defaultTo("backoffice");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["document_type", "version"], "legal_document_versions_type_version_unique");
    table.check("document_type IN ('terms','privacy','cookie')");
    table.check("change_class IN ('legacy','editorial','material')");
    table.check("user_action IN ('none','acknowledge','accept','renew_consent')");
  });

  await knex.schema.createTable("legal_document_snapshots", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("version_id")
      .notNullable()
      .references("id")
      .inTable("legal_document_versions")
      .onDelete("CASCADE");
    table.string("language", 10).notNullable();
    table.jsonb("content").notNullable();
    table.string("content_hash", 64).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["version_id", "language"], "legal_document_snapshots_version_language_unique");
  });

  await knex.schema.createTable("legal_document_acceptances", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table
      .uuid("version_id")
      .notNullable()
      .references("id")
      .inTable("legal_document_versions")
      .onDelete("RESTRICT");
    table.string("action", 20).notNullable();
    table.string("source", 30).notNullable().defaultTo("application");
    table.timestamp("accepted_at", { useTz: true }).notNullable();
    table.timestamp("revoked_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["user_id", "version_id"], "legal_document_acceptances_user_version_unique");
    table.check("action IN ('acknowledge','accept','renew_consent')");
  });

  await knex.schema.alterTable("cookie_consents", (table) => {
    table
      .uuid("legal_version_id")
      .nullable()
      .references("id")
      .inTable("legal_document_versions")
      .onDelete("SET NULL");
  });

  await knex.raw(`
    CREATE INDEX legal_document_versions_current_idx
    ON legal_document_versions (document_type, effective_at DESC, published_at DESC)
  `);
  await knex.raw(`
    CREATE INDEX legal_document_acceptances_user_idx
    ON legal_document_acceptances (user_id, accepted_at DESC)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("cookie_consents", (table) => {
    table.dropColumn("legal_version_id");
  });
  await knex.schema.dropTableIfExists("legal_document_acceptances");
  await knex.schema.dropTableIfExists("legal_document_snapshots");
  await knex.schema.dropTableIfExists("legal_document_versions");
}
