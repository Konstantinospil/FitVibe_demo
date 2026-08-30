# Installing PostgreSQL on macOS (Without Homebrew)

## Option 1: Postgres.app (Easiest - Recommended)

Postgres.app is the simplest way to run PostgreSQL on macOS:

1. **Download Postgres.app:**
   - Visit: https://postgresapp.com/
   - Download the latest version
   - Drag it to your Applications folder

2. **Start PostgreSQL:**
   - Open Postgres.app from Applications
   - Click "Initialize" to create a new server
   - The server will start automatically on port 5432

3. **Add to PATH (optional but recommended):**

   ```bash
   # Add this to your ~/.zshrc file:
   export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

   # Then reload:
   source ~/.zshrc
   ```

4. **Create the database:**
   ```bash
   createdb fitvibe
   ```

## Option 2: Official PostgreSQL Installer

1. **Download:**
   - Visit: https://www.postgresql.org/download/macosx/
   - Download the latest version installer (.dmg file)

2. **Install:**
   - Open the downloaded .dmg file
   - Run the installer package
   - Follow the installation wizard
   - **Important:** Note the password you set for the `postgres` user
   - Choose port 5432 (default)

3. **Add to PATH:**

   ```bash
   # Add to ~/.zshrc:
   export PATH="/Library/PostgreSQL/16/bin:$PATH"
   # (Adjust version number if different)

   # Reload:
   source ~/.zshrc
   ```

4. **Start PostgreSQL:**

   ```bash
   # Start the service
   sudo launchctl load -w /Library/LaunchDaemons/com.edb.launchd.postgresql-*.plist
   ```

5. **Create database and user:**

   ```bash
   # Connect as postgres user
   psql -U postgres

   # In psql, run:
   CREATE USER fitvibe WITH PASSWORD 'fitvibe';
   CREATE DATABASE fitvibe OWNER fitvibe;
   GRANT ALL PRIVILEGES ON DATABASE fitvibe TO fitvibe;
   \q
   ```

## Option 3: Docker (Just for PostgreSQL)

If you prefer to use Docker just for the database:

```bash
docker run --name fitvibe-postgres \
  -e POSTGRES_USER=fitvibe \
  -e POSTGRES_PASSWORD=fitvibe \
  -e POSTGRES_DB=fitvibe \
  -p 5432:5432 \
  -d postgres:16-alpine

# To start it later:
docker start fitvibe-postgres

# To stop it:
docker stop fitvibe-postgres
```

## Verify Installation

After installation, verify PostgreSQL is running:

```bash
pg_isready -h localhost -p 5432
```

You should see: `localhost:5432 - accepting connections`

## Next Steps

Once PostgreSQL is installed and running, you can:

1. Run migrations:

   ```bash
   pnpm --filter @fitvibe/backend run db:migrate
   ```

2. Start the application:
   ```bash
   ./scripts/run-local.sh
   # or
   pnpm dev
   ```
