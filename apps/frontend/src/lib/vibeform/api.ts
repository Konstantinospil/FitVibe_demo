import type { UpdateVibeformPreferencesInput, VibeformProfile } from "@fitvibe/types";
import { apiClient } from "../../services/api";

const VIBEFORM_PROFILE_PATH = "/api/v1/vibeforms/me";

export async function getMyVibeformProfile(): Promise<VibeformProfile> {
  const response = await apiClient.get<VibeformProfile>(VIBEFORM_PROFILE_PATH);
  return response.data;
}

export async function updateMyVibeformPreferences(
  preferences: UpdateVibeformPreferencesInput,
): Promise<VibeformProfile> {
  const response = await apiClient.patch<VibeformProfile>(VIBEFORM_PROFILE_PATH, preferences);
  return response.data;
}
