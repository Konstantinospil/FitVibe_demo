import type { Knex } from "knex";

const BIO_ATTRIBUTE_KEY_UNIQUE = "bio_attributes_normalized_key_unique";
const PERF_ATTRIBUTE_KEY_UNIQUE = "perf_attributes_normalized_key_unique";
const BIO_VALUE_INDEX = "bio_attribute_values_user_attr_created_idx";
const PERF_VALUE_INDEX = "perf_attribute_values_user_attr_created_idx";
const BIO_SELECTION_PK = "bio_attribute_selections_pk";
const PERF_SELECTION_PK = "perf_attribute_selections_pk";
const BIO_MEASUREMENT_SYSTEM_CHECK = "bio_attributes_system_check";
const PERF_MEASUREMENT_SYSTEM_CHECK = "perf_attributes_system_check";
const BIO_UNIT_TYPE_CHECK = "bio_attributes_unit_type_check";
const PERF_UNIT_TYPE_CHECK = "perf_attributes_unit_type_check";

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

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("bio_attributes", (table) => {
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
      .inTable("bio_attributes")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .uuid("derived_from_b_id")
      .nullable()
      .references("id")
      .inTable("bio_attributes")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("derived_operator").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deactivated_at", { useTz: true }).nullable();
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

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

  await knex.schema.createTable("perf_attributes", (table) => {
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
      .inTable("perf_attributes")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .uuid("derived_from_b_id")
      .nullable()
      .references("id")
      .inTable("perf_attributes")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("derived_operator").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deactivated_at", { useTz: true }).nullable();
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

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
    ADD CONSTRAINT ${BIO_MEASUREMENT_SYSTEM_CHECK}
    CHECK (measurement_system IN ('metric', 'imperial'))
  `);
  await knex.raw(`
    ALTER TABLE perf_attributes
    ADD CONSTRAINT ${PERF_MEASUREMENT_SYSTEM_CHECK}
    CHECK (measurement_system IN ('metric', 'imperial'))
  `);
  await knex.raw(`
    ALTER TABLE bio_attributes
    ADD CONSTRAINT ${BIO_UNIT_TYPE_CHECK}
    CHECK (unit_type IN ('${UNIT_TYPES.join("','")}'))
  `);
  await knex.raw(`
    ALTER TABLE perf_attributes
    ADD CONSTRAINT ${PERF_UNIT_TYPE_CHECK}
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

  await knex("bio_attributes").insert([
    {
      key: "weight_kg",
      normalized_key: "weight",
      label: "Weight",
      unit_type: "weight",
      granularity: "kg",
      measurement_system: "metric",
      min_value_metric: 20,
      max_value_metric: 400,
      min_value_imperial: 44.09,
      max_value_imperial: 881.85,
      is_default: true,
    },
    {
      key: "body_fat_pct",
      normalized_key: "body fat",
      label: "Body fat",
      unit_type: "percentage",
      granularity: "pct",
      measurement_system: "metric",
      min_value_metric: 2,
      max_value_metric: 70,
      min_value_imperial: 2,
      max_value_imperial: 70,
      is_default: true,
    },
    {
      key: "bone_weight_kg",
      normalized_key: "bone weight",
      label: "Bone weight",
      unit_type: "weight",
      granularity: "kg",
      measurement_system: "metric",
      min_value_metric: 1,
      max_value_metric: 10,
      min_value_imperial: 2.2,
      max_value_imperial: 22.05,
      is_default: true,
    },
    {
      key: "body_water_pct",
      normalized_key: "body water",
      label: "Body water",
      unit_type: "percentage",
      granularity: "pct",
      measurement_system: "metric",
      min_value_metric: 30,
      max_value_metric: 80,
      min_value_imperial: 30,
      max_value_imperial: 80,
      is_default: true,
    },
    {
      key: "height_cm",
      normalized_key: "height",
      label: "Height",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 120,
      max_value_metric: 230,
      min_value_imperial: 47.24,
      max_value_imperial: 90.55,
      is_default: true,
    },
    {
      key: "chest_circumference_cm",
      normalized_key: "chest circumference",
      label: "Chest circumference",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 50,
      max_value_metric: 160,
      min_value_imperial: 19.69,
      max_value_imperial: 62.99,
      is_default: true,
    },
    {
      key: "waist_circumference_cm",
      normalized_key: "waist circumference",
      label: "Waist circumference",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 40,
      max_value_metric: 160,
      min_value_imperial: 15.75,
      max_value_imperial: 62.99,
      is_default: true,
    },
    {
      key: "hip_circumference_cm",
      normalized_key: "hip circumference",
      label: "Hip circumference",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 50,
      max_value_metric: 180,
      min_value_imperial: 19.69,
      max_value_imperial: 70.87,
      is_default: true,
    },
    {
      key: "bicep_circumference_cm",
      normalized_key: "bicep circumference",
      label: "Bicep circumference",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 15,
      max_value_metric: 80,
      min_value_imperial: 5.91,
      max_value_imperial: 31.5,
      is_default: true,
    },
    {
      key: "thigh_circumference_cm",
      normalized_key: "thigh circumference",
      label: "Thigh circumference",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 30,
      max_value_metric: 120,
      min_value_imperial: 11.81,
      max_value_imperial: 47.24,
      is_default: true,
    },
    {
      key: "calf_circumference_cm",
      normalized_key: "calf circumference",
      label: "Calf circumference",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 20,
      max_value_metric: 80,
      min_value_imperial: 7.87,
      max_value_imperial: 31.5,
      is_default: true,
    },
  ]);

  await knex("perf_attributes").insert([
    {
      key: "vo2_max",
      normalized_key: "vo2 max",
      label: "VO2 Max",
      unit_type: "ratio",
      granularity: "ml/kg/min",
      measurement_system: "metric",
      min_value_metric: 10,
      max_value_metric: 90,
      min_value_imperial: 10,
      max_value_imperial: 90,
      is_default: true,
    },
    {
      key: "ftp_watts",
      normalized_key: "functional threshold power",
      label: "Functional Threshold Power",
      unit_type: "power",
      granularity: "W",
      measurement_system: "metric",
      min_value_metric: 50,
      max_value_metric: 600,
      min_value_imperial: 50,
      max_value_imperial: 600,
      is_default: true,
    },
    {
      key: "run_12min_m",
      normalized_key: "12-minute run",
      label: "12-minute run",
      unit_type: "length",
      granularity: "m",
      measurement_system: "metric",
      min_value_metric: 1000,
      max_value_metric: 4000,
      min_value_imperial: 3280.84,
      max_value_imperial: 13123.36,
      is_default: true,
    },
    {
      key: "dash_100m_sec",
      normalized_key: "100m dash",
      label: "100m dash",
      unit_type: "time",
      granularity: "sec",
      measurement_system: "metric",
      min_value_metric: 9,
      max_value_metric: 30,
      min_value_imperial: 9,
      max_value_imperial: 30,
      is_default: true,
    },
    {
      key: "pushups_1min",
      normalized_key: "max push-ups in a minute",
      label: "Max push-ups in a minute",
      unit_type: "count",
      granularity: "reps",
      measurement_system: "metric",
      min_value_metric: 0,
      max_value_metric: 200,
      min_value_imperial: 0,
      max_value_imperial: 200,
      is_default: true,
    },
    {
      key: "chest_press_1rm_kg",
      normalized_key: "1rm chest press",
      label: "1RM chest press",
      unit_type: "weight",
      granularity: "kg",
      measurement_system: "metric",
      min_value_metric: 5,
      max_value_metric: 300,
      min_value_imperial: 11.02,
      max_value_imperial: 661.39,
      is_default: true,
    },
    {
      key: "squat_1rm_kg",
      normalized_key: "1rm squat",
      label: "1RM squat",
      unit_type: "weight",
      granularity: "kg",
      measurement_system: "metric",
      min_value_metric: 5,
      max_value_metric: 400,
      min_value_imperial: 11.02,
      max_value_imperial: 881.85,
      is_default: true,
    },
    {
      key: "deadlift_1rm_kg",
      normalized_key: "1rm deadlift",
      label: "1RM deadlift",
      unit_type: "weight",
      granularity: "kg",
      measurement_system: "metric",
      min_value_metric: 5,
      max_value_metric: 450,
      min_value_imperial: 11.02,
      max_value_imperial: 992.08,
      is_default: true,
    },
    {
      key: "shoulder_press_1rm_kg",
      normalized_key: "1rm shoulder press",
      label: "1RM shoulder press",
      unit_type: "weight",
      granularity: "kg",
      measurement_system: "metric",
      min_value_metric: 5,
      max_value_metric: 200,
      min_value_imperial: 11.02,
      max_value_imperial: 440.92,
      is_default: true,
    },
    {
      key: "vertical_jump_cm",
      normalized_key: "vertical jump",
      label: "Vertical jump",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 10,
      max_value_metric: 120,
      min_value_imperial: 3.94,
      max_value_imperial: 47.24,
      is_default: true,
    },
    {
      key: "horizontal_jump_cm",
      normalized_key: "horizontal jump",
      label: "Horizontal jump",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: 50,
      max_value_metric: 400,
      min_value_imperial: 19.69,
      max_value_imperial: 157.48,
      is_default: true,
    },
    {
      key: "sit_and_reach_cm",
      normalized_key: "sit-and-reach distance",
      label: "Sit-and-reach distance",
      unit_type: "length",
      granularity: "cm",
      measurement_system: "metric",
      min_value_metric: -20,
      max_value_metric: 50,
      min_value_imperial: -7.87,
      max_value_imperial: 19.69,
      is_default: true,
    },
  ]);

  const translationRows = [
    { key: "weight_kg", label: "Weight" },
    { key: "body_fat_pct", label: "Body fat" },
    { key: "bone_weight_kg", label: "Bone weight" },
    { key: "body_water_pct", label: "Body water" },
    { key: "height_cm", label: "Height" },
    { key: "chest_circumference_cm", label: "Chest circumference" },
    { key: "waist_circumference_cm", label: "Waist circumference" },
    { key: "hip_circumference_cm", label: "Hip circumference" },
    { key: "bicep_circumference_cm", label: "Bicep circumference" },
    { key: "thigh_circumference_cm", label: "Thigh circumference" },
    { key: "calf_circumference_cm", label: "Calf circumference" },
    { key: "vo2_max", label: "VO2 Max" },
    { key: "ftp_watts", label: "Functional Threshold Power" },
    { key: "run_12min_m", label: "12-minute run" },
    { key: "dash_100m_sec", label: "100m dash" },
    { key: "pushups_1min", label: "Max push-ups in a minute" },
    { key: "chest_press_1rm_kg", label: "1RM chest press" },
    { key: "squat_1rm_kg", label: "1RM squat" },
    { key: "deadlift_1rm_kg", label: "1RM deadlift" },
    { key: "shoulder_press_1rm_kg", label: "1RM shoulder press" },
    { key: "vertical_jump_cm", label: "Vertical jump" },
    { key: "horizontal_jump_cm", label: "Horizontal jump" },
    { key: "sit_and_reach_cm", label: "Sit-and-reach distance" },
  ];

  await knex("translations").insert(
    translationRows.map((row) => ({
      namespace: "user_attributes",
      key_path: `user_attributes.${row.key}`,
      language: "en",
      value: row.label,
    })),
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("perf_attribute_selections");
  await knex.schema.dropTableIfExists("perf_attribute_values");
  await knex.schema.dropTableIfExists("perf_attributes");
  await knex.schema.dropTableIfExists("bio_attribute_selections");
  await knex.schema.dropTableIfExists("bio_attribute_values");
  await knex.schema.dropTableIfExists("bio_attributes");
}
