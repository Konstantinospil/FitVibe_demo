# Infrastructure Scripts

This directory contains operational scripts for database management, migrations, seeding, and maintenance tasks in the FitVibe infrastructure.

## Scripts Overview

| Script                | Purpose                                       | Usage                                               |
| --------------------- | --------------------------------------------- | --------------------------------------------------- |
| `backup-database.sh`  | Creates a PostgreSQL database backup          | `./infra/scripts/backup-database.sh`                |
| `restore-database.sh` | Restores a database from a backup file        | `./infra/scripts/restore-database.sh <backup-file>` |
| `migrate.sh`          | Runs database migrations                      | `./infra/scripts/migrate.sh`                        |
| `rollback.sh`         | Rolls back the last migration batch           | `./infra/scripts/rollback.sh`                       |
| `seed.sh`             | Seeds the database with production-like data  | `./infra/scripts/seed.sh`                           |
| `seed-dev.sh`         | Seeds the database with development/test data | `./infra/scripts/seed-dev.sh`                       |

## Prerequisites

- PostgreSQL client tools (`psql`, `pg_dump`, `pg_restore`)
- Access to the target database (via `DATABASE_URL` or `PG*` environment variables)
- Appropriate database permissions for the operations

## Environment Variables

These scripts use the same environment variables as the backend application:

- `DATABASE_URL` - Full PostgreSQL connection string
- Or individual `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` variables

## Usage

### Database Backup

```bash
./infra/scripts/backup-database.sh
```

Creates a timestamped backup file in the current directory or a specified backup location. The backup includes:

- Full database schema
- All data
- Custom types and functions
- Materialized view definitions

**Output**: `fitvibe_backup_YYYYMMDD_HHMMSS.sql`

### Database Restore

```bash
./infra/scripts/restore-database.sh fitvibe_backup_20240101_120000.sql
```

**Warning**: This will drop and recreate the database. Use with caution in production.

### Running Migrations

```bash
./infra/scripts/migrate.sh
```

Applies all pending migrations to the database. This script:

- Checks current migration status
- Applies migrations in order
- Records migration history
- Handles errors gracefully

### Rolling Back Migrations

```bash
./infra/scripts/rollback.sh
```

Rolls back the last batch of migrations. Useful for:

- Testing migration rollback procedures
- Reverting problematic migrations
- Development workflow

**Note**: Not all migrations can be safely rolled back. Check migration files for rollback support.

### Seeding Data

#### Development/Test Data

```bash
./infra/scripts/seed-dev.sh
```

Seeds the database with development and test data including:

- Test users with various roles
- Sample exercise types
- Example sessions and plans
- Test data for all modules

#### Production-Like Data

```bash
./infra/scripts/seed.sh
```

Seeds the database with production-like data (sanitized, no PII). Use for:

- Staging environments
- Performance testing
- Demo environments

## Integration with Docker

These scripts can be run inside Docker containers:

```bash
# From host, execute in backend container
docker compose -f infra/docker/dev/compose.dev.yml exec backend bash -c "./infra/scripts/migrate.sh"
```

## Backup Strategy

### Automated Backups

Set up cron jobs or scheduled tasks for regular backups:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/infra/scripts/backup-database.sh
```

### Backup Retention

- **Production**: Retain backups for 30 days minimum
- **Staging**: Retain backups for 7 days
- **Development**: Manual backups as needed

### Backup Storage

Store backups in:

- Secure, encrypted storage
- Separate from database server
- Accessible for disaster recovery
- Compliant with data retention policies

## Safety Considerations

1. **Always backup before migrations** in production
2. **Test migrations in staging** before production deployment
3. **Verify backup integrity** after creation
4. **Document rollback procedures** for each migration
5. **Use transactions** where possible for atomic operations

## Troubleshooting

### Migration Failures

If a migration fails:

1. Check the error message
2. Review the migration file
3. Manually fix the database state if needed
4. Document the issue and resolution
5. Consider creating a fix migration

### Connection Issues

If scripts fail to connect:

1. Verify `DATABASE_URL` or `PG*` environment variables
2. Check network connectivity
3. Verify database is running
4. Confirm user permissions

### Permission Errors

Ensure the database user has:

- `CREATE`, `ALTER`, `DROP` privileges for migrations
- `INSERT`, `UPDATE`, `DELETE` for seeding
- `SELECT` for all operations

## Related Documentation

- [Database Schema Documentation](../apps/backend/src/db/README.md)
- [Infrastructure README](../README.md)
- [Backend README](../../apps/backend/README.md)
