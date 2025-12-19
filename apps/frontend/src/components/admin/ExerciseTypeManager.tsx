import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";
import { Plus, Edit, Trash2 } from "lucide-react";
import { EmptyState } from "../utils/EmptyState";
import { Database } from "lucide-react";

export interface ExerciseType {
  id: string;
  code: string;
  nameEn: string;
  descriptionEn?: string;
}

export interface ExerciseTypeManagerProps {
  onTypeCreated?: (type: ExerciseType) => void;
  onTypeUpdated?: (type: ExerciseType) => void;
  onTypeDeleted?: (id: string) => void;
}

/**
 * ExerciseTypeManager component allows admins to manage exercise types.
 * Supports creating, updating, and deleting exercise types.
 */
export const ExerciseTypeManager: React.FC<ExerciseTypeManagerProps> = ({
  onTypeCreated,
  onTypeUpdated,
  onTypeDeleted,
}) => {
  const { t } = useTranslation("common");
  const [types, setTypes] = useState<ExerciseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ExerciseType | null>(null);
  const [formData, setFormData] = useState({ code: "", nameEn: "", descriptionEn: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // In a real implementation, this would call an exercise types API
    // For now, we'll use placeholder data
    const loadTypes = () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        const data: ExerciseType[] = [];
        setTypes(data);
      } catch {
        // Error handling would be done by parent component
      } finally {
        setIsLoading(false);
      }
    };

    void loadTypes();
  }, []);

  const handleCreate = () => {
    setEditingType(null);
    setFormData({ code: "", nameEn: "", descriptionEn: "" });
    setIsModalOpen(true);
  };

  const handleEdit = (type: ExerciseType) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      nameEn: type.nameEn,
      descriptionEn: type.descriptionEn || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      if (editingType) {
        // Update existing
        const updated = { ...editingType, ...formData };
        setTypes((prev) => prev.map((t) => (t.id === editingType.id ? updated : t)));
        onTypeUpdated?.(updated);
      } else {
        // Create new
        const newType: ExerciseType = {
          id: `type-${Date.now()}`,
          ...formData,
        };
        setTypes((prev) => [...prev, newType]);
        onTypeCreated?.(newType);
      }
      setIsModalOpen(false);
      setFormData({ code: "", nameEn: "", descriptionEn: "" });
      setEditingType(null);
    } catch {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("admin.exerciseTypes.confirmDelete"))) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      setTypes((prev) => prev.filter((t) => t.id !== id));
      onTypeDeleted?.(id);
    } catch {
      // Error handling
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <CardTitle>{t("admin.exerciseTypes.title")}</CardTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              leftIcon={<Plus size={16} />}
            >
              {t("admin.exerciseTypes.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-xl)" }}>
              <Spinner size="md" />
            </div>
          ) : types.length === 0 ? (
            <EmptyState
              title={t("admin.exerciseTypes.empty")}
              icon={<Database size={48} />}
              action={{
                label: t("admin.exerciseTypes.create"),
                onClick: handleCreate,
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {types.map((type) => (
                <div
                  key={type.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "var(--space-md)",
                    background: "var(--color-bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "var(--font-size-md)",
                        color: "var(--color-text-primary)",
                        marginBottom: "var(--space-xs)",
                      }}
                    >
                      {type.nameEn} ({type.code})
                    </div>
                    {type.descriptionEn && (
                      <div
                        style={{
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {type.descriptionEn}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(type)}
                      leftIcon={<Edit size={16} />}
                      aria-label={t("common.edit")}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(type.id)}
                      leftIcon={<Trash2 size={16} />}
                      aria-label={t("common.delete")}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData({ code: "", nameEn: "", descriptionEn: "" });
          setEditingType(null);
        }}
        title={editingType ? t("admin.exerciseTypes.edit") : t("admin.exerciseTypes.create")}
        size="md"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder={t("admin.exerciseTypes.codePlaceholder")}
            label={t("admin.exerciseTypes.code")}
            required
          />
          <Input
            value={formData.nameEn}
            onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
            placeholder={t("admin.exerciseTypes.namePlaceholder")}
            label={t("admin.exerciseTypes.name")}
            required
          />
          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                marginBottom: "var(--space-xs)",
                color: "var(--color-text-primary)",
              }}
            >
              {t("admin.exerciseTypes.description")}
            </label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
              placeholder={t("admin.exerciseTypes.descriptionPlaceholder")}
              rows={3}
              style={{
                width: "100%",
                padding: "var(--space-sm) var(--space-md)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-input-bg)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-md)",
                fontFamily: "var(--font-family-base)",
                resize: "vertical",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
            <Button
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                setFormData({ code: "", nameEn: "", descriptionEn: "" });
                setEditingType(null);
              }}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                handleSubmit();
              }}
              isLoading={isSubmitting}
            >
              {editingType ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
