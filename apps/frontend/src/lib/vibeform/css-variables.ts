import type { VibeformRenderParameters } from "./manipulation";

export type VibeformCssVariables = Record<`--vibeform-${string}`, string | number>;

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
