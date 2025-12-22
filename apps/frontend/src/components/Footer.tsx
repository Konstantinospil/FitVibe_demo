import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Shield, Building2, Mail, Cookie } from "lucide-react";
import logoFull from "../assets/logo_full.png";
import logoFullDark from "../assets/logo_full_dark.png";
import { useThemeStore } from "../store/theme.store";

/**
 * Footer component that appears on all pages.
 * Displays FitVibe logo, and links to Impressum, Terms and Conditions, Privacy Policy, Cookie Policy, and Contact.
 * WCAG 2.1 AA compliant with proper semantic HTML and keyboard navigation.
 */
export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const logo = theme === "dark" ? logoFullDark : logoFull;

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
    gap: "1.5rem",
    alignItems: "center",
  };

  const logoContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "0.5rem",
  };

  const logoStyle: React.CSSProperties = {
    height: "48px",
    width: "auto",
    objectFit: "contain",
  };

  const linksContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "clamp(1rem, 3vw, 2rem)",
    flexWrap: "wrap",
  };

  const linkStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--color-text-muted)",
    textDecoration: "none",
    transition: "color 150ms ease",
    fontSize: "var(--font-size-xs)",
    padding: "0.5rem",
    borderRadius: "var(--radius-sm)",
  };

  const iconStyle: React.CSSProperties = {
    width: "16px",
    height: "16px",
    color: "var(--color-text-muted)",
    transition: "color 150ms ease",
    flexShrink: 0,
  };

  const handleLinkHover = (e: React.MouseEvent<HTMLAnchorElement>, isHover: boolean) => {
    const link = e.currentTarget;
    const icon = link.querySelector("svg");
    if (isHover) {
      link.style.color = "var(--element-fire-base)";
      if (icon) {
        icon.style.color = "var(--element-fire-base)";
      }
    } else {
      link.style.color = "var(--color-text-muted)";
      if (icon) {
        icon.style.color = "var(--color-text-muted)";
      }
    }
  };

  const handleLinkFocus = (e: React.FocusEvent<HTMLAnchorElement>, isFocus: boolean) => {
    const link = e.currentTarget;
    const icon = link.querySelector("svg");
    if (isFocus) {
      link.style.color = "var(--element-fire-base)";
      if (icon) {
        icon.style.color = "var(--element-fire-base)";
      }
    } else {
      link.style.color = "var(--color-text-muted)";
      if (icon) {
        icon.style.color = "var(--color-text-muted)";
      }
    }
  };

  const footerLinks = [
    {
      to: "/impressum",
      icon: Building2,
      labelKey: "footer.impressum",
      ariaLabelKey: "footer.impressumAriaLabel",
    },
    {
      to: "/terms",
      icon: FileText,
      labelKey: "footer.terms",
      ariaLabelKey: "footer.termsAriaLabel",
    },
    {
      to: "/privacy",
      icon: Shield,
      labelKey: "footer.privacy",
      ariaLabelKey: "footer.privacyAriaLabel",
    },
    {
      to: "/cookie",
      icon: Cookie,
      labelKey: "footer.cookie",
      ariaLabelKey: "footer.cookieAriaLabel",
    },
    {
      to: "/contact",
      icon: Mail,
      labelKey: "footer.contact",
      ariaLabelKey: "footer.contactAriaLabel",
    },
  ];

  return (
    <footer role="contentinfo" style={footerStyle}>
      <div style={containerStyle}>
        <div style={logoContainerStyle}>
          <img src={logo} alt={t("footer.brand", { defaultValue: "FitVibe" })} style={logoStyle} />
        </div>
        <nav aria-label={t("footer.navigationLabel", { defaultValue: "Footer navigation" })}>
          <div style={linksContainerStyle}>
            {footerLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  style={linkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                  onFocus={(e) => handleLinkFocus(e, true)}
                  onBlur={(e) => handleLinkFocus(e, false)}
                  aria-label={t(link.ariaLabelKey, { defaultValue: link.labelKey })}
                >
                  <IconComponent size={16} style={iconStyle} aria-hidden="true" />
                  <span>{t(link.labelKey)}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
