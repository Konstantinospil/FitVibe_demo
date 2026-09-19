export type VibeformBodyProfile = "shoulder-dominant" | "balanced" | "hip-dominant";

export interface VibeformPreferences {
  templateCode: string;
  templateVersion: number;
  bodyProfile: VibeformBodyProfile;
  motionEnabled: boolean;
}

/**
 * Backend-normalized values consumed by the Vibeform renderer.
 * Capability and regional scores use the inclusive range 0..1.
 */
export interface VibeformMetrics {
  intelligence: number;
  regeneration: number;
  agility: number;
  explosivity: number;
  endurance: number;
  strength: number;
  upperBodyStrength: number;
  lowerBodyStrength: number;
  bmi: number | null;
  heightCm: number | null;
}

export interface VibeformProfile {
  preferences: VibeformPreferences;
  metrics: VibeformMetrics;
  calculationVersion: string;
  calculatedAt: string;
}
