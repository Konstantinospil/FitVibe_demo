import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import PageIntro from "./PageIntro";
import { scheduleIdleTask } from "../utils/idleScheduler";

const headerSkeletonStyle: React.CSSProperties = {
  width: "48px",
  height: "40px",
  borderRadius: "999px",
  background: "var(--color-surface-muted)",
  border: "1px solid var(--color-border)",
  animation: "pulse 1.4s ease-in-out infinite",
};

const HeaderUtilities: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const { cancel } = scheduleIdleTask(() => setIsReady(true), { timeout: 1600 });
    return () => cancel();
  }, []);

  if (!isReady) {
    return (
      <>
        <span aria-hidden="true" style={headerSkeletonStyle} />
        <span aria-hidden="true" style={headerSkeletonStyle} />
      </>
    );
  }

  return (
    <>
      <ThemeToggle />
      <LanguageSwitcher />
    </>
  );
};

interface AuthPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  eyebrow,
  title,
  description,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          zIndex: 10,
        }}
      >
        <HeaderUtilities />
      </div>
      <div style={{ flex: 1 }}>
        <PageIntro eyebrow={eyebrow} title={title} description={description}>
          {children}
        </PageIntro>
      </div>
      <footer
        style={{
          padding: "1.5rem 0",
          textAlign: "center",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <NavLink
            to="/terms"
            style={{
              color: "var(--color-text-muted)",
              textDecoration: "none",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            {t("footer.terms")}
          </NavLink>
          <NavLink
            to="/privacy"
            style={{
              color: "var(--color-text-muted)",
              textDecoration: "none",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            {t("footer.privacy")}
          </NavLink>
        </div>
      </footer>
    </div>
  );
};

export default AuthPageLayout;
