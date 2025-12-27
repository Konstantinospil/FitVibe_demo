import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actionMappingsApi, type ActionUiMapping } from "../services/api";
import { useAuthStore } from "../store/auth.store";
import { useThemeColors } from "../hooks/useThemeColors";

const SettingsPage: React.FC = () => {
  const colors = useThemeColors();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [search, setSearch] = useState("");
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["action-mappings"],
    queryFn: () => actionMappingsApi.list(),
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: (mapping: { action: string; uiName: string }) => actionMappingsApi.upsert(mapping),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["action-mappings"] });
      setEditingAction(null);
      setEditValue("");
    },
  });

  const filteredMappings = useMemo(() => {
    const mappings = data?.mappings ?? [];
    if (!search.trim()) {
      return mappings;
    }
    const lowered = search.toLowerCase();
    return mappings.filter((mapping) => {
      const uiName = mapping.uiName ?? "";
      return (
        mapping.action.toLowerCase().includes(lowered) || uiName.toLowerCase().includes(lowered)
      );
    });
  }, [data, search]);

  const handleEdit = (mapping: ActionUiMapping) => {
    setEditingAction(mapping.action);
    setEditValue(mapping.uiName ?? "");
  };

  const handleSave = (action: string) => {
    if (!editValue.trim()) {
      return;
    }
    updateMutation.mutate({ action, uiName: editValue.trim() });
  };

  const handleCancel = () => {
    setEditingAction(null);
    setEditValue("");
  };

  return (
    <div>
      <h1 style={{ color: colors.text, marginBottom: "2rem", fontSize: "2rem" }}>Settings</h1>

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: colors.text, marginBottom: "1rem", fontSize: "1.5rem" }}>
          Action Labels
        </h2>
        <input
          type="text"
          placeholder="Search actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "0.75rem",
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            color: colors.text,
            width: "100%",
            maxWidth: "420px",
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ color: colors.text }}>Loading...</div>
      ) : error ? (
        <div style={{ color: colors.error, padding: "2rem" }}>
          Error loading action mappings: {error instanceof Error ? error.message : String(error)}
        </div>
      ) : filteredMappings.length === 0 ? (
        <div style={{ color: colors.text, textAlign: "center", padding: "2rem" }}>
          No action mappings found
        </div>
      ) : (
        <div
          style={{
            background: colors.surface,
            borderRadius: "8px",
            overflowX: "auto",
            border: `1px solid ${colors.border}`,
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
            <thead>
              <tr style={{ background: colors.surfaceMuted }}>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    color: colors.text,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  Action
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    color: colors.text,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  UI Name
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((mapping) => {
                const isEditing = editingAction === mapping.action;
                return (
                  <tr key={mapping.action} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "1rem", color: colors.text }}>{mapping.action}</td>
                    <td style={{ padding: "1rem", color: colors.text }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            style={{
                              padding: "0.5rem 0.75rem",
                              background: colors.surface,
                              border: `1px solid ${colors.border}`,
                              borderRadius: "4px",
                              color: colors.text,
                              minWidth: "240px",
                            }}
                          />
                          <button
                            onClick={() => handleSave(mapping.action)}
                            disabled={updateMutation.isPending}
                            style={{
                              padding: "0.5rem 1rem",
                              background: "var(--color-secondary)",
                              color: colors.text,
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              padding: "0.5rem 1rem",
                              background: "transparent",
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                          <span style={{ color: colors.textSecondary }}>
                            {mapping.uiName || "—"}
                          </span>
                          <button
                            onClick={() => handleEdit(mapping)}
                            style={{
                              padding: "0.35rem 0.75rem",
                              background: colors.border,
                              color: colors.text,
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
