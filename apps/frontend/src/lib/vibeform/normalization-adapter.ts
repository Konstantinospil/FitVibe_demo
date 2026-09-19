import type { VibeformProfile } from "@fitvibe/types";
import { clamp01, type VibeformManipulationInput } from "./manipulation";

export const NEUTRAL_VIBEFORM_BMI = 22;
export const NEUTRAL_VIBEFORM_HEIGHT_CM = 175;

/**
 * Validates the API boundary and supplies neutral render-only body values.
 * Capability metrics already use the backend's documented 0..1 contract;
 * this adapter deliberately does not infer or convert another scale.
 */
export function adaptVibeformProfile(profile: VibeformProfile): VibeformManipulationInput {
  const { metrics, preferences } = profile;

  return {
    intelligence: clamp01(metrics.intelligence),
    regeneration: clamp01(metrics.regeneration),
    agility: clamp01(metrics.agility),
    explosivity: clamp01(metrics.explosivity),
    endurance: clamp01(metrics.endurance),
    strength: clamp01(metrics.strength),
    upperBodyLoad: clamp01(metrics.upperBodyLoad),
    lowerBodyLoad: clamp01(metrics.lowerBodyLoad),
    bmi: metrics.bmi ?? NEUTRAL_VIBEFORM_BMI,
    heightCm: metrics.heightCm ?? NEUTRAL_VIBEFORM_HEIGHT_CM,
    bodyProfile: preferences.bodyProfile,
  };
}
