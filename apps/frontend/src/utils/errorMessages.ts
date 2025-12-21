import type { TFunction } from "i18next";
import type { AxiosError } from "axios";

export function getErrorMessageSync(
  error: unknown,
  t: TFunction,
  fallbackKey?: string,
  fallbackMessage?: string,
): string {
  if (error instanceof Error) {
    if ((error as AxiosError).response?.data) {
      const data = (error as AxiosError).response?.data as {
        error?: { message?: string };
        message?: string;
      };
      return (
        data.error?.message ||
        data.message ||
        error.message ||
        fallbackMessage ||
        "An error occurred"
      );
    }
    return error.message || fallbackMessage || "An error occurred";
  }
  if (typeof error === "string") {
    return error;
  }
  return fallbackMessage || t(fallbackKey || "common.error") || "An error occurred";
}

export function getErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey?: string,
  fallbackMessage?: string,
): string {
  return getErrorMessageSync(error, t, fallbackKey, fallbackMessage);
}
