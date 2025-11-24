# Code Updates Required for Schema Alignment Migrations

This document lists code changes required after running migrations `202511160000` through `202511160002`.

## Table Rename: `user_static` → `profiles`

The following files reference `user_static` and need to be updated to use `profiles`:

### Backend Code Files

1. **`apps/backend/src/modules/users/users.service.ts`** (line 741)
   - Change: `db<UserStaticRow>("user_static")` → `db<ProfileRow>("profiles")`
   - Update type definition if `UserStaticRow` exists

2. **`apps/backend/src/modules/users/dsr.service.ts`** (line 141)
   - Change: `trx("user_static")` → `trx("profiles")`

3. **`apps/backend/src/modules/users/__tests__/dsr.service.test.ts`** (lines 232, 321)
   - Change: `ensureTable("user_static")` → `ensureTable("profiles")`
   - Change: `tables.user_static` → `tables.profiles`

4. **`apps/backend/src/modules/points/points.repository.ts`** (line 255)
   - Change: `exec<UserStaticRow>("user_static")` → `exec<ProfileRow>("profiles")`

5. **`apps/backend/src/db/utils/verifyIntegrity.ts`** (line 11)
   - Change: `"user_static"` → `"profiles"` in table list

6. **`apps/backend/src/db/seeds/__tests__/seed-files.test.ts`** (lines 140, 142)
   - Change: `name: "user_static"` → `name: "profiles"`
   - Change: `table: "user_static"` → `table: "profiles"`

### Type Definitions

7. **Type definitions** - Search for `UserStaticRow` type and:
   - Rename to `ProfileRow` or update to match new schema
   - Add new fields: `alias`, `bio`, `avatar_asset_id`, `visibility`, `timezone`, `unit_preferences`

### Database Schema Files

8. **`apps/backend/src/db/schema/fitvibe_schema.sql`** (line 41)
   - Update schema dump to reflect `profiles` table name and new columns

## Column Already Renamed: `exercises.owner` → `exercises.owner_id`

The column `exercises.owner` was already renamed to `exercises.owner_id` in migration `202510180001`.
No code changes needed - all references already use `owner_id`.

## New Profile Fields

After migration `202511160000`, the `profiles` table includes new fields:

- `alias` (citext, unique, nullable)
- `bio` (text, max 500 chars)
- `avatar_asset_id` (uuid, FK to media_assets)
- `visibility` (text, CHECK constraint)
- `timezone` (text)
- `unit_preferences` (jsonb)

Update any code that reads/writes profile data to handle these new fields.

## Migration Order

1. Run migration `202511160000` (enhances user_static → profiles)
2. Run migration `202511160001` (ensures exercises.owner_id, idempotent)
3. Run migration `202511160002` (adds FK for avatar_asset_id, conditional)
4. Update code references listed above
5. Update type definitions
6. Test all user/profile-related functionality

## Testing Checklist

- [ ] User registration creates profile record
- [ ] Profile queries work with new table name
- [ ] DSR (Data Subject Rights) deletion works
- [ ] Points/leaderboard queries work
- [ ] Seed data loads correctly
- [ ] Integration tests pass
