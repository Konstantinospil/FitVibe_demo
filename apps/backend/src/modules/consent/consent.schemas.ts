import { z } from "zod";

/**
 * Schema for saving cookie preferences
 * Essential cookies must always be true (required for functionality)
 */
export const SaveCookiePreferencesSchema = z
  .object({
    essential: z.boolean(),
    preferences: z.boolean(),
    analytics: z.boolean(),
    marketing: z.boolean(),
  })
  .refine((data) => data.essential === true, {
    message: "Essential cookies must be enabled",
    path: ["essential"],
  });
