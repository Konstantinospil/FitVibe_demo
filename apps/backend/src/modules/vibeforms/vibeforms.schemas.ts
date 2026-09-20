import { z } from "zod";
import { VIBEFORM_BODY_PROFILES, VIBEFORM_TEMPLATE_VERSIONS } from "./vibeforms.types.js";

const templateCodes = Object.keys(VIBEFORM_TEMPLATE_VERSIONS) as [
  keyof typeof VIBEFORM_TEMPLATE_VERSIONS,
];

export const UpdateVibeformPreferencesSchema = z
  .object({
    templateCode: z.enum(templateCodes).optional(),
    bodyProfile: z.enum(VIBEFORM_BODY_PROFILES).optional(),
    motionEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one Vibeform preference is required",
  });
