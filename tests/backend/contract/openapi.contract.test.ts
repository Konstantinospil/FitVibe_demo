import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import { ZodEffects } from "zod";
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ResendVerificationSchema,
  Verify2FALoginSchema,
} from "../../../apps/backend/src/modules/auth/auth.schemas.js";
import { CreateSessionSchema } from "../../../apps/backend/src/modules/sessions/sessions.controller.js";
import { ReportFeedItemSchema } from "../../../apps/backend/src/modules/feed/feed.schemas.js";
import {
  UpdateProfileSchema,
  CreateUserSchema,
} from "../../../apps/backend/src/modules/users/users.controller.js";
import { CreateExerciseTypeSchema } from "../../../apps/backend/src/modules/exercise-types/exerciseTypes.controller.js";
import openApiSpec from "../../../apps/backend/openapi/openapi.json";

type SchemaMapEntry = {
  name: string;
  schema: ZodTypeAny;
};

const CONTRACT_SCHEMAS: SchemaMapEntry[] = [
  { name: "RegisterRequest", schema: RegisterSchema },
  { name: "LoginRequest", schema: LoginSchema },
  { name: "ForgotPasswordRequest", schema: ForgotPasswordSchema },
  { name: "ResetPasswordRequest", schema: ResetPasswordSchema },
  { name: "ResendVerificationRequest", schema: ResendVerificationSchema },
  { name: "Verify2FALoginRequest", schema: Verify2FALoginSchema },
  { name: "SessionCreateRequest", schema: CreateSessionSchema },
  { name: "ReportFeedItemRequest", schema: ReportFeedItemSchema },
  { name: "UpdateProfileRequest", schema: UpdateProfileSchema },
  { name: "CreateUserRequest", schema: CreateUserSchema },
  { name: "CreateExerciseTypeRequest", schema: CreateExerciseTypeSchema },
];

type JsonSchemaObject = {
  properties?: Record<string, any>;
  required?: string[];
};

function extractSchemaFromZod(entry: SchemaMapEntry): JsonSchemaObject {
  // Unwrap ZodEffects (from .refine(), .superRefine(), etc.) to get the inner schema
  // zodToJsonSchema should handle this, but we'll unwrap manually to ensure properties are extracted
  let schemaToConvert = entry.schema;
  // Check if this is a ZodEffects wrapper by looking at _def.typeName
  if (
    (schemaToConvert as any)._def?.typeName === "ZodEffects" &&
    (schemaToConvert as any)._def?.schema
  ) {
    schemaToConvert = (schemaToConvert as any)._def.schema;
  }

  const result = zodToJsonSchema(schemaToConvert, entry.name, {
    target: "openApi3",
    effectStrategy: "input", // Use input strategy to focus on the base schema structure
  });
  // zodToJsonSchema can return the schema directly or wrapped in definitions/components
  let definition: JsonSchemaObject;
  if ((result as any).definitions?.[entry.name]) {
    definition = (result as any).definitions[entry.name];
  } else if ((result as any).components?.schemas?.[entry.name]) {
    definition = (result as any).components.schemas[entry.name];
  } else if ((result as any).$defs?.[entry.name]) {
    definition = (result as any).$defs[entry.name];
  } else {
    // Schema is returned directly
    definition = result as JsonSchemaObject;
  }
  return {
    properties: definition.properties ?? {},
    required: definition.required ?? [],
  };
}

function extractSchemaFromOpenApi(name: string): JsonSchemaObject {
  const schema = (openApiSpec as any).components?.schemas?.[name];
  if (!schema) {
    throw new Error(`OpenAPI schema "${name}" is not defined`);
  }
  return {
    properties: schema.properties ?? {},
    required: schema.required ?? [],
  };
}

describe("OpenAPI contract alignment", () => {
  for (const entry of CONTRACT_SCHEMAS) {
    it(`matches OpenAPI schema for ${entry.name}`, () => {
      const zodSchema = extractSchemaFromZod(entry);
      const openApiSchema = extractSchemaFromOpenApi(entry.name);

      const zodKeys = Object.keys(zodSchema.properties ?? {}).sort();
      const openApiKeys = Object.keys(openApiSchema.properties ?? {}).sort();

      expect(openApiKeys).toEqual(zodKeys);

      const zodRequired = [...(zodSchema.required ?? [])].sort();
      const openApiRequired = [...(openApiSchema.required ?? [])].sort();

      expect(openApiRequired).toEqual(zodRequired);

      for (const key of zodKeys) {
        const expected = zodSchema.properties?.[key] ?? {};
        const received = openApiSchema.properties?.[key] ?? {};

        if (expected?.type) {
          expect(received?.type).toBe(expected.type);
        }
        if (expected?.format) {
          expect(received?.format).toBe(expected.format);
        }
        if (Array.isArray(expected?.enum)) {
          expect(received?.enum).toEqual(expected.enum);
        }
        if (expected?.items?.type && !received?.items?.$ref) {
          expect(received?.items?.type).toBe(expected.items.type);
        }
        if (expected?.properties) {
          expect(Object.keys(received?.properties ?? {}).sort()).toEqual(
            Object.keys(expected.properties).sort(),
          );
        }
      }
    });
  }
});
