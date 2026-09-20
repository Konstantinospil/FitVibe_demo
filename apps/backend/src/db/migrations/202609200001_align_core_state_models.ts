import type { Knex } from "knex";

const USER_STATUS_CONSTRAINT = "users_status_check";
const PLAN_STATUS_CONSTRAINT = "plans_status_check";
const POINTS_SOURCE_UNIQUE_INDEX = "user_points_source_unique_idx";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS ${USER_STATUS_CONSTRAINT}
  `);

  await knex("users").where({ status: "archived" }).update({
    status: "suspended",
    updated_at: knex.fn.now(),
  });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT ${USER_STATUS_CONSTRAINT}
    CHECK (status IN (
      'active',
      'pending_verification',
      'pending_deletion',
      'suspended',
      'banned',
      'deleted'
    ))
  `);

  await knex("plans").where({ status: "archived" }).update({
    status: "active",
    archived_at: knex.raw("COALESCE(archived_at, updated_at, now())"),
    updated_at: knex.fn.now(),
  });

  await knex.raw(`
    ALTER TABLE plans
    DROP CONSTRAINT IF EXISTS ${PLAN_STATUS_CONSTRAINT}
  `);
  await knex.raw(`
    ALTER TABLE plans
    ADD CONSTRAINT ${PLAN_STATUS_CONSTRAINT}
    CHECK (status IN ('active', 'completed'))
  `);

  await knex.raw(`DROP INDEX IF EXISTS ${POINTS_SOURCE_UNIQUE_INDEX}`);

  await knex.raw(`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, source_type, source_id
          ORDER BY created_at ASC, id ASC
        ) AS row_num
      FROM user_points
      WHERE source_id IS NOT NULL
    )
    DELETE FROM user_points
    WHERE id IN (
      SELECT id
      FROM ranked
      WHERE row_num > 1
    )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX ${POINTS_SOURCE_UNIQUE_INDEX}
    ON user_points (user_id, source_type, source_id)
    WHERE source_id IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ${POINTS_SOURCE_UNIQUE_INDEX}`);
  await knex.raw(`
    CREATE INDEX ${POINTS_SOURCE_UNIQUE_INDEX}
    ON user_points (user_id, source_type, source_id)
    WHERE source_id IS NOT NULL
  `);

  await knex.raw(`
    ALTER TABLE plans
    DROP CONSTRAINT IF EXISTS ${PLAN_STATUS_CONSTRAINT}
  `);

  await knex.raw(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS ${USER_STATUS_CONSTRAINT}
  `);
  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT ${USER_STATUS_CONSTRAINT}
    CHECK (status IN (
      'active',
      'pending_verification',
      'pending_deletion',
      'suspended',
      'banned',
      'deleted'
    ))
  `);
}
