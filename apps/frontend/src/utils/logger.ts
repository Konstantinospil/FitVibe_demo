/**
 * Frontend logging utility
 *
 * Provides structured logging with support for different log levels
 * and environment-specific behavior.
 *
 * In production, errors can be sent to a monitoring service (e.g., Sentry)
 * while reducing console noise.
 */

/* eslint-disable no-console */

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context ?? "");
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context ?? "");
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context ?? "");
  }

  /**
   * Log errors
   * In production, this should send to a monitoring service
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof Error) {
      errorContext.errorMessage = error.message;
      errorContext.errorStack = error.stack;
    } else if (error) {
      errorContext.error = error;
    }

    console.error(`[ERROR] ${message}`, errorContext);

    // In production, send to monitoring service
    // Example: Sentry.captureException(error, { extra: errorContext });
  }

  /**
   * Log API errors with request details
   */
  apiError(message: string, error: unknown, endpoint?: string, method?: string): void {
    const context: LogContext = {};

    if (endpoint) {
      context.endpoint = endpoint;
    }
    if (method) {
      context.method = method;
    }

    // Extract axios error details
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: { status?: number; data?: unknown };
        config?: { url?: string; method?: string };
      };

      if (axiosError.response) {
        context.status = axiosError.response.status;
        context.responseData = axiosError.response.data;
      }

      if (axiosError.config) {
        context.url = axiosError.config.url;
        context.requestMethod = axiosError.config.method;
      }
    }

    this.error(message, error as Error, context);
  }
}

// Export singleton instance
export const logger = new Logger();
