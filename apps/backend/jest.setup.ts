process.env.NODE_ENV = "test";
process.env.METRICS_ENABLED = process.env.METRICS_ENABLED ?? "false";
process.env.CSRF_ENABLED = process.env.CSRF_ENABLED ?? "false";
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? "http://localhost:5173";
process.env.CSRF_ALLOWED_ORIGINS = process.env.CSRF_ALLOWED_ORIGINS ?? "http://localhost:5173";
process.env.EMAIL_ENABLED = process.env.EMAIL_ENABLED ?? "false";
process.env.CLAMAV_ENABLED = process.env.CLAMAV_ENABLED ?? "false";
process.env.VAULT_ENABLED = process.env.VAULT_ENABLED ?? "false";

jest.setTimeout(1000 * 30);
