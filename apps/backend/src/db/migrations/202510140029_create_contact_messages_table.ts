import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("contact_messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("email").notNullable();
    table.string("topic").notNullable();
    table.text("message").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("read_at", { useTz: true }).nullable();
    table
      .uuid("read_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.timestamp("responded_at", { useTz: true }).nullable();
    table.text("response").nullable();

    table.index(["user_id"], "contact_messages_user_id_idx");
    table.index(["email"], "contact_messages_email_idx");
    table.index(["created_at"], "contact_messages_created_at_idx");
    table.index(["read_at"], "contact_messages_read_at_idx");
    table.index(["responded_at"], "contact_messages_responded_at_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("contact_messages");
}
