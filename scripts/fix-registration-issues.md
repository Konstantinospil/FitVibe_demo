# Fixing Registration Issues

## "Unable to complete registration" Error

This error (`AUTH_CONFLICT`) means:

- The email address is already registered, OR
- The username is already taken, OR
- An account exists but is not in "pending_verification" status

## Solutions

### 1. If you already have an account:

- **Try logging in instead** - If your email is already registered, use the login page
- **Use password reset** - If you forgot your password, use the "Forgot Password" feature

### 2. If your account is pending verification:

- **Use "Resend Verification Email"** - If you started registration but didn't verify, use the resend feature
- **Check your email** - Look for the verification link (check spam folder too)

### 3. If you need a new account:

- **Use a different email address** - Try with a different email
- **Use a different username** - The username you chose is already taken

### 4. For development/testing:

If you need to clear the database and start fresh:

```bash
# WARNING: This will delete all data
# Only use in development!

# Connect to your database and truncate users table
# Or use a database migration tool to reset
```

## Rate Limiting

If you hit "Verification limit reached":

- **Wait 1 hour** - The limit resets after 1 hour
- **Limit: 3 verification emails per hour per email address**

## Next Steps

1. ✅ Port 4000 is now free - restart your backend
2. Try registering with a different email/username, OR
3. Try logging in if you already have an account
