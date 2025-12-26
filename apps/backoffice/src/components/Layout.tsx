import React, { useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { useThemeStore } from "../store/theme.store";
import { useThemeColors } from "../hooks/useThemeColors";
import ThemeToggle from "./ThemeToggle";
import { authApi } from "../services/api";
import logoFull from "../assets/logo_full.png";
import logoFullDark from "../assets/logo_full_dark.png";

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const theme = useThemeStore((state) => state.theme);
  const colors = useThemeColors();

  const logo = useMemo(() => {
    return theme === "dark" ? logoFullDark : logoFull;
  }, [theme]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
    signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/translations", label: "Translations" },
    { path: "/messages", label: "Messages" },
    { path: "/users", label: "Users" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg, color: colors.text }}>
      <aside
        style={{
          width: "250px",
          background: colors.surface,
          padding: "1.5rem",
          borderRight: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}
        >
          <img src={logo} alt="FitVibe Logo" style={{ height: "40px" }} />
        </div>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "block",
                padding: "0.75rem 1rem",
                color: location.pathname === item.path ? colors.accent : colors.text,
                textDecoration: "none",
                marginBottom: "0.5rem",
                borderRadius: "4px",
                background: location.pathname === item.path ? `${colors.accent}20` : "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div
          style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: `1px solid ${colors.border}` }}
        >
          <div style={{ color: colors.textSecondary, marginBottom: "1rem", fontSize: "0.875rem" }}>
            Logged in as: {user?.username}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <ThemeToggle />
          </div>
          <button
            onClick={() => void handleLogout()}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "transparent",
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "2rem", overflow: "auto", background: colors.bg }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
