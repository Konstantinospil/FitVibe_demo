import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Footer component that appears on all pages.
 * Displays FitVibe branding, Terms and Conditions, and Privacy Policy links.
 * WCAG 2.1 AA compliant with proper semantic HTML and keyboard navigation.
 */
export const Footer: React.FC = () => {
  const { t } = useTranslation();

  const footerStyle: React.CSSProperties = {
    padding: "2rem 0",
    textAlign: "center",
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    borderTop: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 clamp(1rem, 5vw, 2.5rem)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    alignItems: "center",
  };

  const brandStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: "var(--font-size-sm)",
    letterSpacing: "var(--letter-spacing-wide)",
    textTransform: "uppercase",
    color: "var(--color-text-primary)",
    marginBottom: "0.5rem",
  };

  const linksContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "1.5rem",
    flexWrap: "wrap",
  };

  const linkStyle: React.CSSProperties = {
    color: "var(--color-text-muted)",
    textDecoration: "none",
    transition: "color 150ms ease",
    fontSize: "var(--font-size-xs)",
  };

  const handleLinkHover = (e: React.MouseEvent<HTMLAnchorElement>, isHover: boolean) => {
    e.currentTarget.style.color = isHover
      ? "var(--color-text-secondary)"
      : "var(--color-text-muted)";
    e.currentTarget.style.textDecoration = isHover ? "underline" : "none";
  };

  return (
    <footer role="contentinfo" style={footerStyle}>
      <div style={containerStyle}>
        <div style={brandStyle}>{t("footer.brand", { defaultValue: "FitVibe" })}</div>
        <nav aria-label={t("footer.navigationLabel", { defaultValue: "Footer navigation" })}>
          <div style={linksContainerStyle}>
            <NavLink
              to="/terms"
              style={linkStyle}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
              onFocus={(e) => handleLinkHover(e, true)}
              onBlur={(e) => handleLinkHover(e, false)}
              aria-label={t("footer.termsAriaLabel", { defaultValue: "View Terms and Conditions" })}
            >
              {t("footer.terms")}
            </NavLink>
            <NavLink
              to="/privacy"
              style={linkStyle}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
              onFocus={(e) => handleLinkHover(e, true)}
              onBlur={(e) => handleLinkHover(e, false)}
              aria-label={t("footer.privacyAriaLabel", { defaultValue: "View Privacy Policy" })}
            >
              {t("footer.privacy")}
            </NavLink>
          </div>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
