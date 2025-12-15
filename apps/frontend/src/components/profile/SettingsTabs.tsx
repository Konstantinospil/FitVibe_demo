import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs";
import { User, Shield, Globe } from "lucide-react";

export type SettingsTabValue = "profile" | "security" | "privacy";

export interface SettingsTabsProps {
  defaultValue?: SettingsTabValue;
  value?: SettingsTabValue;
  onValueChange?: (value: SettingsTabValue) => void;
  profileContent: React.ReactNode;
  securityContent: React.ReactNode;
  privacyContent: React.ReactNode;
}

/**
 * SettingsTabs component for organizing settings into tabs.
 * Provides Profile, Security, and Privacy tabs with icons.
 */
export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  defaultValue = "profile",
  value,
  onValueChange,
  profileContent,
  securityContent,
  privacyContent,
}) => {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={(val) => onValueChange?.(val as SettingsTabValue)}
    >
      <TabsList>
        <TabsTrigger value="profile">
          <User size={16} style={{ marginRight: "0.5rem" }} />
          Profile
        </TabsTrigger>
        <TabsTrigger value="security">
          <Shield size={16} style={{ marginRight: "0.5rem" }} />
          Security
        </TabsTrigger>
        <TabsTrigger value="privacy">
          <Globe size={16} style={{ marginRight: "0.5rem" }} />
          Privacy
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">{profileContent}</TabsContent>
      <TabsContent value="security">{securityContent}</TabsContent>
      <TabsContent value="privacy">{privacyContent}</TabsContent>
    </Tabs>
  );
};
