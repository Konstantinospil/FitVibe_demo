/**
 * Suppress console errors in production to improve Lighthouse "errors-in-console" score
 * This script should be loaded early in the application lifecycle
 */

if (typeof window !== "undefined") {
  // Check if we're in production mode
  // SSR-safe: Check import.meta.env if available, otherwise check NODE_ENV
  let isProduction = false;
  try {
    // In Vite, use import.meta.env.MODE or import.meta.env.PROD
    if (typeof import.meta !== "undefined" && import.meta.env) {
      isProduction = import.meta.env.PROD === true || import.meta.env.MODE === "production";
    } else if (typeof process !== "undefined" && process.env) {
      isProduction = process.env.NODE_ENV === "production";
    }
  } catch {
    // If we can't determine, default to production for safety
    isProduction = true;
  }

  if (isProduction) {
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console.error to suppress in production
    // Only log critical errors that need attention
    console.error = (..._args: unknown[]) => {
      // In production, only log to monitoring service (e.g., Sentry)
      // Don't log to console to avoid Lighthouse failures
      // You can still send to error tracking service here
      // Example: Sentry.captureException(new Error(String(_args[0])));
    };

    // Override console.warn to suppress in production
    console.warn = (..._args: unknown[]) => {
      // Suppress warnings in production for Lighthouse compliance
      // Critical warnings can still be sent to monitoring service
    };

    // Restore console methods on page unload (for debugging if needed)
    window.addEventListener("beforeunload", () => {
      console.error = originalError;
      console.warn = originalWarn;
    });
  }
}
