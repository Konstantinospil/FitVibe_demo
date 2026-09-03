import { describe, expect, it } from "vitest";
import { TYPE_CODE_TO_VIBE, VIBE_TYPE_CODE_MAP } from "../../src/constants/vibes";

describe("vibes", () => {
  it("maps all six vibes to exercise type codes", () => {
    expect(VIBE_TYPE_CODE_MAP).toEqual({
      strength: "strength",
      agility: "balance",
      endurance: "endurance",
      explosivity: "plyometrics",
      intelligence: "skill",
      regeneration: "recovery",
    });
  });

  it("inverts the type-code map", () => {
    expect(TYPE_CODE_TO_VIBE.balance).toBe("agility");
    expect(TYPE_CODE_TO_VIBE.plyometrics).toBe("explosivity");
    expect(TYPE_CODE_TO_VIBE.skill).toBe("intelligence");
    expect(TYPE_CODE_TO_VIBE.recovery).toBe("regeneration");
    expect(Object.keys(TYPE_CODE_TO_VIBE)).toHaveLength(6);
  });
});
