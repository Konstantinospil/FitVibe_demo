import type { VibeformPreferences } from "@fitvibe/types";

export type {
  UpdateVibeformPreferencesInput,
  VibeformBodyProfile,
  VibeformMetrics,
  VibeformPreferences,
  VibeformProfile,
  VibeformTemplateCode,
} from "@fitvibe/types";

export const VIBEFORM_BODY_PROFILES = ["shoulder-dominant", "balanced", "hip-dominant"] as const;

export const VIBEFORM_TEMPLATE_VERSIONS = {
  flow: 1,
} as const;

export interface VibeformPreferenceRow {
  user_id: string;
  template_code: string;
  template_version: number;
  body_profile: string;
  motion_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_VIBEFORM_PREFERENCES: VibeformPreferences = {
  templateCode: "flow",
  templateVersion: VIBEFORM_TEMPLATE_VERSIONS.flow,
  bodyProfile: "balanced",
  motionEnabled: true,
};
