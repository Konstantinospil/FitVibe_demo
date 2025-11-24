import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import { RegisterSchema, LoginSchema } from "../../src/modules/auth/auth.schemas.js";
import openApiSpec from "../../openapi/openapi.json";

type SchemaMapEntry = {
  name: string;
  schema: ZodTypeAny;
};

const CONTRACT_SCHEMAS: SchemaMapEntry[] = [
  { name: "RegisterRequest", schema: RegisterSchema },
  { name: "LoginRequest", schema: LoginSchema },
];

type JsonSchemaObject = {
  properties?: Record<string, any>;
  required?: string[];
};

function extractSchemaFromZod(entry: SchemaMapEntry): JsonSchemaObject {
  const result = zodToJsonSchema(entry.schema, entry.name, { target: "openApi3" });
  const definition =
    (result as any).definitions?.[entry.name] ??
    (result as any).components?.schemas?.[entry.name] ??
    result;
  return {
    properties: (definition as JsonSchemaObject).properties ?? {},
    required: (definition as JsonSchemaObject).required ?? [],
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
        if (expected?.items?.type) {
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
