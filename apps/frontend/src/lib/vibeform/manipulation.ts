import type {
  VibeformBodyProfile,
  VibeformMetrics,
  VibeformPreferences,
} from "../../../../../packages/types/src/vibeform";

export type { VibeformBodyProfile, VibeformMetrics };

/**
 * Capability values are normalized to the inclusive range 0..1.
 * BMI and height retain their familiar units at the API boundary.
 */
export type VibeformManipulationInput = VibeformMetrics &
  Partial<Pick<VibeformPreferences, "bodyProfile">>;

export interface VibeformColor {
  /** CSS Color 4 value; supported by current evergreen browsers. */
  oklch: string;
  /** Relative prominence of the corresponding ribbon in the template. */
  weight: number;
}

export interface VibeformRenderParameters {
  geometry: {
    heightScale: number;
    strokeScale: number;
    upperScale: number;
    lowerScale: number;
    shoulderScale: number;
    hipScale: number;
    curveTension: number;
    asymmetry: number;
    flare: number;
    continuity: number;
    forwardLeanDeg: number;
  };
  colors: {
    head: string;
    agility: VibeformColor;
    explosivity: VibeformColor;
    endurance: VibeformColor;
  };
  motion: {
    pulseDurationSeconds: number;
    pulseAmplitude: number;
  };
}

export type VibeformCssVariables = Record<`--vibeform-${string}`, string | number>;

const DEFAULT_SCORE = 0.5;
const PROFILE_BALANCE: Record<VibeformBodyProfile, number> = {
  "shoulder-dominant": 1,
  balanced: 0,
  "hip-dominant": -1,
};

function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clamp01(value: number | null | undefined, fallback = DEFAULT_SCORE): number {
  return Math.min(1, Math.max(0, finiteOr(value, fallback)));
}

function lerp(min: number, max: number, amount: number): number {
  return min + (max - min) * clamp01(amount);
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Maps BMI onto a bounded visual mass score. The broad input limits are
 * deliberate: BMI influences the artwork, but never labels or judges a body.
 */
export function normalizeBmi(bmi: number | null): number {
  const boundedBmi = Math.min(40, Math.max(16, finiteOr(bmi, 22)));
  return (boundedBmi - 16) / 24;
}

function normalizeHeight(heightCm: number | null | undefined): number {
  const boundedHeight = Math.min(200, Math.max(150, finiteOr(heightCm, 175)));
  return (boundedHeight - 150) / 50;
}

function color(lightness: number, chroma: number, hue: number): string {
  return `oklch(${round(lightness, 3)} ${round(chroma, 3)} ${hue})`;
}

/**
 * Converts athlete data into the common parameter contract understood by all
 * Vibeform SVG templates. Outputs are intentionally constrained so a template
 * remains legible at every valid combination of inputs.
 */
export function calculateVibeformParameters(
  metrics: VibeformManipulationInput,
): VibeformRenderParameters {
  const intelligence = clamp01(metrics.intelligence);
  const regeneration = clamp01(metrics.regeneration);
  const agility = clamp01(metrics.agility);
  const explosivity = clamp01(metrics.explosivity);
  const endurance = clamp01(metrics.endurance);
  const strength = clamp01(metrics.strength);
  const upperStrength = clamp01(metrics.upperBodyStrength, strength);
  const lowerStrength = clamp01(metrics.lowerBodyStrength, strength);
  const mass = normalizeBmi(metrics.bmi);
  const height = normalizeHeight(metrics.heightCm);
  const profile = PROFILE_BALANCE[metrics.bodyProfile ?? "balanced"];

  // Regeneration alters chroma within an accessible, deliberately narrow band.
  const chromaMultiplier = lerp(0.7, 1.05, regeneration);

  return {
    geometry: {
      heightScale: round(lerp(0.92, 1.08, height)),
      strokeScale: round(lerp(0.85, 1.2, mass)),
      upperScale: round(lerp(0.92, 1.16, upperStrength)),
      lowerScale: round(lerp(0.92, 1.16, lowerStrength)),
      shoulderScale: round(1 + profile * 0.06),
      hipScale: round(1 - profile * 0.06),
      curveTension: round(lerp(0.35, 0.8, agility)),
      asymmetry: round(lerp(0.02, 0.1, agility)),
      flare: round(lerp(0.1, 0.7, explosivity)),
      continuity: round(lerp(0.45, 1, endurance)),
      forwardLeanDeg: round(lerp(0, 12, endurance)),
    },
    colors: {
      head: color(lerp(0.72, 0.38, intelligence), 0.12, 235),
      agility: {
        oklch: color(0.68, 0.14 * chromaMultiplier, 165),
        weight: round(lerp(0.65, 1.15, agility)),
      },
      explosivity: {
        oklch: color(0.68, 0.17 * chromaMultiplier, 28),
        weight: round(lerp(0.65, 1.15, explosivity)),
      },
      endurance: {
        oklch: color(0.68, 0.14 * chromaMultiplier, 225),
        weight: round(lerp(0.65, 1.15, endurance)),
      },
    },
    motion: {
      pulseDurationSeconds: round(lerp(5.5, 3.5, regeneration)),
      pulseAmplitude: round(lerp(0.01, 0.035, regeneration)),
    },
  };
}

/**
 * Optional adapter for SVG components that express the common contract with
 * CSS custom properties. Keeping this separate makes the calculator portable.
 */
export function toVibeformCssVariables(parameters: VibeformRenderParameters): VibeformCssVariables {
  const { geometry, colors, motion } = parameters;

  return {
    "--vibeform-height-scale": geometry.heightScale,
    "--vibeform-stroke-scale": geometry.strokeScale,
    "--vibeform-upper-scale": geometry.upperScale,
    "--vibeform-lower-scale": geometry.lowerScale,
    "--vibeform-shoulder-scale": geometry.shoulderScale,
    "--vibeform-hip-scale": geometry.hipScale,
    "--vibeform-curve-tension": geometry.curveTension,
    "--vibeform-asymmetry": geometry.asymmetry,
    "--vibeform-flare": geometry.flare,
    "--vibeform-continuity": geometry.continuity,
    "--vibeform-forward-lean": `${geometry.forwardLeanDeg}deg`,
    "--vibeform-head-color": colors.head,
    "--vibeform-agility-color": colors.agility.oklch,
    "--vibeform-agility-weight": colors.agility.weight,
    "--vibeform-explosivity-color": colors.explosivity.oklch,
    "--vibeform-explosivity-weight": colors.explosivity.weight,
    "--vibeform-endurance-color": colors.endurance.oklch,
    "--vibeform-endurance-weight": colors.endurance.weight,
    "--vibeform-pulse-duration": `${motion.pulseDurationSeconds}s`,
    "--vibeform-pulse-amplitude": motion.pulseAmplitude,
  };
}
