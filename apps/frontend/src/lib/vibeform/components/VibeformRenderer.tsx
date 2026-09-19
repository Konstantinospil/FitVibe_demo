import type { HTMLAttributes } from "react";
import type { VibeformProfile } from "@fitvibe/types";
import { calculateVibeformParameters } from "../manipulation";
import { adaptVibeformProfile } from "../normalization-adapter";
import { FlowVibeform } from "../templates";

export interface VibeformRendererProps extends HTMLAttributes<HTMLDivElement> {
  profile: VibeformProfile;
  accessibleLabel?: string;
}

export function VibeformRenderer({
  profile,
  accessibleLabel = "Your Vibeform",
  ...containerProps
}: VibeformRendererProps) {
  const input = adaptVibeformProfile(profile);
  const parameters = calculateVibeformParameters(input);

  switch (profile.preferences.templateCode) {
    case "flow":
      return (
        <div {...containerProps} data-vibeform-version={profile.preferences.templateVersion}>
          <FlowVibeform
            parameters={parameters}
            motionEnabled={profile.preferences.motionEnabled}
            aria-label={accessibleLabel}
          />
        </div>
      );
  }
}
