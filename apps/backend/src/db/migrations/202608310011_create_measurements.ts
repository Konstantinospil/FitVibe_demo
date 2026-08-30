import type { Knex } from "knex";

const BIO_ATTRIBUTE_KEY_UNIQUE = "bio_attributes_normalized_key_unique";
const PERF_ATTRIBUTE_KEY_UNIQUE = "perf_attributes_normalized_key_unique";
const BIO_VALUE_INDEX = "bio_attribute_values_user_attr_created_idx";
const PERF_VALUE_INDEX = "perf_attribute_values_user_attr_created_idx";
const BIO_SELECTION_PK = "bio_attribute_selections_pk";
const PERF_SELECTION_PK = "perf_attribute_selections_pk";
const UNIT_TYPES = [
  "length",
  "weight",
  "volume",
  "ratio",
  "count",
  "time",
  "power",
  "percentage",
] as const;

function createAttributeTable(
  knex: Knex,
  tableName: "bio_attributes" | "perf_attributes",
): Promise<void> {
  return knex.schema.createTable(tableName, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("key").notNullable();
    table.string("normalized_key").notNullable();
    table.string("label").notNullable();
    table.text("description").nullable();
    table.string("unit_type").notNullable();
    table.string("granularity").notNullable();
    table.string("measurement_system").notNullable();
    table.decimal("min_value_metric", 12, 4).nullable();
    table.decimal("max_value_metric", 12, 4).nullable();
    table.decimal("min_value_imperial", 12, 4).nullable();
    table.decimal("max_value_imperial", 12, 4).nullable();
    table.boolean("is_default").notNullable().defaultTo(false);
    table
      .uuid("derived_from_a_id")
      .nullable()
      .references("id")
      .inTable(tableName)
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .uuid("derived_from_b_id")
      .nullable()
      .references("id")
      .inTable(tableName)
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("derived_operator").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deactivated_at", { useTz: true }).nullable();
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function up(knex: Knex): Promise<void> {
  await createAttributeTable(knex, "bio_attributes");
  await knex.schema.createTable("bio_attribute_values", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("attribute_id")
      .notNullable()
      .references("id")
      .inTable("bio_attributes")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.decimal("value_number", 14, 4).notNullable();
    table.timestamp("measured_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deactivated_at", { useTz: true }).nullable();
  });
  await knex.schema.createTable("bio_attribute_selections", (table) => {
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("attribute_id")
      .notNullable()
      .references("id")
      .inTable("bio_attributes")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.boolean("is_visible").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deactivated_at", { useTz: true }).nullable();
    table.primary(["user_id", "attribute_id"], BIO_SELECTION_PK);
  });

  await createAttributeTable(knex, "perf_attributes");
  await knex.schema.createTable("perf_attribute_values", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("attribute_id")
      .notNullable()
      .references("id")
      .inTable("perf_attributes")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.decimal("value_number", 14, 4).notNullable();
    table.timestamp("measured_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deactivated_at", { useTz: true }).nullable();
  });
  await knex.schema.createTable("perf_attribute_selections", (table) => {
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("attribute_id")
      .notNullable()
      .references("id")
      .inTable("perf_attributes")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.boolean("is_visible").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deactivated_at", { useTz: true }).nullable();
    table.primary(["user_id", "attribute_id"], PERF_SELECTION_PK);
  });

  await knex.raw(`
    ALTER TABLE bio_attributes
    ADD CONSTRAINT bio_attributes_system_check
    CHECK (measurement_system IN ('metric', 'imperial'))
  `);
  await knex.raw(`
    ALTER TABLE perf_attributes
    ADD CONSTRAINT perf_attributes_system_check
    CHECK (measurement_system IN ('metric', 'imperial'))
  `);
  await knex.raw(`
    ALTER TABLE bio_attributes
    ADD CONSTRAINT bio_attributes_unit_type_check
    CHECK (unit_type IN ('${UNIT_TYPES.join("','")}'))
  `);
  await knex.raw(`
    ALTER TABLE perf_attributes
    ADD CONSTRAINT perf_attributes_unit_type_check
    CHECK (unit_type IN ('${UNIT_TYPES.join("','")}'))
  `);

  await knex.schema.alterTable("bio_attributes", (table) => {
    table.unique(["normalized_key"], BIO_ATTRIBUTE_KEY_UNIQUE);
  });
  await knex.schema.alterTable("perf_attributes", (table) => {
    table.unique(["normalized_key"], PERF_ATTRIBUTE_KEY_UNIQUE);
  });
  await knex.schema.alterTable("bio_attribute_values", (table) => {
    table.index(["user_id", "attribute_id", "measured_at"], BIO_VALUE_INDEX);
  });
  await knex.schema.alterTable("perf_attribute_values", (table) => {
    table.index(["user_id", "attribute_id", "measured_at"], PERF_VALUE_INDEX);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("perf_attribute_selections");
  await knex.schema.dropTableIfExists("perf_attribute_values");
  await knex.schema.dropTableIfExists("perf_attributes");
  await knex.schema.dropTableIfExists("bio_attribute_selections");
  await knex.schema.dropTableIfExists("bio_attribute_values");
  await knex.schema.dropTableIfExists("bio_attributes");
}
