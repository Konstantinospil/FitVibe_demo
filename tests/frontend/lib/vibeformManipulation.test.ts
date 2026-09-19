import {
  calculateVibeformParameters,
  clamp01,
  normalizeBmi,
  toVibeformCssVariables,
  type VibeformMetrics,
} from "../../../apps/frontend/src/lib/vibeform";

const balancedMetrics: VibeformMetrics = {
  intelligence: 0.5,
  regeneration: 0.5,
  agility: 0.5,
  explosivity: 0.5,
  endurance: 0.5,
  strength: 0.5,
  bmi: 22,
  heightCm: 175,
  bodyProfile: "balanced",
};

describe("Vibeform manipulation", () => {
  it("clamps invalid and out-of-range capability values", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0.5);
  });

  it("bounds BMI before mapping it to visual mass", () => {
    expect(normalizeBmi(10)).toBe(0);
    expect(normalizeBmi(40)).toBe(1);
    expect(normalizeBmi(80)).toBe(1);
  });

  it("increases stroke scale monotonically with BMI", () => {
    const lean = calculateVibeformParameters({ ...balancedMetrics, bmi: 18 });
    const solid = calculateVibeformParameters({ ...balancedMetrics, bmi: 32 });

    expect(solid.geometry.strokeScale).toBeGreaterThan(lean.geometry.strokeScale);
  });

  it("applies regional strength without changing the opposite region", () => {
    const upperFocused = calculateVibeformParameters({
      ...balancedMetrics,
      upperBodyStrength: 1,
      lowerBodyStrength: 0,
    });
    const lowerFocused = calculateVibeformParameters({
      ...balancedMetrics,
      upperBodyStrength: 0,
      lowerBodyStrength: 1,
    });

    expect(upperFocused.geometry.upperScale).toBeGreaterThan(lowerFocused.geometry.upperScale);
    expect(lowerFocused.geometry.lowerScale).toBeGreaterThan(upperFocused.geometry.lowerScale);
  });

  it("uses profile preference only for shoulder-to-hip balance", () => {
    const shoulderDominant = calculateVibeformParameters({
      ...balancedMetrics,
      bodyProfile: "shoulder-dominant",
    });
    const hipDominant = calculateVibeformParameters({
      ...balancedMetrics,
      bodyProfile: "hip-dominant",
    });

    expect(shoulderDominant.geometry.shoulderScale).toBeGreaterThan(
      hipDominant.geometry.shoulderScale,
    );
    expect(hipDominant.geometry.hipScale).toBeGreaterThan(shoulderDominant.geometry.hipScale);
  });

  it("keeps regeneration independent from geometry", () => {
    const low = calculateVibeformParameters({ ...balancedMetrics, regeneration: 0 });
    const high = calculateVibeformParameters({ ...balancedMetrics, regeneration: 1 });

    expect(high.geometry).toEqual(low.geometry);
    expect(high.colors.agility.oklch).not.toBe(low.colors.agility.oklch);
    expect(high.motion.pulseAmplitude).toBeGreaterThan(low.motion.pulseAmplitude);
  });

  it("exposes the render contract as SVG-friendly CSS variables", () => {
    const variables = toVibeformCssVariables(calculateVibeformParameters(balancedMetrics));

    expect(variables["--vibeform-forward-lean"]).toMatch(/deg$/);
    expect(variables["--vibeform-head-color"]).toMatch(/^oklch\(/);
    expect(variables["--vibeform-pulse-duration"]).toMatch(/s$/);
  });
});
