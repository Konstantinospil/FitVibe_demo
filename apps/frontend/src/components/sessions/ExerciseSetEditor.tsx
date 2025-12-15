import React from "react";
import { useTranslation } from "react-i18next";
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
  completed?: boolean;
}

export interface ExerciseSetEditorProps {
  sets: SetData[];
  onSetsChange: (sets: SetData[]) => void;
  exerciseName?: string;
  className?: string;
  style?: React.CSSProperties;
  showCompleted?: boolean;
}

/**
 * ExerciseSetEditor component for editing exercise sets (reps, weight, etc.).
 * Supports adding, removing, and editing sets with various metrics.
 */
export const ExerciseSetEditor: React.FC<ExerciseSetEditorProps> = ({
  sets,
  onSetsChange,
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
    };
    onSetsChange([...sets, newSet]);
  };

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
  );
};
