import type { Knex } from "knex";

const ATTRIBUTE_VALUE_CHECK = "user_attribute_values_value_check";
const ATTRIBUTE_TYPE_CHECK = "user_attributes_value_type_check";
const ATTRIBUTE_KEY_UNIQUE = "user_attributes_key_unique";
const ATTRIBUTE_VALUES_INDEX = "user_attribute_values_user_attr_created_idx";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("user_attributes", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("key").notNullable();
    table.string("label").notNullable();
    table.string("unit").nullable();
    table.string("value_type").notNullable();
    table.decimal("min_value", 10, 2).nullable();
    table.decimal("max_value", 10, 2).nullable();
    table.integer("min_length").nullable();
    table.integer("max_length").nullable();
    table.date("min_date").nullable();
    table.date("max_date").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("user_attribute_values", (table) => {
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
      .inTable("user_attributes")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.decimal("value_number", 12, 2).nullable();
    table.text("value_text").nullable();
    table.date("value_date").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE user_attributes
    ADD CONSTRAINT ${ATTRIBUTE_TYPE_CHECK}
    CHECK (value_type IN ('number', 'text', 'date'))
  `);

  await knex.raw(`
    ALTER TABLE user_attribute_values
    ADD CONSTRAINT ${ATTRIBUTE_VALUE_CHECK}
    CHECK (
      (value_number IS NOT NULL)::int +
      (value_text IS NOT NULL)::int +
      (value_date IS NOT NULL)::int = 1
    )
  `);

  await knex.schema.alterTable("user_attributes", (table) => {
    table.unique(["key"], ATTRIBUTE_KEY_UNIQUE);
  });

  await knex.schema.alterTable("user_attribute_values", (table) => {
    table.index(["user_id", "attribute_id", "created_at"], ATTRIBUTE_VALUES_INDEX);
  });

  await knex("user_attributes").insert([
    {
      key: "weight_kg",
      label: "Weight",
      unit: "kg",
      value_type: "number",
      min_value: 20,
      max_value: 400,
    },
    {
      key: "body_fat_pct",
      label: "Body fat",
      unit: "%",
      value_type: "number",
      min_value: 2,
      max_value: 70,
    },
    {
      key: "bone_weight_kg",
      label: "Bone weight",
      unit: "kg",
      value_type: "number",
      min_value: 1,
      max_value: 10,
    },
    {
      key: "body_water_pct",
      label: "Body water",
      unit: "%",
      value_type: "number",
      min_value: 30,
      max_value: 80,
    },
    {
      key: "height_cm",
      label: "Height",
      unit: "cm",
      value_type: "number",
      min_value: 120,
      max_value: 230,
    },
    {
      key: "chest_circumference_cm",
      label: "Chest circumference",
      unit: "cm",
      value_type: "number",
      min_value: 50,
      max_value: 160,
    },
    {
      key: "hip_circumference_cm",
      label: "Hip circumference",
      unit: "cm",
      value_type: "number",
      min_value: 50,
      max_value: 180,
    },
    {
      key: "waist_circumference_cm",
      label: "Waist circumference",
      unit: "cm",
      value_type: "number",
      min_value: 40,
      max_value: 160,
    },
    {
      key: "bicep_circumference_cm",
      label: "Bicep circumference",
      unit: "cm",
      value_type: "number",
      min_value: 15,
      max_value: 80,
    },
    {
      key: "thigh_circumference_cm",
      label: "Thigh circumference",
      unit: "cm",
      value_type: "number",
      min_value: 30,
      max_value: 120,
    },
    {
      key: "calf_circumference_cm",
      label: "Calf circumference",
      unit: "cm",
      value_type: "number",
      min_value: 20,
      max_value: 80,
    },
    {
      key: "vo2_max",
      label: "VO2 Max",
      unit: "ml/kg/min",
      value_type: "number",
      min_value: 10,
      max_value: 90,
    },
    {
      key: "ftp_watts",
      label: "Functional Threshold Power",
      unit: "W",
      value_type: "number",
      min_value: 50,
      max_value: 600,
    },
    {
      key: "run_12min_m",
      label: "12-minute run",
      unit: "m",
      value_type: "number",
      min_value: 1000,
      max_value: 4000,
    },
    {
      key: "dash_100m_sec",
      label: "100m dash",
      unit: "sec",
      value_type: "number",
      min_value: 9,
      max_value: 30,
    },
    {
      key: "pushups_1min",
      label: "Max push-ups in a minute",
      unit: "reps",
      value_type: "number",
      min_value: 0,
      max_value: 200,
    },
    {
      key: "chest_press_1rm_kg",
      label: "1RM chest press",
      unit: "kg",
      value_type: "number",
      min_value: 5,
      max_value: 300,
    },
    {
      key: "squat_1rm_kg",
      label: "1RM squat",
      unit: "kg",
      value_type: "number",
      min_value: 5,
      max_value: 400,
    },
    {
      key: "deadlift_1rm_kg",
      label: "1RM deadlift",
      unit: "kg",
      value_type: "number",
      min_value: 5,
      max_value: 450,
    },
    {
      key: "shoulder_press_1rm_kg",
      label: "1RM shoulder press",
      unit: "kg",
      value_type: "number",
      min_value: 5,
      max_value: 200,
    },
    {
      key: "vertical_jump_cm",
      label: "Vertical jump",
      unit: "cm",
      value_type: "number",
      min_value: 10,
      max_value: 120,
    },
    {
      key: "horizontal_jump_cm",
      label: "Horizontal jump",
      unit: "cm",
      value_type: "number",
      min_value: 50,
      max_value: 400,
    },
    {
      key: "sit_and_reach_cm",
      label: "Sit-and-reach distance",
      unit: "cm",
      value_type: "number",
      min_value: -20,
      max_value: 50,
    },
    {
      key: "biography",
      label: "Biography",
      value_type: "text",
      min_length: 0,
      max_length: 500,
    },
    {
      key: "motto",
      label: "Motto",
      value_type: "text",
      min_length: 0,
      max_length: 140,
    },
    {
      key: "display_name",
      label: "Display name",
      value_type: "text",
      min_length: 1,
      max_length: 120,
    },
    {
      key: "full_name",
      label: "Full name",
      value_type: "text",
      min_length: 1,
      max_length: 120,
    },
    {
      key: "date_of_birth",
      label: "Date of birth",
      value_type: "date",
      min_date: "1900-01-01",
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_attribute_values");
  await knex.schema.dropTableIfExists("user_attributes");
}
