import { UpdateVibeformPreferencesSchema } from "./vibeforms.schemas.js";
import {
  DEFAULT_VIBEFORM_PREFERENCES,
  VIBEFORM_BODY_PROFILES,
  VIBEFORM_TEMPLATE_VERSIONS,
  type UpdateVibeformPreferencesInput,
  type VibeformBodyProfile,
  type VibeformPreferenceRow,
  type VibeformPreferences,
  type VibeformTemplateCode,
} from "./vibeforms.types.js";
import { findVibeformPreferences, upsertVibeformPreferences } from "./vibeforms.repository.js";

function isTemplateCode(value: string): value is VibeformTemplateCode {
  return Object.hasOwn(VIBEFORM_TEMPLATE_VERSIONS, value);
}

function isBodyProfile(value: string): value is VibeformBodyProfile {
  return (VIBEFORM_BODY_PROFILES as readonly string[]).includes(value);
}

function toPreferences(row: VibeformPreferenceRow): VibeformPreferences {
  if (!isTemplateCode(row.template_code) || !isBodyProfile(row.body_profile)) {
    throw new Error("Stored Vibeform preferences violate the application contract");
  }

  return {
    templateCode: row.template_code,
    templateVersion: row.template_version,
    bodyProfile: row.body_profile,
    motionEnabled: row.motion_enabled,
  };
}

export async function getVibeformPreferences(userId: string): Promise<VibeformPreferences> {
  const row = await findVibeformPreferences(userId);
  return row ? toPreferences(row) : { ...DEFAULT_VIBEFORM_PREFERENCES };
}

export async function updateVibeformPreferences(
  userId: string,
  input: UpdateVibeformPreferencesInput,
): Promise<VibeformPreferences> {
  const update = UpdateVibeformPreferencesSchema.parse(input);
  const current = await getVibeformPreferences(userId);
  const templateCode = update.templateCode ?? current.templateCode;
  const next: VibeformPreferences = {
    templateCode,
    templateVersion: VIBEFORM_TEMPLATE_VERSIONS[templateCode],
    bodyProfile: update.bodyProfile ?? current.bodyProfile,
    motionEnabled: update.motionEnabled ?? current.motionEnabled,
  };
  return toPreferences(await upsertVibeformPreferences(userId, next));
}
