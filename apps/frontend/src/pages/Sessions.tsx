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
      toast.success(labels.deleteSuccess);
      setSessionToDelete(null);
    } catch (error) {
      logger.apiError(
        "Failed to delete session",
        error,
        `/api/v1/sessions/${sessionToDelete}`,
        "DELETE",
      );
      toast.error(labels.deleteError);
      setSessionToDelete(null);
    }
  };

  const labels = {
    createNew: t("sessions.createNew"),
    createSession: t("sessions.createSession"),
    noPlanned: t("sessions.noPlanned"),
    createFirst: t("sessions.createFirst"),
    exercise: t("sessions.exercise"),
    exercises: t("sessions.exercises"),
    more: t("sessions.more"),
    startSession: t("sessions.startSession"),
    viewSession: t("sessions.viewSession"),
    deleteSession: t("sessions.deleteSession"),
    deleteConfirmTitle: t("sessions.deleteConfirmTitle"),
    deleteConfirmMessage: t("sessions.deleteConfirmMessage"),
    deleteConfirmLabel: t("sessions.deleteConfirmLabel"),
    deleteSuccess: t("sessions.deleteSuccess"),
    deleteError: t("sessions.deleteError"),
    noActive: t("sessions.noActive"),
    startFromPlanner: t("sessions.startFromPlanner"),
    goToPlanner: t("sessions.goToPlanner"),
    statusPlanned: t("sessions.statusPlanned"),
    statusInProgress: t("sessions.statusInProgress"),
    cancel: t("common.cancel"),
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
              {labels.createNew}
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
                  <Calendar size={48} className="icon icon--muted sessions-empty-icon" />
                  <h3 className="text-125 mb-05">{labels.noPlanned}</h3>
                  <p className="text-secondary mb-15">{labels.createFirst}</p>
                  <Button
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    onClick={() => void navigate("/planner")}
                  >
                    {labels.createSession}
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
                          <span className="status-badge status-badge--planned">
                            {labels.statusPlanned}
                          </span>
                        </div>

                        <div className="sessions-meta">
                          <div className="sessions-meta-item">
                            <Calendar size={16} />
                            {formatDate(session.planned_at)}
                          </div>
                          {session.exercises && session.exercises.length > 0 && (
                            <div className="text-09 text-secondary">
                              {session.exercises.length}{" "}
                              {session.exercises.length === 1 ? labels.exercise : labels.exercises}
                            </div>
                          )}
                        </div>

                        {session.notes && (
                          <p className="text-09 text-secondary sessions-notes">{session.notes}</p>
                        )}

                        {session.exercises && session.exercises.length > 0 && (
                          <div className="mt-075">
                            <div className="flex flex--wrap flex--gap-05">
                              {session.exercises.slice(0, 5).map((ex, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-sm text-085 text-secondary sessions-exercise-tag"
                                >
                                  {ex.exercise_id || t("sessions.customExercise")}
                                </span>
                              ))}
                              {session.exercises.length > 5 && (
                                <span className="rounded-sm text-085 text-muted sessions-exercise-tag sessions-exercise-tag--more">
                                  +{session.exercises.length - 5} {labels.more}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex--gap-05">
                        <button
                          onClick={() => void navigate(`/logger/${session.id}`)}
                          aria-label={labels.startSession}
                          className="sessions-icon-button sessions-icon-button--start"
                        >
                          <Play size={18} />
                        </button>
                        <button
                          onClick={() => void navigate(`/sessions/${session.id}`)}
                          aria-label={labels.viewSession}
                          className="sessions-icon-button sessions-icon-button--view"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => void handleDeleteSession(session.id)}
                          aria-label={labels.deleteSession}
                          className="sessions-icon-button sessions-icon-button--delete"
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
        <div className="grid grid--gap-15">
          {loadingActive ? (
            <Card>
              <CardContent>
                <div className="sessions-loading-state">{t("common.loading")}</div>
              </CardContent>
            </Card>
          ) : activeSessions.length === 0 ? (
            <Card>
              <CardContent>
                <div className="empty-state">
                  <Play size={48} className="icon icon--muted sessions-empty-icon" />
                  <h3 className="text-125 mb-05">{labels.noActive}</h3>
                  <p className="text-secondary mb-15">{labels.startFromPlanner}</p>
                  <Button variant="secondary" onClick={() => setActiveTab("planner")}>
                    {labels.goToPlanner}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid--gap-md">
              {activeSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent>
                    <div className="flex flex--align-start flex--gap-md">
                      <div className="flex-1">
                        <div className="flex flex--align-center flex--gap-075 mb-05">
                          <h3 className="text-11 font-weight-600 m-0">
                            {session.title || t("sessions.untitled")}
                          </h3>
                          <span className="status-badge status-badge--active">
                            {labels.statusInProgress}
                          </span>
                        </div>

                        <div className="sessions-meta">
                          <div className="sessions-meta-item">
                            <Calendar size={16} />
                            {t("sessions.started")}{" "}
                            {session.started_at
                              ? formatDate(session.started_at)
                              : t("sessions.recently")}
                          </div>
                          {session.exercises && session.exercises.length > 0 && (
                            <div className="text-09 text-secondary">
                              {session.exercises.length}{" "}
                              {session.exercises.length === 1 ? labels.exercise : labels.exercises}
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
        title={labels.deleteConfirmTitle}
        message={labels.deleteConfirmMessage}
        confirmLabel={labels.deleteConfirmLabel}
        cancelLabel={labels.cancel}
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
