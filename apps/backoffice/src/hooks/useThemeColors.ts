import { useThemeStore } from "../store/theme.store";

export const useThemeColors = () => {
  const theme = useThemeStore((state) => state.theme);
  void theme;

  return {
    bg: "var(--color-bg)",
    surface: "var(--color-surface)",
    surfaceMuted: "var(--color-surface-muted)",
    text: "var(--color-text-primary)",
    textSecondary: "var(--color-text-secondary)",
    textMuted: "var(--color-text-muted)",
    border: "var(--color-border)",
    borderStrong: "var(--color-border-strong)",
    accent: "var(--color-primary)",
    error: "var(--color-danger)",
    success: "var(--color-success-text)",
    warning: "var(--color-warning-text)",
  };
};
