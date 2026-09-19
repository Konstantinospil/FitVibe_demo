export type VibeformBodyProfile = "shoulder-dominant" | "balanced" | "hip-dominant";
export type VibeformTemplateCode = "flow";

export interface VibeformPreferences {
  templateCode: VibeformTemplateCode;
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
  upperBodyLoad: number;
  lowerBodyLoad: number;
  bmi: number | null;
  heightCm: number | null;
}

export interface UpdateVibeformPreferencesInput {
  templateCode?: VibeformTemplateCode;
  bodyProfile?: VibeformBodyProfile;
  motionEnabled?: boolean;
}

export interface VibeformProfile {
  preferences: VibeformPreferences;
  metrics: VibeformMetrics;
  calculationVersion: string;
  calculatedAt: string;
}
