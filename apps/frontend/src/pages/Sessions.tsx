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
      toast.success(t("sessions.deleteSuccess"));
      setSessionToDelete(null);
    } catch (error) {
      logger.apiError(
        "Failed to delete session",
        error,
        `/api/v1/sessions/${sessionToDelete}`,
        "DELETE",
      );
      toast.error(t("sessions.deleteError"));
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
      <div className="tabs">
        <button
          type="button"
          onClick={() => setActiveTab("planner")}
          aria-selected={activeTab === "planner"}
          role="tab"
          className={activeTab === "planner" ? "tab tab--active" : "tab"}
        >
          {t("sessions.plannerTab")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logger")}
          aria-selected={activeTab === "logger"}
          role="tab"
          className={activeTab === "logger" ? "tab tab--active" : "tab"}
        >
          {t("sessions.loggerTab")}
        </button>
      </div>

      {/* Planner Tab Content */}
      {activeTab === "planner" && (
        <div className="grid grid--gap-15">
          <div className="flex flex--justify-end">
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
              onClick={() => void navigate("/planner")}
            >
              {t("sessions.createNew")}
            </Button>
          </div>

          {loadingPlanned ? (
            <Card>
              <CardContent>
                <div className="empty-state text-secondary">{t("common.loading")}</div>
              </CardContent>
            </Card>
          ) : plannedSessions.length === 0 ? (
            <Card>
              <CardContent>
                <div className="empty-state">
                  <Calendar
                    size={48}
                    className="icon icon--muted"
                    style={{ margin: "0 auto 1rem" }}
                  />
                  <h3 className="text-125 mb-05">{t("sessions.noPlanned")}</h3>
                  <p className="text-secondary mb-15">{t("sessions.createFirst")}</p>
                  <Button
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    onClick={() => void navigate("/planner")}
                  >
                    {t("sessions.createSession")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid--gap-md">
              {plannedSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent>
                    <div className="flex flex--align-start flex--gap-md">
                      <div className="flex-1">
                        <div className="flex flex--align-center flex--gap-075 mb-05">
                          <h3 className="text-11 font-weight-600 m-0">
                            {session.title || t("sessions.untitled")}
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
                            {t("sessions.statusPlanned")}
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
                            <div className="text-09 text-secondary">
                              {session.exercises.length}{" "}
                              {session.exercises.length === 1
                                ? t("sessions.exercise")
                                : t("sessions.exercises")}
                            </div>
                          )}
                        </div>

                        {session.notes && (
                          <p className="text-09 text-secondary" style={{ margin: "0.5rem 0 0" }}>
                            {session.notes}
                          </p>
                        )}

                        {session.exercises && session.exercises.length > 0 && (
                          <div className="mt-075">
                            <div className="flex flex--wrap flex--gap-05">
                              {session.exercises.slice(0, 5).map((ex, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-sm text-085 text-secondary"
                                  style={{
                                    padding: "0.35rem 0.75rem",
                                    background: "rgba(148, 163, 184, 0.1)",
                                  }}
                                >
                                  {ex.exercise_id || t("sessions.customExercise")}
                                </span>
                              ))}
                              {session.exercises.length > 5 && (
                                <span
                                  className="rounded-sm text-085 text-muted"
                                  style={{ padding: "0.35rem 0.75rem" }}
                                >
                                  +{session.exercises.length - 5} {t("sessions.more")}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex--gap-05">
                        <button
                          onClick={() => void navigate(`/logger/${session.id}`)}
                          aria-label={t("sessions.startSession")}
                          className="rounded-sm"
                          style={{
                            padding: "0.5rem",
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
                          onClick={() => void navigate(`/sessions/${session.id}`)}
                          aria-label={t("sessions.viewSession")}
                          className="rounded-sm"
                          style={{
                            padding: "0.5rem",
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
                          aria-label={t("sessions.deleteSession")}
                          className="rounded-sm"
                          style={{
                            padding: "0.5rem",
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
                    {t("sessions.noActive")}
                  </h3>
                  <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
                    {t("sessions.startFromPlanner")}
                  </p>
                  <Button variant="secondary" onClick={() => setActiveTab("planner")}>
                    {t("sessions.goToPlanner")}
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
                            {session.title || t("sessions.untitled")}
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
                            {t("sessions.statusInProgress")}
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
                            {t("sessions.started")}{" "}
                            {session.started_at
                              ? formatDate(session.started_at)
                              : t("sessions.recently")}
                          </div>
                          {session.exercises && session.exercises.length > 0 && (
                            <div
                              style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}
                            >
                              {session.exercises.length}{" "}
                              {session.exercises.length === 1
                                ? t("sessions.exercise")
                                : t("sessions.exercises")}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Play size={16} />}
                        onClick={() => void navigate(`/logger/${session.id}`)}
                      >
                        {t("sessions.continue")}
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
        title={t("sessions.deleteConfirmTitle")}
        message={t("sessions.deleteConfirmMessage")}
        confirmLabel={t("sessions.deleteConfirmLabel")}
        cancelLabel={t("common.cancel")}
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
