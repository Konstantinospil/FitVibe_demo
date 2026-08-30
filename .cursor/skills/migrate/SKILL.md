---
name: migrate
description: Create or apply Knex PostgreSQL migrations in apps/backend/src/db/migrations. Use when the user types /migrate or asks to add or run a database migration.
disable-model-invocation: true
---

# Database migration

New file: `apps/backend/src/db/migrations/YYYYMMDDHHMM_description.ts` (`date -u +"%Y%m%d%H%M"`). Both `up` and `down`. Never edit a migration that already ran.

Apply: `pnpm --filter @fitvibe/backend db:migrate`

Update `docs/2.Technical_Design_Document/2c.Technical_Design_Document_Data.md` if the schema changed.
