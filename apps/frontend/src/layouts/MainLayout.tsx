import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui";
import Footer from "../components/Footer";
import Breadcrumb from "../components/Breadcrumb";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Home,
  User,
  Settings as SettingsIcon,
  CalendarDays,
  CalendarClock,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import logoFull from "../assets/logo_full.png";
import logoFullDark from "../assets/logo_full_dark.png";
import { useThemeStore } from "../store/theme.store";
import VibeSidebar from "../components/layout/VibeSidebar";

type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "navigation.home", icon: Home },
  { to: "/sessions", labelKey: "navigation.sessions", icon: CalendarDays },
  { to: "/planner", labelKey: "navigation.planner", icon: CalendarClock },
  { to: "/insights", labelKey: "navigation.insights", icon: BarChart3 },
  { to: "/profile", labelKey: "navigation.profile", icon: User },
  { to: "/settings", labelKey: "navigation.settings", icon: SettingsIcon },
];

function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

// Minimal accessible tooltip (hover + keyboard focus)
const IconWithTooltip: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => {
  const [open, setOpen] = useState(false);

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    padding: "0.35rem 0.55rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--font-size-xs)",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-muted)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    opacity: open ? 1 : 0,
    pointerEvents: "none",
    transition: "opacity 120ms ease",
    zIndex: 50,
  };

  return (
    <span
      style={wrapperStyle}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span role="tooltip" aria-hidden={!open} style={tooltipStyle}>
        {label}
      </span>
    </span>
  );
};

const MainLayout: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { width } = useWindowSize();
  const isCompact = width > 0 && width < 900;

  const theme = useThemeStore((state) => state.theme);
  const logo = useMemo(() => (theme === "dark" ? logoFullDark : logoFull), [theme]);

  const handleSignOut = async () => {
    await signOut();
    void navigate("/login", { replace: true });
  };

  const headerStyle: React.CSSProperties = {
    backdropFilter: "blur(14px)",
    background: "var(--color-surface)",
    borderBottom: "1px solid var(--color-border)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  };

  const navStyle: React.CSSProperties = {
    width: "100%",
    padding: "1.15rem clamp(1rem, 5vw, 2.5rem)",
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "auto minmax(220px, 1fr) auto",
    gridTemplateRows: isCompact ? "auto auto auto" : "auto auto",
    columnGap: "1.25rem",
    rowGap: "0.75rem",
    alignItems: "center",
  };

  const breadcrumbStyle: React.CSSProperties = {
    gridColumn: isCompact ? "1 / 2" : "1 / 3",
    gridRow: isCompact ? "2 / 3" : "2 / 3",
    justifySelf: "start",
  };

  const rightStyle: React.CSSProperties = {
    gridColumn: isCompact ? "1 / 2" : "3 / 4",
    gridRow: isCompact ? "3 / 4" : "1 / 3",
    justifySelf: isCompact ? "start" : "end",
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    flexWrap: "wrap",
  };

  const iconLinkBase = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    color: isActive ? "#0f172a" : "var(--color-text-secondary)",
    background: isActive ? "var(--color-accent)" : "transparent",
    transition: "all 150ms ease",
    border: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <a href="#main-content" className="skip-link">
        {t("navigation.skipToContent")}
      </a>

      <header style={headerStyle}>
        <nav aria-label={t("navigation.home")} style={navStyle}>
          {/* Logo left */}
          <div
            style={{
              gridColumn: "1 / 2",
              gridRow: "1 / 2",
              justifySelf: "start",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              key={theme}
              src={logo}
              alt="FitVibe Logo"
              fetchPriority="high"
              loading="eager"
              style={{ width: "clamp(120px, 18vw, 180px)", height: "auto" }}
            />
          </div>

          {/* Breadcrumbs under logo */}
          <div style={breadcrumbStyle}>
            <Breadcrumb />
          </div>

          {/* Icons + logout on the right (or stacked on compact) */}
          <div style={rightStyle}>
            {NAV_ITEMS.map((item) => {
              const IconComponent = item.icon;
              const label = t(item.labelKey);

              return (
                <IconWithTooltip key={item.to} label={label}>
                  <NavLink
                    to={item.to}
                    style={({ isActive }) => iconLinkBase(isActive)}
                    end={item.to === "/"}
                    aria-label={label}
                    title={label} // keeps native tooltip as fallback
                  >
                    <IconComponent size={20} strokeWidth={2} aria-hidden="true" />
                  </NavLink>
                </IconWithTooltip>
              );
            })}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                marginLeft: isCompact ? 0 : "0.8rem",
              }}
            >
              <IconWithTooltip label={t("navigation.signOut")}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void handleSignOut().catch(() => {
                      void navigate("/login", { replace: true });
                    });
                  }}
                  aria-label={t("navigation.signOut")}
                  title={t("navigation.signOut")}
                >
                  <LogOut size={18} aria-hidden="true" />
                </Button>
              </IconWithTooltip>
            </div>
          </div>
        </nav>
      </header>

      <main id="main-content" style={{ flex: 1, display: "flex", background: "var(--color-bg)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </div>
        {!isCompact && <VibeSidebar />}
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
