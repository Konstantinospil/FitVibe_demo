import { db } from "../../db/connection.js";
import type { VibeformPreferenceRow, VibeformPreferences } from "./vibeforms.types.js";

const TABLE_NAME = "user_vibeform_preferences";

export async function findVibeformPreferences(
  userId: string,
): Promise<VibeformPreferenceRow | null> {
  const row = await db<VibeformPreferenceRow>(TABLE_NAME).where({ user_id: userId }).first();
  return row ?? null;
}

export async function upsertVibeformPreferences(
  userId: string,
  preferences: VibeformPreferences,
): Promise<VibeformPreferenceRow> {
  const now = new Date().toISOString();
  const [row] = await db<VibeformPreferenceRow>(TABLE_NAME)
    .insert({
      user_id: userId,
      template_code: preferences.templateCode,
      template_version: preferences.templateVersion,
      body_profile: preferences.bodyProfile,
      motion_enabled: preferences.motionEnabled,
      created_at: now,
      updated_at: now,
    })
    .onConflict("user_id")
    .merge({
      template_code: preferences.templateCode,
      template_version: preferences.templateVersion,
      body_profile: preferences.bodyProfile,
      motion_enabled: preferences.motionEnabled,
      updated_at: now,
    })
    .returning("*");

  return row;
}
