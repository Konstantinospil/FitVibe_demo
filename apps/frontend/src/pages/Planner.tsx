import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Calendar, Save, Trash2 } from "lucide-react";
import PageIntro from "../components/PageIntro";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { useRequiredFieldValidation } from "../hooks/useRequiredFieldValidation";
import {
  listExercises,
  createSession,
  type Exercise,
  type SessionExerciseInput,
  type CreateSessionRequest,
} from "../services/api";
import { logger } from "../utils/logger";

interface ExerciseInSession {
  tempId: string;
  exercise: Exercise | null;
  exerciseName: string;
  order: number;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  restSec: number | null;
  notes: string;
}

const Planner: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  useRequiredFieldValidation(formRef, t);
  const i18nLabel = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  // Session metadata
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [plannedDate, setPlannedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [plannedTime, setPlannedTime] = useState("09:00");

  // Exercise management
  const [exercises, setExercises] = useState<ExerciseInSession[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseResults, setExerciseResults] = useState<Exercise[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search exercises with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (exerciseSearch.trim().length < 2) {
      setExerciseResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(
      () =>
        void (async () => {
          try {
            const response = await listExercises({
              q: exerciseSearch,
              limit: 10,
              include_archived: false,
            });
            setExerciseResults(response.data);
            setShowSearchResults(true);
          } catch (error) {
            logger.apiError("Failed to search exercises", error, "/api/v1/exercises", "GET");
            setExerciseResults([]);
          } finally {
            setIsSearching(false);
          }
        })(),
      300,
    );

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [exerciseSearch]);

  const addExercise = (exercise: Exercise) => {
    const newExercise: ExerciseInSession = {
      tempId: `temp-${Date.now()}-${Math.random()}`,
      exercise,
      exerciseName: exercise.name,
      order: exercises.length,
      sets: 3,
      reps: 10,
      weightKg: null,
      rpe: null,
      restSec: 90,
      notes: "",
    };
    setExercises([...exercises, newExercise]);
    setExerciseSearch("");
    setShowSearchResults(false);
  };

  const removeExercise = (tempId: string) => {
    setExercises(exercises.filter((ex) => ex.tempId !== tempId));
  };

  const updateExercise = (tempId: string, updates: Partial<ExerciseInSession>) => {
    setExercises(exercises.map((ex) => (ex.tempId === tempId ? { ...ex, ...updates } : ex)));
  };

  const moveExercise = (tempId: string, direction: "up" | "down") => {
    const index = exercises.findIndex((ex) => ex.tempId === tempId);
    if (index === -1) {
      return;
    }
    if (direction === "up" && index === 0) {
      return;
    }
    if (direction === "down" && index === exercises.length - 1) {
      return;
    }

    const newExercises = [...exercises];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newExercises[index], newExercises[targetIndex]] = [
      newExercises[targetIndex],
      newExercises[index],
    ];

    // Update order indices
    newExercises.forEach((ex, i) => {
      ex.order = i;
    });

    setExercises(newExercises);
  };

  const handleSave = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }

    if (exercises.length === 0) {
      setSaveError("Add at least one exercise to your session");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const plannedAt = `${plannedDate}T${plannedTime}:00.000Z`;

      const sessionExercises: SessionExerciseInput[] = exercises.map((ex) => ({
        exercise_id: ex.exercise?.id ?? null,
        order: ex.order,
        notes: ex.notes || null,
        planned: {
          sets: ex.sets,
          reps: ex.reps,
          load: ex.weightKg,
          rpe: ex.rpe,
          rest: ex.restSec ? `${ex.restSec} sec` : null,
        },
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          order: i,
          reps: ex.reps,
          weight_kg: ex.weightKg,
          rpe: ex.rpe,
        })),
      }));

      const payload: CreateSessionRequest = {
        title: sessionTitle || null,
        planned_at: plannedAt,
        notes: sessionNotes || null,
        visibility: "private",
        exercises: sessionExercises,
      };

      await createSession(payload);

      // Navigate to sessions list or show success
      void navigate("/sessions");
    } catch (error: unknown) {
      logger.apiError("Failed to create session", error, "/api/v1/sessions", "POST");
      setSaveError(t("planner.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const searchLabel = i18nLabel("planner.searchExercises", "Search exercises");
  const moveUpLabel = i18nLabel("planner.moveUp", "Move up");
  const moveDownLabel = i18nLabel("planner.moveDown", "Move down");
  const removeExerciseLabel = i18nLabel("planner.removeExercise", "Remove exercise");

  return (
    <PageIntro
      eyebrow={t("planner.eyebrow")}
      title={t("planner.title")}
      description={t("planner.description")}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form ref={formRef} onSubmit={handleSave} className="form form--gap-lg">
        {/* Session Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("planner.sessionDetailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid--gap-md">
              <div>
                <label
                  htmlFor="session-title"
                  className="form-label-text block mb-05 font-weight-600"
                >
                  {t("planner.titleOptional")}
                </label>
                <input
                  id="session-title"
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder={t("planner.sessionTitlePlaceholder")}
                  className="form-input form-input--surface"
                />
              </div>

              <div className="grid grid--two-one grid--gap-md">
                <div>
                  <label
                    htmlFor="planned-date"
                    className="form-label-text block mb-05 font-weight-600"
                  >
                    <Calendar size={16} className="icon icon--inline" />
                    {t("planner.plannedDate")}
                  </label>
                  <input
                    id="planned-date"
                    name="planned-date"
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    required
                    className="form-input form-input--surface"
                  />
                </div>

                <div>
                  <label
                    htmlFor="planned-time"
                    className="form-label-text block mb-05 font-weight-600"
                  >
                    {t("planner.time")}
                  </label>
                  <input
                    id="planned-time"
                    type="time"
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    className="form-input form-input--surface"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="session-notes"
                  className="form-label-text block mb-05 font-weight-600"
                >
                  {t("planner.notesOptional")}
                </label>
                <textarea
                  id="session-notes"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder={t("planner.notesPlaceholder")}
                  rows={3}
                  className="form-input form-input--surface planner-textarea"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercise Search */}
        <Card>
          <CardHeader>
            <CardTitle>{t("planner.addExercises")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="relative">
                <label htmlFor="exercise-search" className="sr-only">
                  {searchLabel}
                </label>
                <Search size={20} className="search-icon" />
                <input
                  id="exercise-search"
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  onFocus={() => exerciseResults.length > 0 && setShowSearchResults(true)}
                  placeholder={t("planner.exerciseSearchPlaceholder")}
                  aria-label={searchLabel}
                  className="planner-search-input"
                />
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && exerciseResults.length > 0 && (
                <div className="planner-search-results">
                  {exerciseResults.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => addExercise(exercise)}
                      className="planner-search-result"
                    >
                      <div className="font-weight-600">{exercise.name}</div>
                      {exercise.muscle_group && (
                        <div className="planner-search-result-meta">
                          {exercise.muscle_group}
                          {exercise.equipment && ` • ${exercise.equipment}`}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {isSearching && <div className="planner-search-status">{t("common.searching")}</div>}
            </div>
          </CardContent>
        </Card>

        {/* Exercise List */}
        {exercises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("planner.exercisesTitle", { count: exercises.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid--gap-md">
                {exercises.map((ex, index) => (
                  <div key={ex.tempId} className="planner-exercise-card">
                    {/* Exercise Header */}
                    <div className="planner-exercise-header">
                      <div className="planner-move-buttons">
                        <button
                          onClick={() => moveExercise(ex.tempId, "up")}
                          disabled={index === 0}
                          aria-label={moveUpLabel}
                          className="planner-move-button"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveExercise(ex.tempId, "down")}
                          disabled={index === exercises.length - 1}
                          aria-label={moveDownLabel}
                          className="planner-move-button"
                        >
                          ▼
                        </button>
                      </div>

                      <div className="flex-1">
                        <div className="planner-exercise-title">
                          {index + 1}. {ex.exerciseName}
                        </div>
                        {ex.exercise?.muscle_group && (
                          <div className="planner-exercise-meta">{ex.exercise.muscle_group}</div>
                        )}
                      </div>

                      <button
                        onClick={() => removeExercise(ex.tempId)}
                        aria-label={removeExerciseLabel}
                        className="planner-remove-button"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Exercise Parameters */}
                    <div className="planner-fields-grid">
                      <div>
                        <label htmlFor={`${ex.tempId}-sets`} className="planner-field-label">
                          {t("planner.setsLabel")}
                        </label>
                        <input
                          id={`${ex.tempId}-sets`}
                          type="number"
                          min="1"
                          value={ex.sets}
                          onChange={(e) =>
                            updateExercise(ex.tempId, { sets: parseInt(e.target.value) || 1 })
                          }
                          className="planner-field-input"
                        />
                      </div>

                      <div>
                        <label htmlFor={`${ex.tempId}-reps`} className="planner-field-label">
                          {t("planner.repsLabel")}
                        </label>
                        <input
                          id={`${ex.tempId}-reps`}
                          type="number"
                          min="1"
                          value={ex.reps ?? ""}
                          onChange={(e) =>
                            updateExercise(ex.tempId, { reps: parseInt(e.target.value) || null })
                          }
                          placeholder={t("planner.repsPlaceholder")}
                          className="planner-field-input"
                        />
                      </div>

                      <div>
                        <label htmlFor={`${ex.tempId}-weight`} className="planner-field-label">
                          {t("planner.weightLabel")}
                        </label>
                        <input
                          id={`${ex.tempId}-weight`}
                          type="number"
                          step="0.5"
                          min="0"
                          value={ex.weightKg ?? ""}
                          onChange={(e) =>
                            updateExercise(ex.tempId, {
                              weightKg: parseFloat(e.target.value) || null,
                            })
                          }
                          placeholder={t("planner.weightPlaceholder")}
                          className="planner-field-input"
                        />
                      </div>

                      <div>
                        <label htmlFor={`${ex.tempId}-rpe`} className="planner-field-label">
                          {t("planner.rpeLabel")}
                        </label>
                        <input
                          id={`${ex.tempId}-rpe`}
                          type="number"
                          min="1"
                          max="10"
                          value={ex.rpe ?? ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateExercise(ex.tempId, { rpe: val >= 1 && val <= 10 ? val : null });
                          }}
                          placeholder={t("planner.rpePlaceholder")}
                          className="planner-field-input"
                        />
                      </div>

                      <div>
                        <label htmlFor={`${ex.tempId}-rest`} className="planner-field-label">
                          {t("planner.restLabel")}
                        </label>
                        <input
                          id={`${ex.tempId}-rest`}
                          type="number"
                          min="0"
                          step="15"
                          value={ex.restSec ?? ""}
                          onChange={(e) =>
                            updateExercise(ex.tempId, { restSec: parseInt(e.target.value) || null })
                          }
                          placeholder={t("planner.speedPlaceholder")}
                          className="planner-field-input"
                        />
                      </div>
                    </div>

                    {/* Exercise Notes */}
                    <div className="planner-notes">
                      <label htmlFor={`${ex.tempId}-notes`} className="planner-field-label">
                        {t("planner.notesOptional")}
                      </label>
                      <input
                        id={`${ex.tempId}-notes`}
                        type="text"
                        value={ex.notes}
                        onChange={(e) => updateExercise(ex.tempId, { notes: e.target.value })}
                        placeholder={t("planner.exerciseNotesPlaceholder")}
                        className="planner-field-input"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Actions */}
        <Card>
          <CardContent>
            {saveError && <div className="planner-save-error">{saveError}</div>}

            <div className="flex flex--gap-md flex--justify-end">
              <Button
                variant="secondary"
                onClick={() => void navigate("/sessions")}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                leftIcon={<Save size={18} />}
                disabled={exercises.length === 0}
              >
                {isSaving ? t("common.saving") : t("planner.saveSession")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </PageIntro>
  );
};

export default Planner;
