import { z } from "zod";

export const passwordPolicy = z
  .string()
  .min(12, "passwordMinLength")
  .max(128)
  .regex(/(?=.*[a-z])/, "passwordLowercase")
  .regex(/(?=.*[A-Z])/, "passwordUppercase")
  .regex(/(?=.*\d)/, "passwordDigit")
  .regex(/(?=.*[^\w\s])/, "passwordSymbol");

export const RegisterSchema = z
  .object({
    email: z.string().email(),
    username: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_\-.]+$/, "usernameFormat"),
    password: passwordPolicy,
    profile: z
      .object({
        display_name: z.string().min(1).max(100).optional(),
        sex: z.enum(["man", "woman", "diverse", "na"]).optional(),
        weight_kg: z.number().min(20).max(500).optional(),
        fitness_level: z.string().max(50).optional(),
        age: z.number().min(13).max(120).optional(),
      })
      .optional(),
    terms_accepted: z.boolean(),
  })
  .refine((data) => data.terms_accepted === true, {
    message: "TERMS_ACCEPTANCE_REQUIRED",
    path: ["terms_accepted"],
  });

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordPolicy,
});

export const RevokeSessionsSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    revokeAll: z.boolean().optional(),
    revokeOthers: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.sessionId || data.revokeAll || data.revokeOthers), {
    message: "sessionIdRequired",
    path: ["sessionId"],
  })
  .refine((data) => !(data.revokeAll && data.revokeOthers), {
    message: "revokeConflict",
    path: ["revokeAll"],
  });

export const Verify2FALoginSchema = z.object({
  pendingSessionId: z.string().uuid(),
  code: z.string().length(6).regex(/^\d+$/, "Code must be 6 digits"),
});

export const AcceptTermsSchema = z
  .object({
    terms_accepted: z.boolean(),
  })
  .refine((data) => data.terms_accepted === true, {
    message: "TERMS_ACCEPTANCE_REQUIRED",
    path: ["terms_accepted"],
  });

export const AcceptPrivacyPolicySchema = z
  .object({
    privacy_policy_accepted: z.boolean(),
  })
  .refine((data) => data.privacy_policy_accepted === true, {
    message: "PRIVACY_POLICY_ACCEPTANCE_REQUIRED",
    path: ["privacy_policy_accepted"],
  });

export const ResendVerificationSchema = z.object({
  email: z.string().email(),
});
