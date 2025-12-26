# FitVibe Backoffice

Admin panel for managing FitVibe application settings, translations, user messages, and user management.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create the admin user:

```bash
node ../../scripts/create-admin-user.mjs
```

3. Start the development server:

```bash
pnpm dev
```

The backoffice will be available at `http://localhost:5174`

## Admin Credentials

- **Username**: administrator1
- **Password**: paS123
- **Email**: admin@fitvibe.local

## Features

### Translations Management

- View all translations
- Search and filter translations by language, namespace, or key
- Create new translations
- Edit existing translations
- Delete translations

### User Messages

- View all contact form messages
- Filter by read/unread status
- Mark messages as read

### User Management

- Search users by username or email
- View user details (status, role, creation date)
- Ban/unlock users
- Suspend/activate users

## Development

The backoffice runs on port 5174 (separate from the main frontend on 5173).

All API calls are proxied to `http://localhost:4000` via Vite's proxy configuration.
