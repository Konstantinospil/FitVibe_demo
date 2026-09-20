import { UpdateVibeformPreferencesSchema } from "../../../../apps/backend/src/modules/vibeforms/vibeforms.schemas.js";

describe("UpdateVibeformPreferencesSchema", () => {
  it("accepts supported preference updates", () => {
    expect(
      UpdateVibeformPreferencesSchema.parse({
        templateCode: "flow",
        bodyProfile: "shoulder-dominant",
        motionEnabled: false,
      }),
    ).toEqual({
      templateCode: "flow",
      bodyProfile: "shoulder-dominant",
      motionEnabled: false,
    });
  });

  it("rejects unknown templates", () => {
    expect(
      UpdateVibeformPreferencesSchema.safeParse({ templateCode: "unknown-template" }).success,
    ).toBe(false);
  });

  it("rejects empty and additional-property updates", () => {
    expect(UpdateVibeformPreferencesSchema.safeParse({}).success).toBe(false);
    expect(UpdateVibeformPreferencesSchema.safeParse({ strokeWidth: 2 }).success).toBe(false);
  });

  it.each([
    { strength: 0.8 },
    { upperBodyLoad: 0.5 },
    { bmi: 24 },
    { calculationVersion: "999" },
    { renderParameters: { strokeScale: 2 } },
  ])("rejects calculated or renderer-owned input %j", (input) => {
    expect(UpdateVibeformPreferencesSchema.safeParse(input).success).toBe(false);
  });
});
