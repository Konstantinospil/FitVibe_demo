import React from "react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../store/theme.store";
import logoFull from "../assets/logo_full.png";
import logoFullDark from "../assets/logo_full_dark.png";

type BrandLogoSize = "sm" | "lg";

const SIZE_STYLES: Record<BrandLogoSize, React.CSSProperties> = {
  sm: {
    height: "32px",
    width: "auto",
    maxWidth: "160px",
    display: "block",
  },
  lg: {
    height: "clamp(48px, 8vw, 72px)",
    width: "auto",
    maxWidth: "min(100%, 260px)",
    display: "block",
  },
};

const SIZE_DIMS: Record<BrandLogoSize, { width: number; height: number }> = {
  sm: { width: 110, height: 32 },
  lg: { width: 240, height: 70 },
};

type BrandLogoProps = {
  size?: BrandLogoSize;
  priority?: boolean;
};

const BrandLogo: React.FC<BrandLogoProps> = ({ size = "lg", priority = false }) => {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const src = theme === "dark" ? logoFullDark : logoFull;
  const dims = SIZE_DIMS[size];

  return (
    <img
      src={src}
      alt={t("brand.logoAlt")}
      width={dims.width}
      height={dims.height}
      decoding="async"
      style={SIZE_STYLES[size]}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
};

export default BrandLogo;
