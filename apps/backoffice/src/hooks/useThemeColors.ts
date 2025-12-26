import { useThemeStore } from "../store/theme.store";

export const useThemeColors = () => {
  const theme = useThemeStore((state) => state.theme);

  if (theme === "light") {
    return {
      bg: "#FFFFFF",
      surface: "#F5F5F5",
      text: "#000000",
      textSecondary: "#333333",
      border: "#CCCCCC",
      accent: "#FB951D",
      error: "#9F2406",
    };
  }

  // Dark theme
  return {
    bg: "#000000",
    surface: "#1A1A1A",
    text: "#FFFFFF",
    textSecondary: "#CCCCCC",
    border: "#333333",
    accent: "#FB951D",
    error: "#9F2406",
  };
};
