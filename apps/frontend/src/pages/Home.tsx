import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth.store";
import { useRequiredFieldValidation } from "../hooks/useRequiredFieldValidation";
import {
  listExercises,
  createExercise,
  listSessions,
  createSession,
  type Exercise,
} from "../services/api";
import { logger } from "../utils/logger";
import { scheduleIdleTask } from "../utils/idleScheduler";

// Import SVG icons
import earthStrengthIcon from "../assets/icons/earth-strength.svg";
import airAgilityIcon from "../assets/icons/air-agility.svg";
import waterEnduranceIcon from "../assets/icons/water-endurance.svg";
import fireExplosivityIcon from "../assets/icons/fire-explosivity.svg";
import shadowIntelligenceIcon from "../assets/icons/shadow-intelligence.svg";
import aetherRegenerationIcon from "../assets/icons/aether-regeneration.svg";

type VibeKey =
  | "strength"
  | "agility"
  | "endurance"
  | "explosivity"
  | "intelligence"
  | "regeneration";

type Vibe = {
  key: VibeKey;
  colorBg: string; // Background color for button
  colorText: string; // Text/icon color for contrast
  colorBorder: string; // Border color
  icon: string; // SVG icon path
};

type Period = "day" | "week" | "month" | "quarter" | "semester" | "year";

type ExerciseHistoryItem = {
  id: string;
  name: string;
  vibe: VibeKey;
  date: string;
};

const VIBES: Vibe[] = [
  {
    key: "strength",
    colorBg: "#FB951D",
    colorText: "#0B0C10",
    colorBorder: "#FB951D",
    icon: earthStrengthIcon,
  },
  {
    key: "agility",
    colorBg: "#FAE919",
    colorText: "#0B0C10",
    colorBorder: "#FAE919",
    icon: airAgilityIcon,
  },
  {
    key: "endurance",
    colorBg: "#002322",
    colorText: "#FFFFFF",
    colorBorder: "#5CB2F5",
    icon: waterEnduranceIcon,
  },
  {
    key: "explosivity",
    colorBg: "#9F2406",
    colorText: "#FFFFFF",
    colorBorder: "#FDC54D",
    icon: fireExplosivityIcon,
  },
  {
    key: "intelligence",
    colorBg: "#001817",
    colorText: "#FFFFFF",
    colorBorder: "#5CB2F5",
    icon: shadowIntelligenceIcon,
  },
  {
    key: "regeneration",
    colorBg: "#15523A",
    colorText: "#FFFFFF",
    colorBorder: "#4D7C62",
    icon: aetherRegenerationIcon,
  },
];

// Map vibe names to type_code used by backend
const VIBE_TO_TYPE_CODE: Record<VibeKey, string> = {
  strength: "strength",
  agility: "agility",
  endurance: "endurance",
  explosivity: "explosivity",
  intelligence: "intelligence",
  regeneration: "regeneration",
};

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const formRef = useRef<HTMLFormElement>(null);
  useRequiredFieldValidation(formRef, t);

  // State declarations (must be before any early returns per React hooks rules)
  const [selectedVibe, setSelectedVibe] = useState<VibeKey | null>(null);
  const [hoveredVibe, setHoveredVibe] = useState<VibeKey | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [period, setPeriod] = useState<Period>("week");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseMode, setExerciseMode] = useState<"select" | "create">("select");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exercise detail form fields
  const [sets, setSets] = useState<string>("");
  const [reps, setReps] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [resistance, setResistance] = useState<string>("");
  const [speed, setSpeed] = useState<string>("");
  const [rpe, setRpe] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Fetch exercises for the select dropdown
  const fetchExercises = useCallback(async () => {
    if (!selectedVibe) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const result = await listExercises({
        type_code: VIBE_TO_TYPE_CODE[selectedVibe],
        limit: 100,
      });
      setExercises(result.data);
    } catch (err) {
      logger.apiError("Failed to fetch exercises", err, "/api/v1/exercises", "GET");
      setError("Failed to load exercises");
    } finally {
      setIsLoading(false);
    }
  }, [selectedVibe]);

  // Fetch exercise history from sessions
  const fetchExerciseHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range based on selected period
      const now = new Date();
      const fromDate = new Date(now);
      // Add 10 seconds buffer to ensure we catch recently created sessions
      const toDate = new Date(now.getTime() + 10000);

      switch (period) {
        case "day":
          fromDate.setDate(now.getDate() - 1);
          break;
        case "week":
          fromDate.setDate(now.getDate() - 7);
          break;
        case "month":
          fromDate.setMonth(now.getMonth() - 1);
          break;
        case "quarter":
          fromDate.setMonth(now.getMonth() - 3);
          break;
        case "semester":
          fromDate.setMonth(now.getMonth() - 6);
          break;
        case "year":
          fromDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch all exercises once
      const allExercisesResult = await listExercises({ limit: 1000 });
      const exerciseCache = new Map<string, Exercise>();
      allExercisesResult.data.forEach((ex) => exerciseCache.set(ex.id, ex));

      // Fetch sessions
      const sessions = await listSessions({
        planned_from: fromDate.toISOString(),
        planned_to: toDate.toISOString(),
        limit: 100,
      });

      // Extract exercises from sessions and build history
      const history: ExerciseHistoryItem[] = [];

      for (const session of sessions.data) {
        for (const sessionExercise of session.exercises) {
          if (!sessionExercise.exercise_id) {
            continue;
          }

          const exercise = exerciseCache.get(sessionExercise.exercise_id);
          if (exercise && exercise.type_code) {
            // Map type_code back to vibe
            const vibeKey = Object.entries(VIBE_TO_TYPE_CODE).find(
              ([, typeCode]) => typeCode === exercise.type_code,
            )?.[0] as VibeKey | undefined;

            if (vibeKey) {
              history.push({
                id: `${session.id}-${sessionExercise.id}`,
                name: exercise.name,
                vibe: vibeKey,
                date: session.planned_at,
              });
            }
          }
        }
      }

      // Sort by date descending (newest first)
      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setExerciseHistory(history);
    } catch (err) {
      logger.apiError("Failed to fetch exercise history", err, "/api/v1/sessions", "GET");
      setError("Failed to load exercise history");
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  // Fetch exercises when modal opens in select mode
  useEffect(() => {
    if (showModal && exerciseMode === "select" && selectedVibe) {
      void fetchExercises();
    }
  }, [showModal, exerciseMode, selectedVibe, fetchExercises]);

  // Fetch exercise history when period changes
  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    const { cancel } = scheduleIdleTask(
      () => {
        if (!isCancelled) {
          void fetchExerciseHistory();
        }
      },
      { timeout: 1800 },
    );

    return () => {
      isCancelled = true;
      cancel();
    };
  }, [period, fetchExerciseHistory]);

  // Authentication guard - redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { from: { pathname: "/" } } });
    }
  }, [isAuthenticated, navigate]);

  // Don't render anything if not authenticated (prevents flash before redirect)
  if (!isAuthenticated) {
    return null;
  }

  const handleVibeClick = (vibeKey: VibeKey) => {
    setSelectedVibe(vibeKey);
    setShowModal(true);
  };

  const handleAddExercise = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }

    if (!selectedVibe) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let exerciseId = selectedExerciseId;

      if (exerciseMode === "create") {
        // Create new exercise
        const newExercise = await createExercise({
          name: exerciseName,
          type_code: VIBE_TO_TYPE_CODE[selectedVibe],
          is_public: false,
        });
        exerciseId = newExercise.id;
      }

      // Create a session with the exercise data
      const createdSession = await createSession({
        planned_at: new Date().toISOString(),
        visibility: "private",
        exercises: [
          {
            exercise_id: exerciseId,
            order: 1,
            notes: notes || null,
            actual: {
              sets: sets ? parseInt(sets, 10) : null,
              reps: reps ? parseInt(reps, 10) : null,
              load: weight ? parseFloat(weight) : null,
              distance: distance ? parseFloat(distance) : null,
              duration: duration ? `PT${duration}M` : null, // ISO 8601 duration format
              rpe: rpe ? parseInt(rpe, 10) : null,
              extras: {
                resistance: resistance || null,
                speed: speed || null,
              },
            },
          },
        ],
      });

      // Optimistically add the new exercise to history
      const displayName =
        exerciseMode === "create"
          ? exerciseName
          : exercises.find((ex) => ex.id === exerciseId)?.name || "Unknown";

      const newHistoryItem: ExerciseHistoryItem = {
        id: `${createdSession.id}-${createdSession.exercises[0]?.id || "new"}`,
        name: displayName,
        vibe: selectedVibe,
        date: createdSession.planned_at,
      };

      setExerciseHistory((prev) => [newHistoryItem, ...prev]);

      // Close modal and reset
      setShowModal(false);
      setExerciseName("");
      setSelectedExerciseId("");
      setExerciseMode("select");
      setSelectedVibe(null);
      setSets("");
      setReps("");
      setDuration("");
      setWeight("");
      setDistance("");
      setResistance("");
      setSpeed("");
      setRpe("");
      setNotes("");

      // Refresh exercise history in the background to sync with server
      setTimeout(() => {
        void fetchExerciseHistory();
      }, 500);
    } catch (err) {
      logger.apiError("Failed to add exercise", err, "/api/v1/sessions", "POST");
      setError("Failed to add exercise");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setExerciseName("");
    setSelectedExerciseId("");
    setExerciseMode("select");
    setSelectedVibe(null);
    setError(null);
    setSets("");
    setReps("");
    setDuration("");
    setWeight("");
    setDistance("");
    setResistance("");
    setSpeed("");
    setRpe("");
    setNotes("");
  };

  const isFormValid =
    exerciseMode === "create" ? exerciseName.trim().length > 0 : selectedExerciseId.length > 0;

  return (
    <main
      className="flex flex--column p-xl flex--gap-xl"
      style={{ flex: 1, background: "var(--color-bg)" }}
    >
      <div
        className="grid flex--gap-xl w-full"
        style={{ gridTemplateColumns: "1fr 400px", maxWidth: "1400px", margin: "0 auto" }}
      >
        {/* Left Side - Vibe Buttons */}
        <div className="flex flex--column flex--gap-xl">
          <div>
            <h1
              className="text-3xl font-weight-600 text-primary mb-05"
              style={{ fontFamily: "var(--font-family-heading)" }}
            >
              {t("vibesHome.title")}
            </h1>
            <p className="text-lg text-muted">{t("vibesHome.subtitle")}</p>
          </div>

          {/* Vibe Buttons Grid */}
          <div className="grid p-xl flex--gap-xl" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {VIBES.map((vibe) => (
              <div key={vibe.key} className="flex flex--column flex--align-center flex--gap-md">
                <button
                  type="button"
                  onClick={() => handleVibeClick(vibe.key)}
                  onMouseEnter={() => setHoveredVibe(vibe.key)}
                  onMouseLeave={() => setHoveredVibe(null)}
                  style={{
                    width: "140px",
                    height: "140px",
                    borderRadius: "50%",
                    border: `4px solid ${vibe.colorBorder}`,
                    background: vibe.colorBg,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                    transform: hoveredVibe === vibe.key ? "scale(1.1)" : "scale(1)",
                    boxShadow:
                      hoveredVibe === vibe.key
                        ? `0 0 30px ${vibe.colorBorder}88`
                        : `0 0 15px ${vibe.colorBorder}44`,
                    padding: "0",
                    color: vibe.colorText,
                  }}
                  aria-label={t(`vibes.${vibe.key}.name`)}
                >
                  <img
                    src={vibe.icon}
                    alt=""
                    style={{
                      width: "64px",
                      height: "64px",
                      filter:
                        vibe.colorText === "#FFFFFF" ? "brightness(0) invert(1)" : "brightness(0)",
                    }}
                  />
                </button>

                {/* Hover Info */}
                <div
                  className="text-center"
                  style={{
                    opacity: hoveredVibe === vibe.key ? 1 : 0.6,
                    transition: "opacity 0.3s ease",
                    minHeight: "80px",
                  }}
                >
                  <div className="text-lg font-weight-600 mb-025" style={{ color: vibe.colorBg }}>
                    {t(`vibes.${vibe.key}.name`)}
                  </div>
                  <div className="text-xs text-secondary mb-05" style={{ fontStyle: "italic" }}>
                    {t(`vibes.${vibe.key}.element`)}
                  </div>
                  {hoveredVibe === vibe.key && (
                    <div className="text-sm text-muted" style={{ lineHeight: "1.4" }}>
                      {t(`vibes.${vibe.key}.activities`)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Exercise History */}
        <div
          className="card flex flex--column"
          style={{
            height: "fit-content",
            maxHeight: "calc(100vh - 200px)",
            overflow: "hidden",
            padding: "1.5rem",
          }}
        >
          <h2 className="text-xl font-weight-600 text-primary mb-1">
            {t("vibesHome.history.title")}
          </h2>

          {/* Period Selector */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="period-select"
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              {t("vibesHome.history.period")}
            </label>
            <select
              id="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-md)",
                cursor: "pointer",
              }}
            >
              <option value="day">{t("vibesHome.history.day")}</option>
              <option value="week">{t("vibesHome.history.week")}</option>
              <option value="month">{t("vibesHome.history.month")}</option>
              <option value="quarter">{t("vibesHome.history.quarter")}</option>
              <option value="semester">{t("vibesHome.history.semester")}</option>
              <option value="year">{t("vibesHome.history.year")}</option>
            </select>
          </div>

          {/* Exercise List */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {isLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {t("common.loading")}
              </div>
            ) : exerciseHistory.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {t("vibesHome.history.noExercises")}
              </div>
            ) : (
              exerciseHistory.map((exercise) => {
                const vibeColor = VIBES.find((v) => v.key === exercise.vibe)?.colorBg || "#ccc";
                return (
                  <div
                    key={exercise.id}
                    style={{
                      padding: "1rem",
                      borderRadius: "12px",
                      background: "var(--color-bg)",
                      border: `1px solid ${vibeColor}44`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "var(--font-size-md)",
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {exercise.name}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-size-sm)",
                          color: vibeColor,
                        }}
                      >
                        {t(`vibes.${exercise.vibe}.name`)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {new Date(exercise.date).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal for Adding Exercise */}
      {showModal && selectedVibe && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "18px",
              border: `2px solid ${VIBES.find((v) => v.key === selectedVibe)?.colorBorder}`,
              padding: "2rem",
              maxWidth: "700px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form
              ref={formRef}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onSubmit={handleAddExercise}
              className="form form--gap-lg"
            >
              <h3
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: "1.5rem",
                }}
              >
                {t("vibesHome.addExercise.title")}
              </h3>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "12px",
                    background: "var(--color-error-bg)",
                    border: "1px solid var(--color-error-border)",
                    color: "var(--color-error-text)",
                    marginBottom: "1rem",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Mode Selector */}
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setExerciseMode("select");
                    setExerciseName("");
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "12px",
                    border: `2px solid ${exerciseMode === "select" ? VIBES.find((v) => v.key === selectedVibe)?.colorBorder : "var(--color-border)"}`,
                    background:
                      exerciseMode === "select"
                        ? `${VIBES.find((v) => v.key === selectedVibe)?.colorBg}22`
                        : "transparent",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--font-size-md)",
                    cursor: "pointer",
                    fontWeight: exerciseMode === "select" ? 600 : 400,
                  }}
                >
                  {t("vibesHome.addExercise.selectExisting")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExerciseMode("create");
                    setSelectedExerciseId("");
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "12px",
                    border: `2px solid ${exerciseMode === "create" ? VIBES.find((v) => v.key === selectedVibe)?.colorBorder : "var(--color-border)"}`,
                    background:
                      exerciseMode === "create"
                        ? `${VIBES.find((v) => v.key === selectedVibe)?.colorBg}22`
                        : "transparent",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--font-size-md)",
                    cursor: "pointer",
                    fontWeight: exerciseMode === "create" ? 600 : 400,
                  }}
                >
                  {t("vibesHome.addExercise.createNew")}
                </button>
              </div>

              {/* Exercise Input */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  htmlFor="exercise-name"
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  {t("vibesHome.addExercise.exerciseName")}
                </label>
                {exerciseMode === "select" ? (
                  <select
                    id="exercise-name"
                    name="exercise-name"
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    disabled={isLoading}
                    required={exerciseMode === "select"}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--font-size-md)",
                      cursor: isLoading ? "wait" : "pointer",
                    }}
                  >
                    <option value="">
                      {isLoading ? t("common.loading") : "Select exercise..."}
                    </option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="exercise-name"
                    name="exercise-name"
                    type="text"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    placeholder={t("vibesHome.addExercise.exerciseNamePlaceholder")}
                    disabled={isLoading}
                    required={exerciseMode === "create"}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--font-size-md)",
                    }}
                  />
                )}
              </div>

              {/* Exercise Details Section */}
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <h4
                  style={{
                    fontSize: "var(--font-size-md)",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: "1rem",
                  }}
                >
                  {t("vibesHome.addExercise.exerciseDetails")}
                </h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  {/* Sets */}
                  <div>
                    <label
                      htmlFor="sets"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {t("vibesHome.addExercise.sets")}
                    </label>
                    <input
                      id="sets"
                      type="number"
                      min="0"
                      value={sets}
                      onChange={(e) => setSets(e.target.value)}
                      placeholder={t("vibesHome.addExercise.setsPlaceholder")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-md)",
                      }}
                    />
                  </div>

                  {/* Reps */}
                  <div>
                    <label
                      htmlFor="reps"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {t("vibesHome.addExercise.reps")}
                    </label>
                    <input
                      id="reps"
                      type="number"
                      min="0"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      placeholder={t("vibesHome.addExercise.repsPlaceholder")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-md)",
                      }}
                    />
                  </div>

                  {/* Weight */}
                  <div>
                    <label
                      htmlFor="weight"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {t("vibesHome.addExercise.weight")}
                    </label>
                    <input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder={t("vibesHome.addExercise.weightPlaceholder")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-md)",
                      }}
                    />
                  </div>

                  {/* RPE */}
                  <div>
                    <label
                      htmlFor="rpe"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {t("vibesHome.addExercise.rpe")}
                    </label>
                    <input
                      id="rpe"
                      type="number"
                      min="1"
                      max="10"
                      value={rpe}
                      onChange={(e) => setRpe(e.target.value)}
                      placeholder={t("vibesHome.addExercise.rpePlaceholder")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-md)",
                      }}
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label
                      htmlFor="duration"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {t("vibesHome.addExercise.duration")}
                    </label>
                    <input
                      id="duration"
                      type="number"
                      min="0"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder={t("vibesHome.addExercise.durationPlaceholder")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-md)",
                      }}
                    />
                  </div>

                  {/* Distance */}
                  <div>
                    <label
                      htmlFor="distance"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {t("vibesHome.addExercise.distance")}
                    </label>
                    <input
                      id="distance"
                      type="number"
                      min="0"
                      step="0.1"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder={t("vibesHome.addExercise.distancePlaceholder")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-md)",
                      }}
                    />
                  </div>

                  {/* Resistance */}
                  <div>
                    <label
                      htmlFor="resistance"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {t("vibesHome.addExercise.resistance")}
                    </label>
                    <input
                      id="resistance"
                      type="text"
                      value={resistance}
                      onChange={(e) => setResistance(e.target.value)}
                      placeholder={t("vibesHome.addExercise.resistancePlaceholder")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-md)",
                      }}
                    />
                  </div>

                  {/* Speed */}
                  <div>
                    <label htmlFor="speed" className="form-label-text block mb-05">
                      {t("vibesHome.addExercise.speed")}
                    </label>
                    <input
                      id="speed"
                      type="text"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      placeholder={t("vibesHome.addExercise.speedPlaceholder")}
                      disabled={isLoading}
                      className="form-input"
                      style={{ background: "var(--color-surface)" }}
                    />
                  </div>
                </div>

                {/* Notes - full width */}
                <div className="mt-1">
                  <label htmlFor="notes" className="form-label-text block mb-05">
                    {t("vibesHome.addExercise.notes")}
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("vibesHome.addExercise.notesPlaceholder")}
                    disabled={isLoading}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--font-size-md)",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              {/* Selected Vibe Display */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  background: `${VIBES.find((v) => v.key === selectedVibe)?.colorBg}22`,
                  border: `1px solid ${VIBES.find((v) => v.key === selectedVibe)?.colorBorder}`,
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {t("vibesHome.addExercise.selectVibe")}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: 600,
                    color: VIBES.find((v) => v.key === selectedVibe)?.colorBg,
                  }}
                >
                  {t(`vibes.${selectedVibe}.name`)} ({t(`vibes.${selectedVibe}.element`)})
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--font-size-md)",
                    cursor: isLoading ? "wait" : "pointer",
                    fontWeight: 500,
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  {t("vibesHome.addExercise.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "12px",
                    border: "none",
                    background:
                      isFormValid && !isLoading
                        ? VIBES.find((v) => v.key === selectedVibe)?.colorBg
                        : "var(--color-border)",
                    color:
                      isFormValid && !isLoading
                        ? VIBES.find((v) => v.key === selectedVibe)?.colorText
                        : "var(--color-text-muted)",
                    fontSize: "var(--font-size-md)",
                    cursor: isFormValid && !isLoading ? "pointer" : "not-allowed",
                    fontWeight: 600,
                  }}
                >
                  {isLoading ? t("common.loading") : t("vibesHome.addExercise.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
