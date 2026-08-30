import type { Knex } from "knex";

const AUDIT_TABLE = "audit_log";
const SEVERITY_INDEX = "idx_audit_log_severity_recent";
const RESOLVED_INDEX = "idx_audit_log_resolved_recent";

export async function up(knex: Knex): Promise<void> {
  const hasSeverity = await knex.schema.hasColumn(AUDIT_TABLE, "severity");
  const hasResolvedAt = await knex.schema.hasColumn(AUDIT_TABLE, "resolved_at");
  const hasResolvedBy = await knex.schema.hasColumn(AUDIT_TABLE, "resolved_by_user_id");

  await knex.schema.alterTable(AUDIT_TABLE, (table) => {
    if (!hasSeverity) {
      table.string("severity").notNullable().defaultTo("info");
    }
    if (!hasResolvedAt) {
      table.timestamp("resolved_at", { useTz: true }).nullable();
    }
    if (!hasResolvedBy) {
      table
        .uuid("resolved_by_user_id")
        .nullable()
        .references("id")
        .inTable("users")
        .onUpdate("CASCADE")
        .onDelete("SET NULL");
    }
  });

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${SEVERITY_INDEX}
    ON ${AUDIT_TABLE} (severity, created_at DESC)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${RESOLVED_INDEX}
    ON ${AUDIT_TABLE} (resolved_at, created_at DESC)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ${SEVERITY_INDEX}`);
  await knex.raw(`DROP INDEX IF EXISTS ${RESOLVED_INDEX}`);

  const hasSeverity = await knex.schema.hasColumn(AUDIT_TABLE, "severity");
  const hasResolvedAt = await knex.schema.hasColumn(AUDIT_TABLE, "resolved_at");
  const hasResolvedBy = await knex.schema.hasColumn(AUDIT_TABLE, "resolved_by_user_id");

  await knex.schema.alterTable(AUDIT_TABLE, (table) => {
    if (hasResolvedBy) {
      table.dropColumn("resolved_by_user_id");
    }
    if (hasResolvedAt) {
      table.dropColumn("resolved_at");
    }
    if (hasSeverity) {
      table.dropColumn("severity");
    }
  });
}
