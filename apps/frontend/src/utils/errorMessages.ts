import { useTranslation } from "react-i18next";

/**
 * Centralized error message utility for consistent error handling across the application.
 * Provides fallback mechanisms and proper error type handling.
 */

export interface ErrorMessageOptions {
  i18nKey: string;
  fallback: string;
  logError?: boolean;
  error?: unknown;
}

/**
 * Gets a user-friendly error message from an error object or i18n translation.
 *
 * @param error - The error object (Error, AxiosError, or unknown)
 * @param i18nKey - The i18n translation key for the error message
 * @param fallback - Fallback message if translation is not available
 * @param logError - Whether to log the error to console (default: true)
 * @returns User-friendly error message string
 */
export function getErrorMessage(
  error: unknown,
  i18nKey: string,
  fallback: string,
  logError: boolean = true,
): string {
  // Log error for debugging if enabled
  if (logError && error) {
    console.error("Error occurred:", error);
  }

  // Handle Error instances
  if (error instanceof Error) {
    // Check if it's an Axios error with response data
    if ("response" in error && typeof error.response === "object" && error.response !== null) {
      const axiosError = error as {
        response?: { data?: { error?: string | { message?: string; code?: string } } };
      };
      const errorData = axiosError.response?.data?.error;

      if (typeof errorData === "string") {
        return errorData;
      }
      if (typeof errorData === "object" && errorData?.message) {
        return errorData.message;
      }
    }

    // Use error message if available
    if (error.message) {
      return error.message;
    }
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Fallback to i18n or provided fallback
  // Note: This function should be called within a component that has access to useTranslation
  // For non-component contexts, use getErrorMessageSync
  return fallback;
}

/**
 * Synchronous version of getErrorMessage that doesn't require i18n hook.
 * Use this in non-component contexts or when you have direct access to translation function.
 *
 * @param error - The error object
 * @param t - Translation function from i18next
 * @param i18nKey - The i18n translation key
 * @param fallback - Fallback message
 * @param logError - Whether to log the error (default: true)
 * @returns User-friendly error message string
 */
export function getErrorMessageSync(
  error: unknown,
  t: (key: string) => string,
  i18nKey: string,
  fallback: string,
  logError: boolean = true,
): string {
  // Log error for debugging if enabled
  if (logError && error) {
    console.error("Error occurred:", error);
  }

  // Handle Error instances
  if (error instanceof Error) {
    // Check if it's an Axios error with response data
    if ("response" in error && typeof error.response === "object" && error.response !== null) {
      const axiosError = error as {
        response?: { data?: { error?: string | { message?: string; code?: string } } };
      };
      const errorData = axiosError.response?.data?.error;

      if (typeof errorData === "string") {
        return errorData;
      }
      if (typeof errorData === "object" && errorData?.message) {
        return errorData.message;
      }
    }

    // Use error message if available
    if (error.message) {
      return error.message;
    }
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Try i18n translation, fallback to provided fallback
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : fallback;
}

/**
 * React hook version that uses useTranslation internally.
 * Use this in React components for convenience.
 *
 * @param error - The error object
 * @param i18nKey - The i18n translation key
 * @param fallback - Fallback message
 * @param logError - Whether to log the error (default: true)
 * @returns User-friendly error message string
 */
export function useErrorMessage(
  error: unknown,
  i18nKey: string,
  fallback: string,
  logError: boolean = true,
): string {
  const { t } = useTranslation("common");
  return getErrorMessageSync(error, t, i18nKey, fallback, logError);
}
