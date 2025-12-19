import React from "react";
import { useTranslation } from "react-i18next";
<<<<<<< Updated upstream
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export interface SetData {
  id?: string;
  order?: number;
  reps?: number | null;
  weight?: number | null;
  weight_kg?: number | null;
  distance?: number | null;
  duration?: number | null;
  rest?: number | null;
  rest_sec?: number | null;
  rpe?: number | null;
  notes?: string | null;
=======
import { FormField } from "../ui";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Trash2, Plus } from "lucide-react";

export interface SetData {
  order: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  rest_sec: number | null;
  notes: string | null;
>>>>>>> Stashed changes
  completed?: boolean;
}

export interface ExerciseSetEditorProps {
  sets: SetData[];
  onSetsChange: (sets: SetData[]) => void;
  exerciseName?: string;
<<<<<<< Updated upstream
  className?: string;
  style?: React.CSSProperties;
=======
>>>>>>> Stashed changes
  showCompleted?: boolean;
}

/**
<<<<<<< Updated upstream
 * ExerciseSetEditor component for editing exercise sets (reps, weight, etc.).
 * Supports adding, removing, and editing sets with various metrics.
=======
 * ExerciseSetEditor component for editing sets, reps, load, and RPE.
 * Mobile-first design with stepper functionality.
>>>>>>> Stashed changes
 */
export const ExerciseSetEditor: React.FC<ExerciseSetEditorProps> = ({
  sets,
  onSetsChange,
<<<<<<< Updated upstream
  exerciseName: _exerciseName,
  className,
  style,
}) => {
  const { t } = useTranslation("common");

  const addSet = () => {
    const newSet: SetData = {
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reps: null,
      weight: null,
      distance: null,
      duration: null,
      rest: null,
      notes: "",
=======
  exerciseName,
  showCompleted = false,
}) => {
  const { t } = useTranslation("common");

  const updateSet = (index: number, updates: Partial<SetData>) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], ...updates };
    onSetsChange(newSets);
  };

  const addSet = () => {
    const newSet: SetData = {
      order: sets.length + 1,
      reps: sets.length > 0 ? sets[sets.length - 1].reps : null,
      weight_kg: sets.length > 0 ? sets[sets.length - 1].weight_kg : null,
      rpe: null,
      rest_sec: null,
      notes: null,
      completed: false,
>>>>>>> Stashed changes
    };
    onSetsChange([...sets, newSet]);
  };

<<<<<<< Updated upstream
  const removeSet = (setId: string | undefined) => {
    if (!setId) {
      return;
    }
    onSetsChange(sets.filter((set) => set.id !== setId));
  };

  const updateSet = (
    setId: string | undefined,
    field: keyof SetData,
    value: string | number | null,
  ) => {
    if (!setId) {
      return;
    }
    onSetsChange(
      sets.map((set) =>
        set.id === setId
          ? {
              ...set,
              [field]: value === "" ? null : value,
            }
          : set,
      ),
    );
  };

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", ...style }}
    >
      <div className="flex flex--align-center flex--justify-between">
        <h4 style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
          {t("sessions.sets") || "Sets"}
        </h4>
        <Button variant="ghost" size="sm" onClick={addSet} leftIcon={<Plus size={16} />}>
          {t("sessions.addSet") || "Add Set"}
        </Button>
      </div>

      {sets.length === 0 ? (
        <div
          style={{
            padding: "var(--space-lg)",
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          {t("sessions.noSets") || "No sets added yet"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {sets.map((set, index) => (
            <div
              key={set.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr 1fr 1fr 1fr auto",
                gap: "var(--space-sm)",
                alignItems: "center",
                padding: "var(--space-sm)",
                background: "var(--color-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                }}
              >
                {index + 1}
              </span>
              <Input
                type="number"
                placeholder={t("sessions.reps") || "Reps"}
                value={set.reps || ""}
                onChange={(e) =>
                  updateSet(set.id, "reps", e.target.value ? parseInt(e.target.value, 10) : null)
                }
                size="sm"
                fullWidth={false}
                style={{ minWidth: 0 }}
              />
              <Input
                type="number"
                placeholder={t("sessions.weight") || "Weight"}
                value={set.weight || ""}
                onChange={(e) =>
                  updateSet(set.id, "weight", e.target.value ? parseFloat(e.target.value) : null)
                }
                size="sm"
                fullWidth={false}
                style={{ minWidth: 0 }}
              />
              <Input
                type="number"
                placeholder={t("sessions.distance") || "Distance"}
                value={set.distance || ""}
                onChange={(e) =>
                  updateSet(set.id, "distance", e.target.value ? parseFloat(e.target.value) : null)
                }
                size="sm"
                fullWidth={false}
                style={{ minWidth: 0 }}
              />
              <Input
                type="number"
                placeholder={t("sessions.duration") || "Duration"}
                value={set.duration || ""}
                onChange={(e) =>
                  updateSet(
                    set.id,
                    "duration",
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                size="sm"
                fullWidth={false}
                style={{ minWidth: 0 }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => set.id && removeSet(set.id)}
                aria-label={
                  t("sessions.removeSet", { number: index + 1 }) || `Remove set ${index + 1}`
                }
                style={{ minWidth: "auto", padding: "var(--space-xs)" }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
=======
  const removeSet = (index: number) => {
    const newSets = sets
      .filter((_, i) => i !== index)
      .map((set, i) => ({
        ...set,
        order: i + 1,
      }));
    onSetsChange(newSets);
  };

  const toggleSetCompleted = (index: number) => {
    if (!showCompleted) {
      return;
    }
    updateSet(index, { completed: !sets[index].completed });
  };

  return (
    <Card>
      <CardContent>
        {exerciseName && (
          <h4 className="text-md font-weight-600 mb-md" style={{ marginBottom: "1rem" }}>
            {exerciseName}
          </h4>
        )}
        <div className="flex flex--column flex--gap-md">
          {sets.map((set, index) => (
            <div
              key={index}
              className="flex flex--column flex--gap-sm"
              style={{
                padding: "1rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                background: set.completed ? "rgba(34, 197, 94, 0.1)" : "var(--color-surface)",
              }}
            >
              <div className="flex flex--align-center flex--justify-between mb-sm">
                <span className="text-sm font-weight-600">
                  {t("logger.sets")} {set.order}
                </span>
                {sets.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSet(index)}
                    leftIcon={<Trash2 size={14} />}
                    aria-label={`Remove set ${set.order}`}
                  />
                )}
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <FormField
                  label={t("logger.reps")}
                  type="number"
                  min="0"
                  value={set.reps?.toString() || ""}
                  onChange={(e) =>
                    updateSet(index, {
                      reps: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder={t("logger.repsPlaceholder")}
                  size="sm"
                />
                <FormField
                  label={t("logger.load")}
                  type="number"
                  min="0"
                  step="0.5"
                  value={set.weight_kg?.toString() || ""}
                  onChange={(e) =>
                    updateSet(index, {
                      weight_kg: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t("logger.weightPlaceholder")}
                  size="sm"
                />
                <FormField
                  label="RPE"
                  type="number"
                  min="1"
                  max="10"
                  value={set.rpe?.toString() || ""}
                  onChange={(e) =>
                    updateSet(index, {
                      rpe: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder={t("logger.rpePlaceholder")}
                  size="sm"
                />
              </div>
              {showCompleted && (
                <div className="flex flex--align-center flex--gap-sm mt-sm">
                  <input
                    type="checkbox"
                    checked={set.completed || false}
                    onChange={() => toggleSetCompleted(index)}
                    id={`set-${index}-completed`}
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      cursor: "pointer",
                    }}
                  />
                  <label
                    htmlFor={`set-${index}-completed`}
                    className="text-sm"
                    style={{ cursor: "pointer" }}
                  >
                    Completed
                  </label>
                </div>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={addSet}
            leftIcon={<Plus size={16} />}
            fullWidth
          >
            Add Set
          </Button>
        </div>
      </CardContent>
    </Card>
>>>>>>> Stashed changes
  );
};
