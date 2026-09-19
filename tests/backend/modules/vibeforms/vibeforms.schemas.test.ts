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
});
