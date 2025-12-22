import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { Users, Settings as SettingsIcon, AlertTriangle, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageIntro from "../../components/PageIntro";
import { Card, CardContent } from "../../components/ui/Card";

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.includes(path);

  const navItems = [
    {
      path: "/admin/reports",
      label: t("admin.contentReports.title"),
      icon: <AlertTriangle size={20} />,
      description: t("admin.contentReports.description"),
    },
    {
      path: "/admin/users",
      label: t("admin.userManagement.title"),
      icon: <Users size={20} />,
      description: t("admin.userManagement.description"),
    },
    {
      path: "/admin/system",
      label: t("admin.systemControls.title"),
      icon: <SettingsIcon size={20} />,
      description: t("admin.systemControls.description"),
    },
    {
      path: "/admin/translations",
      label: "Translation Management",
      icon: <Languages size={20} />,
      description: "Manage application translations across all languages",
    },
  ];

  return (
    <PageIntro
      eyebrow={t("admin.dashboard.eyebrow")}
      title={t("admin.dashboard.title")}
      description={t("admin.dashboard.description")}
    >
      <div className="grid grid--gap-15">
        {/* Admin Navigation */}
        <Card>
          <CardContent>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1rem",
              }}
            >
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => void navigate(item.path)}
                  style={{
                    padding: "1.5rem",
                    borderRadius: "12px",
                    border: `2px solid ${isActive(item.path) ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: isActive(item.path)
                      ? "rgba(52, 211, 153, 0.08)"
                      : "rgba(15, 23, 42, 0.4)",
                    color: "var(--color-text-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = "rgba(15, 23, 42, 0.6)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = "rgba(15, 23, 42, 0.4)";
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        color: isActive(item.path)
                          ? "var(--color-accent)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {item.icon}
                    </div>
                    <h3 className="text-11 font-weight-600 m-0">{item.label}</h3>
                  </div>
                  <p
                    style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", margin: 0 }}
                  >
                    {item.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Render active admin page */}
        <Outlet />
      </div>
    </PageIntro>
  );
};

export default AdminDashboard;
