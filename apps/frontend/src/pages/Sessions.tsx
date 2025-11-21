import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Calendar, Play, Eye, Trash2 } from "lucide-react";
import PageIntro from "../components/PageIntro";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { listSessions, deleteSession, type SessionWithExercises } from "../services/api";
import { logger } from "../utils/logger";
import { useToast } from "../contexts/ToastContext";
import { ConfirmDialog } from "../components/ConfirmDialog";

const Sessions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"planner" | "logger">("planner");

  // Planned sessions (status: planned)
  const [plannedSessions, setPlannedSessions] = useState<SessionWithExercises[]>([]);
  const [loadingPlanned, setLoadingPlanned] = useState(true);

  // Active sessions (status: in_progress)
  const [activeSessions, setActiveSessions] = useState<SessionWithExercises[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);

  // Confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Load planned sessions
  useEffect(() => {
    const loadPlanned = async () => {
      try {
        const response = await listSessions({
          status: "planned",
          limit: 50,
        });
        setPlannedSessions(response.data);
      } catch (error) {
        logger.apiError("Failed to load planned sessions", error, "/api/v1/sessions", "GET");
      } finally {
        setLoadingPlanned(false);
      }
    };

    void loadPlanned();
  }, []);

  // Load active sessions
  useEffect(() => {
    const loadActive = async () => {
      try {
        const response = await listSessions({
          status: "in_progress",
          limit: 20,
        });
        setActiveSessions(response.data);
      } catch (error) {
        logger.apiError("Failed to load active sessions", error, "/api/v1/sessions", "GET");
      } finally {
        setLoadingActive(false);
      }
    };

    void loadActive();
  }, []);

  const handleDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) {
      return;
    }

    setShowDeleteConfirm(false);

    try {
      await deleteSession(sessionToDelete);
      setPlannedSessions(plannedSessions.filter((s) => s.id !== sessionToDelete));
      toast.success("Session deleted successfully");
      setSessionToDelete(null);
    } catch (error) {
      logger.apiError(
        "Failed to delete session",
        error,
        `/api/v1/sessions/${sessionToDelete}`,
        "DELETE",
      );
      toast.error("Failed to delete session. Please try again.");
      setSessionToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <PageIntro
      eyebrow={t("sessions.eyebrow")}
      title={t("sessions.title")}
      description={t("sessions.description")}
    >
      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("planner")}
          aria-selected={activeTab === "planner"}
          role="tab"
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "8px 8px 0 0",
            background: activeTab === "planner" ? "var(--color-accent)" : "transparent",
            color: activeTab === "planner" ? "#0f172a" : "var(--color-text-secondary)",
            fontWeight: activeTab === "planner" ? 600 : 500,
            border: "none",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          {t("sessions.plannerTab")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logger")}
          aria-selected={activeTab === "logger"}
          role="tab"
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "8px 8px 0 0",
            background: activeTab === "logger" ? "var(--color-accent)" : "transparent",
            color: activeTab === "logger" ? "#0f172a" : "var(--color-text-secondary)",
            fontWeight: activeTab === "logger" ? 600 : 500,
            border: "none",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          {t("sessions.loggerTab")}
        </button>
      </div>

      {/* Planner Tab Content */}
      {activeTab === "planner" && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
              onClick={() => navigate("/planner")}
            >
              Create New Session
            </Button>
          </div>

          {loadingPlanned ? (
            <Card>
              <CardContent>
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {t("common.loading")}
                </div>
              </CardContent>
            </Card>
          ) : plannedSessions.length === 0 ? (
            <Card>
              <CardContent>
                <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
                  <Calendar size={48} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                    No planned sessions
                  </h3>
                  <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
                    Create your first workout session to get started
                  </p>
                  <Button
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    onClick={() => navigate("/planner")}
                  >
                    Create Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {plannedSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
                            {session.title || "Untitled Session"}
                          </h3>
                          <span
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "8px",
                              background: "rgba(59, 130, 246, 0.15)",
                              color: "rgb(59, 130, 246)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            Planned
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              color: "var(--color-text-secondary)",
                              fontSize: "0.9rem",
                            }}
                          >
                            <Calendar size={16} />
                            {formatDate(session.planned_at)}
                          </div>
                          {session.exercises && session.exercises.length > 0 && (
                            <div
                              style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}
                            >
                              {session.exercises.length}{" "}
                              {session.exercises.length === 1 ? "exercise" : "exercises"}
                            </div>
                          )}
                        </div>

                        {session.notes && (
                          <p
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "0.9rem",
                              margin: "0.5rem 0 0",
                            }}
                          >
                            {session.notes}
                          </p>
                        )}

                        {session.exercises && session.exercises.length > 0 && (
                          <div style={{ marginTop: "0.75rem" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                              {session.exercises.slice(0, 5).map((ex, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    padding: "0.35rem 0.75rem",
                                    borderRadius: "8px",
                                    background: "rgba(148, 163, 184, 0.1)",
                                    color: "var(--color-text-secondary)",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  {ex.exercise_id || "Custom Exercise"}
                                </span>
                              ))}
                              {session.exercises.length > 5 && (
                                <span
                                  style={{
                                    padding: "0.35rem 0.75rem",
                                    borderRadius: "8px",
                                    color: "var(--color-text-muted)",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  +{session.exercises.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => navigate(`/logger/${session.id}`)}
                          aria-label="Start session"
                          style={{
                            padding: "0.5rem",
                            borderRadius: "8px",
                            background: "rgba(52, 211, 153, 0.15)",
                            color: "var(--color-accent)",
                            border: "none",
                            cursor: "pointer",
                            lineHeight: 0,
                          }}
                        >
                          <Play size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/sessions/${session.id}`)}
                          aria-label="View session"
                          style={{
                            padding: "0.5rem",
                            borderRadius: "8px",
                            background: "rgba(148, 163, 184, 0.1)",
                            color: "var(--color-text-secondary)",
                            border: "none",
                            cursor: "pointer",
                            lineHeight: 0,
                          }}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => void handleDeleteSession(session.id)}
                          aria-label="Delete session"
                          style={{
                            padding: "0.5rem",
                            borderRadius: "8px",
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "var(--color-danger)",
                            border: "none",
                            cursor: "pointer",
                            lineHeight: 0,
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logger Tab Content */}
      {activeTab === "logger" && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {loadingActive ? (
            <Card>
              <CardContent>
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {t("common.loading")}
                </div>
              </CardContent>
            </Card>
          ) : activeSessions.length === 0 ? (
            <Card>
              <CardContent>
                <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
                  <Play size={48} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                    No active sessions
                  </h3>
                  <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
                    Start a planned session from the Planner tab to begin logging
                  </p>
                  <Button variant="secondary" onClick={() => setActiveTab("planner")}>
                    Go to Planner
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {activeSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
                            {session.title || "Untitled Session"}
                          </h3>
                          <span
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "8px",
                              background: "rgba(52, 211, 153, 0.15)",
                              color: "var(--color-accent)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            In Progress
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              color: "var(--color-text-secondary)",
                              fontSize: "0.9rem",
                            }}
                          >
                            <Calendar size={16} />
                            Started{" "}
                            {session.started_at ? formatDate(session.started_at) : "recently"}
                          </div>
                          {session.exercises && session.exercises.length > 0 && (
                            <div
                              style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}
                            >
                              {session.exercises.length}{" "}
                              {session.exercises.length === 1 ? "exercise" : "exercises"}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Play size={16} />}
                        onClick={() => navigate(`/logger/${session.id}`)}
                      >
                        Continue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmLabel="Yes, Delete Session"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void confirmDeleteSession()}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSessionToDelete(null);
        }}
      />
    </PageIntro>
  );
};

export default Sessions;
