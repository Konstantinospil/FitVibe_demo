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

const DEFAULT_ERROR_MESSAGE = "An error occurred";

function extractAxiosMessage(error: Error): string | undefined {
  if (!("response" in error) || typeof error.response !== "object" || error.response === null) {
    return undefined;
  }

  const axiosError = error as {
    response?: {
      data?: {
        error?: string | { message?: string; code?: string };
        message?: string;
      };
    };
  };
  const data = axiosError.response?.data;
  const errorData = data?.error;

  if (typeof errorData === "string" && errorData) {
    return errorData;
  }
  if (typeof errorData === "object" && errorData?.message) {
    return errorData.message;
  }
  if (typeof data?.message === "string" && data.message) {
    return data.message;
  }

  return undefined;
}

function resolveTranslatedFallback(
  t: ((key: string) => string) | undefined,
  i18nKey: string | undefined,
  fallback: string | undefined,
): string {
  if (t && i18nKey) {
    const translated = t(i18nKey);
    if (translated && translated !== i18nKey) {
      return translated;
    }
  }
  return fallback || DEFAULT_ERROR_MESSAGE;
}

/**
 * Gets a user-friendly error message from an error object or a provided fallback.
 *
 * @param error - The error object (Error, AxiosError, or unknown)
 * @param i18nKey - The i18n translation key for the error message
 * @param fallback - Fallback message if no error message is available
 * @param logError - Whether to log the error to console (default: true)
 * @returns User-friendly error message string
 */
export function getErrorMessage(
  error: unknown,
  i18nKey?: string,
  fallback: string = DEFAULT_ERROR_MESSAGE,
  logError: boolean = true,
): string {
  if (logError && error) {
    console.error("Error occurred:", error);
  }

  if (error instanceof Error) {
    const axiosMessage = extractAxiosMessage(error);
    if (axiosMessage) {
      return axiosMessage;
    }
    if (error.message) {
      return error.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback || DEFAULT_ERROR_MESSAGE;
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
  i18nKey?: string,
  fallback: string = DEFAULT_ERROR_MESSAGE,
  logError: boolean = true,
): string {
  if (logError && error) {
    console.error("Error occurred:", error);
  }

  if (error instanceof Error) {
    const axiosMessage = extractAxiosMessage(error);
    if (axiosMessage) {
      return axiosMessage;
    }
    if (error.message) {
      return error.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return resolveTranslatedFallback(t, i18nKey, fallback);
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
  const { t } = useTranslation();
  return getErrorMessageSync(error, t, i18nKey, fallback, logError);
}
