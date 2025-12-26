import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { translationsApi, type Translation } from "../services/api";
import { useThemeStore } from "../store/theme.store";
import { useThemeColors } from "../hooks/useThemeColors";

const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es", "el"] as const;
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  el: "Greek",
};

const NAMESPACES = ["common", "auth", "terms", "privacy", "cookie"] as const;

const TranslationsPage: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const colors = useThemeColors();
  const [search, setSearch] = useState("");
  const [keyPath, setKeyPath] = useState("");
  const [language, setLanguage] = useState<string>("");
  const [namespace, setNamespace] = useState<string>("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [editingKey, setEditingKey] = useState<{ namespace: string; key_path: string } | null>(
    null,
  );
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newTranslation, setNewTranslation] = useState<{
    namespace: string;
    key_path: string;
    language: string;
    value: string;
  }>({
    namespace: "common",
    key_path: "",
    language: "en",
    value: "",
  });

  const queryClient = useQueryClient();
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["translations", search, keyPath, language, namespace, activeOnly, page],
    queryFn: () =>
      translationsApi.list({
        search: search || undefined,
        keyPath: keyPath || undefined,
        language: language || undefined,
        namespace: namespace || undefined,
        activeOnly: activeOnly ? undefined : false, // false shows all, undefined shows only active
        limit,
        offset: page * limit,
      }),
  });

  // Fetch all language versions when editing a key (including deleted ones)
  const { data: editingTranslations } = useQuery({
    queryKey: ["translations", "edit", editingKey?.namespace, editingKey?.key_path],
    queryFn: async () => {
      if (!editingKey) {
        return null;
      }
      // Fetch all translations for this namespace (no language filter, including deleted)
      const response = await translationsApi.list({
        namespace: editingKey.namespace,
        activeOnly: false, // Include deleted translations
        limit: 1000, // Get enough to find all language versions
      });
      // Filter to only exact matches for this key_path
      const filtered = response.data.filter(
        (t) => t.namespace === editingKey.namespace && t.key_path === editingKey.key_path,
      );
      return { data: filtered };
    },
    enabled: !!editingKey,
  });

  //const updateMutation = useMutation({
  //  mutationFn: ({ trans, value }: { trans: Translation; value: string }) =>
  //    translationsApi.update(trans.language, trans.namespace, trans.key_path, { value }),
  //  onSuccess: () => {
  //    queryClient.invalidateQueries({ queryKey: ["translations"] });
  //  },
  //});

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ language: string; value: string }>) => {
      if (!editingKey) {
        return;
      }
      const promises = updates.map(async (update) => {
        const existing = editingTranslations?.data.find(
          (t) =>
            t.language === update.language &&
            t.namespace === editingKey.namespace &&
            t.key_path === editingKey.key_path,
        );
        // If there's an active translation, update it (creates new version)
        if (existing && !existing.deleted_at) {
          return translationsApi.update(
            update.language,
            editingKey.namespace,
            editingKey.key_path,
            {
              value: update.value,
            },
          );
        } else {
          // If no translation exists or it's deleted, create a new one
          // The backend will handle restoring deleted translations
          return translationsApi.create({
            namespace: editingKey.namespace,
            key_path: editingKey.key_path,
            language: update.language,
            value: update.value,
          });
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["translations"] });
      setEditingKey(null);
      setEditValues({});
    },
  });

  const createMutation = useMutation({
    mutationFn: () => translationsApi.create(newTranslation),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["translations"] });
      setShowCreate(false);
      setNewTranslation({ namespace: "common", key_path: "", language: "en", value: "" });
    },
  });

  const handleEdit = (trans: Translation) => {
    setEditingKey({ namespace: trans.namespace, key_path: trans.key_path });
    // Initialize with current translation value
    setEditValues({ [trans.language]: trans.value });
  };

  // Update edit values when editing translations are loaded
  useEffect(() => {
    if (editingKey && editingTranslations?.data) {
      const values: Record<string, string> = {};
      editingTranslations.data.forEach((t) => {
        if (t.namespace === editingKey.namespace && t.key_path === editingKey.key_path) {
          values[t.language] = t.value;
        }
      });
      setEditValues((prev) => ({ ...prev, ...values }));
    }
  }, [editingKey, editingTranslations]);

  const handleSave = () => {
    if (!editingKey) {
      return;
    }
    const updates = Object.entries(editValues)
      .filter(([_, value]) => value.trim() !== "")
      .map(([language, value]) => ({ language, value }));
    if (updates.length > 0) {
      bulkUpdateMutation.mutate(updates);
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValues({});
  };

  return (
    <div>
      <h1 style={{ color: colors.text, marginBottom: "2rem", fontSize: "2rem" }}>Translations</h1>

      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "0.75rem",
            background: theme === "light" ? "#F5F5F5" : "#1A1A1A",
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            color: colors.text,
            flex: "1",
            minWidth: "200px",
          }}
        />
        <input
          type="text"
          placeholder="Filter by key path..."
          value={keyPath}
          onChange={(e) => {
            setKeyPath(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "0.75rem",
            background: theme === "light" ? "#F5F5F5" : "#1A1A1A",
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            color: colors.text,
            minWidth: "200px",
          }}
        />
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "0.75rem",
            background: theme === "light" ? "#F5F5F5" : "#1A1A1A",
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            color: colors.text,
            width: "150px",
            cursor: "pointer",
          }}
        >
          <option value="">All Languages</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_NAMES[lang]}
            </option>
          ))}
        </select>
        <select
          value={namespace}
          onChange={(e) => {
            setNamespace(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "0.75rem",
            background: theme === "light" ? "#F5F5F5" : "#1A1A1A",
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            color: colors.text,
            width: "150px",
            cursor: "pointer",
          }}
        >
          <option value="">All Namespaces</option>
          {NAMESPACES.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: colors.text,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              setPage(0);
            }}
            style={{ cursor: "pointer" }}
          />
          Show only active
        </label>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#FB951D",
            color: colors.text,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Create New
        </button>
      </div>

      {showCreate && (
        <div
          style={{
            background: colors.surface,
            padding: "1.5rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: `1px solid ${colors.border}`,
          }}
        >
          <h3 style={{ color: colors.text, marginBottom: "1rem" }}>Create Translation</h3>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  color: colors.text,
                }}
              >
                Namespace
              </label>
              <select
                value={newTranslation.namespace}
                onChange={(e) =>
                  setNewTranslation({ ...newTranslation, namespace: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "#0D1A15",
                  border: "1px solid #2E5B49",
                  borderRadius: "4px",
                  color: colors.text,
                  cursor: "pointer",
                }}
              >
                {NAMESPACES.map((ns) => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  color: colors.text,
                }}
              >
                Language
              </label>
              <select
                value={newTranslation.language}
                onChange={(e) => setNewTranslation({ ...newTranslation, language: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "#0D1A15",
                  border: "1px solid #2E5B49",
                  borderRadius: "4px",
                  color: colors.text,
                  cursor: "pointer",
                }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_NAMES[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                color: colors.text,
              }}
            >
              Key Path
            </label>
            <input
              type="text"
              placeholder="e.g., navigation.home or errors.notFound"
              value={newTranslation.key_path}
              onChange={(e) => setNewTranslation({ ...newTranslation, key_path: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#0D1A15",
                border: "1px solid #2E5B49",
                borderRadius: "4px",
                color: colors.text,
              }}
            />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                color: colors.text,
              }}
            >
              Value
            </label>
            <textarea
              placeholder="Translation value"
              value={newTranslation.value}
              onChange={(e) => setNewTranslation({ ...newTranslation, value: e.target.value })}
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#0D1A15",
                border: "1px solid #2E5B49",
                borderRadius: "4px",
                color: colors.text,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#FB951D",
                color: colors.text,
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewTranslation({ namespace: "common", key_path: "", language: "en", value: "" });
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                color: colors.text,
                border: "1px solid #2E5B49",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Panel - Show all language versions when editing */}
      {editingKey && editingTranslations && (
        <div
          style={{
            background: "#162C22",
            padding: "1.5rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: `2px solid ${colors.accent}`,
          }}
        >
          <h3 style={{ color: colors.text, marginBottom: "1rem" }}>
            Editing: {editingKey.namespace}.{editingKey.key_path}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              //const existing = editingTranslations.data.find(
              //  (t) =>
              //    t.namespace === editingKey.namespace &&
              //    t.key_path === editingKey.key_path &&
              //    t.language === lang,
              //);
              return (
                <div key={lang}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      color: colors.text,
                      fontWeight: 500,
                    }}
                  >
                    {LANGUAGE_NAMES[lang]}
                  </label>
                  <textarea
                    value={editValues[lang] || ""}
                    onChange={(e) => setEditValues({ ...editValues, [lang]: e.target.value })}
                    placeholder={`Translation for ${LANGUAGE_NAMES[lang]}...`}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: "#0D1A15",
                      border: "1px solid #2E5B49",
                      borderRadius: "4px",
                      color: colors.text,
                    }}
                  />
                </div>
              );
            })}
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button
                onClick={handleSave}
                disabled={bulkUpdateMutation.isPending}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#FB951D",
                  color: colors.text,
                  border: "none",
                  borderRadius: "4px",
                  cursor: bulkUpdateMutation.isPending ? "not-allowed" : "pointer",
                }}
              >
                {bulkUpdateMutation.isPending ? "Saving..." : "Save All Languages"}
              </button>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  color: colors.text,
                  border: "1px solid #2E5B49",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ color: colors.text }}>Loading...</div>
      ) : (
        <>
          <div
            style={{
              background: "#162C22",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid #2E5B49",
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1400px" }}>
              <thead>
                <tr style={{ background: theme === "light" ? "#F5F5F5" : "#1A1A1A" }}>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      width: "100px",
                    }}
                  >
                    Language
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      width: "120px",
                    }}
                  >
                    Namespace
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      minWidth: "150px",
                    }}
                  >
                    Key Path
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      minWidth: "200px",
                    }}
                  >
                    Term
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      whiteSpace: "nowrap",
                      width: "160px",
                    }}
                  >
                    Created At
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      whiteSpace: "nowrap",
                      width: "160px",
                    }}
                  >
                    Updated At
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      whiteSpace: "nowrap",
                      width: "160px",
                    }}
                  >
                    Deleted At
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: colors.text,
                      borderBottom: `1px solid ${colors.border}`,
                      position: "sticky",
                      right: 0,
                      background: theme === "light" ? "#F5F5F5" : "#1A1A1A",
                      zIndex: 10,
                      minWidth: "150px",
                      width: "150px",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((trans) => {
                  const isEditingThisKey =
                    editingKey?.namespace === trans.namespace &&
                    editingKey?.key_path === trans.key_path;
                  const isDeleted = !!trans.deleted_at;
                  return (
                    <tr
                      key={trans.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        background: isEditingThisKey
                          ? `${colors.accent}20`
                          : isDeleted
                            ? `${colors.error}20`
                            : colors.surface,
                        opacity: isDeleted ? 0.7 : 1,
                      }}
                    >
                      <td style={{ padding: "0.75rem", color: colors.text }}>
                        {LANGUAGE_NAMES[trans.language] || trans.language}
                      </td>
                      <td style={{ padding: "0.75rem", color: colors.text }}>{trans.namespace}</td>
                      <td
                        style={{
                          padding: "0.75rem",
                          color: colors.text,
                          fontFamily: "monospace",
                          fontSize: "0.875rem",
                        }}
                      >
                        {trans.key_path}
                      </td>
                      <td style={{ padding: "0.75rem", color: colors.text }}>
                        {isEditingThisKey ? (
                          <input
                            type="text"
                            value={editValues[trans.language] || ""}
                            onChange={(e) =>
                              setEditValues({ ...editValues, [trans.language]: e.target.value })
                            }
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              background: "#0D1A15",
                              border: "1px solid #2E5B49",
                              borderRadius: "4px",
                              color: colors.text,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {trans.value}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          color: colors.text,
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {trans.created_at
                          ? new Date(trans.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          color: colors.text,
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {trans.updated_at
                          ? new Date(trans.updated_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          color: isDeleted ? colors.error : colors.text,
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {trans.deleted_at
                          ? new Date(trans.deleted_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          position: "sticky",
                          right: 0,
                          background: isEditingThisKey
                            ? `${colors.accent}20`
                            : isDeleted
                              ? `${colors.error}20`
                              : colors.surface,
                          zIndex: 5,
                          minWidth: "150px",
                          width: "150px",
                          boxShadow: "-2px 0 4px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        {isEditingThisKey && trans.language === SUPPORTED_LANGUAGES[0] ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={handleSave}
                              disabled={bulkUpdateMutation.isPending}
                              style={{
                                padding: "0.5rem 1rem",
                                background: "#FB951D",
                                color: colors.text,
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              Save All
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: "0.5rem 1rem",
                                background: "transparent",
                                color: colors.text,
                                border: "1px solid #2E5B49",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isEditingThisKey ? (
                          <div style={{ color: colors.accent, fontSize: "0.875rem" }}>
                            Editing...
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleEdit(trans)}
                              style={{
                                padding: "0.5rem 1rem",
                                background: "transparent",
                                color: colors.text,
                                border: "1px solid #2E5B49",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
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

          {data && data.pagination.total > limit && (
            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: page === 0 ? colors.border : colors.accent,
                  color: colors.text,
                  border: "none",
                  borderRadius: "4px",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ color: colors.text }}>
                Page {page + 1} of {Math.ceil(data.pagination.total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= data.pagination.total}
                style={{
                  padding: "0.75rem 1.5rem",
                  background:
                    (page + 1) * limit >= data.pagination.total ? colors.border : colors.accent,
                  color: colors.text,
                  border: "none",
                  borderRadius: "4px",
                  cursor: (page + 1) * limit >= data.pagination.total ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TranslationsPage;
