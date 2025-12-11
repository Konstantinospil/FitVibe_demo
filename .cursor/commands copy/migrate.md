---
name: migrate
description: Create or run database migrations using Knex.js
invokable: true
---

Work with database migrations following FitVibe database conventions.

## Commands

1. **Create Migration**
   - Use: `pnpm --filter backend knex migrate:make <migration_name>`
   - Location: `app/backend/migrations/`
   - Naming: descriptive, timestamped automatically

2. **Migration Guidelines**
   - Use snake_case for table and column names
   - Add indexes for foreign keys and frequently queried columns
   - Use UUIDv7/ULID for identifiers
   - Partition large tables (sessions, audit_log)
   - Use GIN/JSONB indexes for semi-structured data
   - Add NOT NULL constraints where appropriate
   - Include rollback logic in `down()` function

3. **Run Migrations**
   - Development: `pnpm --filter backend knex migrate:latest`
   - Production: Use migration scripts in `infra/scripts/migrate.sh`

4. **Best Practices**
   - Never modify existing migrations (create new ones)
   - Test migrations up and down
   - Include data migrations if needed
   - Document breaking changes
   - Update TDD data design section

5. **Common Patterns**
   - Create tables with proper constraints
   - Add foreign key relationships
   - Create indexes for performance
   - Add materialized views for analytics
   - Partition tables for large datasets

## Example Migration

```typescript
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("user_sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable();
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.timestamp("planned_date").notNullable();
    table.timestamp("completed_at");
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index("user_id");
    table.index("planned_date");
    table.index(["user_id", "planned_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("user_sessions");
}
```

## Best Practices

- **Never modify existing migrations** - Create new migrations for changes
- **Test migrations** - Test both `up()` and `down()` functions
- **Include rollback logic** - Always implement `down()` function
- **Document breaking changes** - Note any schema changes that affect existing data
- **Update TDD** - Update data design section in TDD when schema changes
- **Use transactions** - Wrap data migrations in transactions when possible
