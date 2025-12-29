import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { translationsApi, type Translation } from "../services/api";

const TranslationsPage: React.FC = () => {
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
    namespace: "",
    key_path: "",
    language: "",
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

  const { data: translationMetadata } = useQuery({
    queryKey: ["translations", "metadata"],
    queryFn: () => translationsApi.metadata(),
  });

  const { data: namespaceUpdates } = useQuery({
    queryKey: ["translations", "namespace-updates"],
    queryFn: () => translationsApi.namespaceUpdates(),
  });

  const languages = useMemo(() => translationMetadata?.data.languages ?? [], [translationMetadata]);
  const namespaces = useMemo(
    () => translationMetadata?.data.namespaces ?? [],
    [translationMetadata],
  );
  const primaryLanguage = languages[0];

  useEffect(() => {
    if (languages.length > 0 && !newTranslation.language) {
      setNewTranslation((prev) => ({ ...prev, language: languages[0] }));
    }
  }, [languages, newTranslation.language]);

  useEffect(() => {
    if (namespaces.length > 0 && !newTranslation.namespace) {
      setNewTranslation((prev) => ({ ...prev, namespace: namespaces[0] }));
    }
  }, [namespaces, newTranslation.namespace]);

  const latestUpdateByNamespace = useMemo(() => {
    const updates: Record<string, string | null> = {};
    namespaceUpdates?.data.forEach((item) => {
      updates[item.namespace] = item.updated_at;
    });
    return updates;
  }, [namespaceUpdates]);

  const namespacesForUpdates = useMemo(() => {
    if (namespaces.length > 0) {
      return namespaces;
    }
    return Object.keys(latestUpdateByNamespace);
  }, [latestUpdateByNamespace, namespaces]);

  const languageDisplayNames = useMemo(() => {
    if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
      return new Intl.DisplayNames(["en"], { type: "language" });
    }
    return null;
  }, []);

  const getLanguageLabel = (code: string) => {
    const label = languageDisplayNames?.of(code);
    return label || code;
  };

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
      <h1 style={{ color: "var(--color-text-primary)", marginBottom: "2rem", fontSize: "2rem" }}>
        Translations
      </h1>

      <div
        style={{
          marginBottom: "1.5rem",
          padding: "0.75rem 1rem",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-2xs)",
          background: "var(--color-surface)",
        }}
      >
        <div
          style={{
            color: "var(--color-text-primary)",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Latest namespace updates
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            color: "var(--color-text-primary)",
          }}
        >
          {namespacesForUpdates.map((ns) => (
            <span key={ns} style={{ fontSize: "0.9rem" }}>
              {ns}:{" "}
              {latestUpdateByNamespace[ns]
                ? new Date(latestUpdateByNamespace[ns]).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </span>
          ))}
        </div>
      </div>

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
            background: "var(--color-input-bg)",
            border: "1px solid var(--color-input-border)",
            borderRadius: "var(--radius-xs)",
            color: "var(--color-text-primary)",
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
            background: "var(--color-input-bg)",
            border: "1px solid var(--color-input-border)",
            borderRadius: "var(--radius-xs)",
            color: "var(--color-text-primary)",
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
            background: "var(--color-input-bg)",
            border: "1px solid var(--color-input-border)",
            borderRadius: "var(--radius-xs)",
            color: "var(--color-text-primary)",
            width: "150px",
            cursor: "pointer",
          }}
        >
          <option value="">All Languages</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {getLanguageLabel(lang)}
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
            background: "var(--color-input-bg)",
            border: "1px solid var(--color-input-border)",
            borderRadius: "var(--radius-xs)",
            color: "var(--color-text-primary)",
            width: "150px",
            cursor: "pointer",
          }}
        >
          <option value="">All Namespaces</option>
          {namespaces.map((ns) => (
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
            color: "var(--color-text-primary)",
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
            background: "var(--color-primary)",
            color: "var(--color-primary-on)",
            border: "none",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
          }}
        >
          Create New
        </button>
      </div>

      {showCreate && (
        <div
          style={{
            background: "var(--color-surface)",
            padding: "1.5rem",
            borderRadius: "var(--radius-sm)",
            marginBottom: "2rem",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 style={{ color: "var(--color-text-primary)", marginBottom: "1rem" }}>
            Create Translation
          </h3>
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
                  color: "var(--color-text-primary)",
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
                  background: "var(--color-input-bg)",
                  border: "1px solid var(--color-input-border)",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                {namespaces.map((ns) => (
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
                  color: "var(--color-text-primary)",
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
                  background: "var(--color-input-bg)",
                  border: "1px solid var(--color-input-border)",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {getLanguageLabel(lang)}
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
                color: "var(--color-text-primary)",
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
                background: "var(--color-input-bg)",
                border: "1px solid var(--color-input-border)",
                borderRadius: "var(--radius-xs)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                color: "var(--color-text-primary)",
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
                background: "var(--color-input-bg)",
                border: "1px solid var(--color-input-border)",
                borderRadius: "var(--radius-xs)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              style={{
                padding: "0.75rem 1.5rem",
                background: "var(--color-primary)",
                color: "var(--color-primary-on)",
                border: "none",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewTranslation({
                  namespace: namespaces[0] ?? "",
                  key_path: "",
                  language: languages[0] ?? "",
                  value: "",
                });
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xs)",
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
            background: "var(--color-surface)",
            padding: "1.5rem",
            borderRadius: "var(--radius-sm)",
            marginBottom: "2rem",
            border: "2px solid var(--color-accent)",
          }}
        >
          <h3 style={{ color: "var(--color-text-primary)", marginBottom: "1rem" }}>
            Editing: {editingKey.namespace}.{editingKey.key_path}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {languages.map((lang) => {
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
                      color: "var(--color-text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {getLanguageLabel(lang)}
                  </label>
                  <textarea
                    value={editValues[lang] || ""}
                    onChange={(e) => setEditValues({ ...editValues, [lang]: e.target.value })}
                    placeholder={`Translation for ${getLanguageLabel(lang)}...`}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: "var(--color-input-bg)",
                      border: "1px solid var(--color-input-border)",
                      borderRadius: "var(--radius-xs)",
                      color: "var(--color-text-primary)",
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
                  background: "var(--color-primary)",
                  color: "var(--color-primary-on)",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
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
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-xs)",
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
        <div style={{ color: "var(--color-text-primary)" }}>Loading...</div>
      ) : (
        <>
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              border: "1px solid var(--color-border)",
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1400px" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-muted)" }}>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
                      width: "100px",
                    }}
                  >
                    Language
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
                      width: "120px",
                    }}
                  >
                    Namespace
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
                      minWidth: "150px",
                    }}
                  >
                    Key Path
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
                      minWidth: "200px",
                    }}
                  >
                    Term
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
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
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
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
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
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
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border)",
                      position: "sticky",
                      right: 0,
                      background: "var(--color-surface-muted)",
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
                        borderBottom: "1px solid var(--color-border)",
                        background: isEditingThisKey
                          ? "var(--color-accent-muted)"
                          : isDeleted
                            ? "var(--color-danger-bg)"
                            : "var(--color-surface)",
                        opacity: isDeleted ? 0.7 : 1,
                      }}
                    >
                      <td style={{ padding: "0.75rem", color: "var(--color-text-primary)" }}>
                        {getLanguageLabel(trans.language)}
                      </td>
                      <td style={{ padding: "0.75rem", color: "var(--color-text-primary)" }}>
                        {trans.namespace}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          color: "var(--color-text-primary)",
                          fontFamily: "monospace",
                          fontSize: "0.875rem",
                        }}
                      >
                        {trans.key_path}
                      </td>
                      <td style={{ padding: "0.75rem", color: "var(--color-text-primary)" }}>
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
                              background: "var(--color-input-bg)",
                              border: "1px solid var(--color-input-border)",
                              borderRadius: "var(--radius-xs)",
                              color: "var(--color-text-primary)",
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
                          color: "var(--color-text-primary)",
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
                          color: "var(--color-text-primary)",
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
                          color: isDeleted
                            ? "var(--color-danger-text)"
                            : "var(--color-text-primary)",
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
                            ? "var(--color-accent-muted)"
                            : isDeleted
                              ? "var(--color-danger-bg)"
                              : "var(--color-surface)",
                          zIndex: 5,
                          minWidth: "150px",
                          width: "150px",
                          boxShadow: "var(--shadow-e1)",
                        }}
                      >
                        {isEditingThisKey && trans.language === primaryLanguage ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={handleSave}
                              disabled={bulkUpdateMutation.isPending}
                              style={{
                                padding: "0.5rem 1rem",
                                background: "var(--color-primary)",
                                color: "var(--color-primary-on)",
                                border: "none",
                                borderRadius: "var(--radius-xs)",
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
                                color: "var(--color-text-primary)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-xs)",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isEditingThisKey ? (
                          <div style={{ color: "var(--color-accent)", fontSize: "0.875rem" }}>
                            Editing...
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleEdit(trans)}
                              style={{
                                padding: "0.5rem 1rem",
                                background: "transparent",
                                color: "var(--color-text-primary)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-xs)",
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
                  background: page === 0 ? "var(--color-border)" : "var(--color-accent)",
                  color: "var(--color-text-primary)",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ color: "var(--color-text-primary)" }}>
                Page {page + 1} of {Math.ceil(data.pagination.total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= data.pagination.total}
                style={{
                  padding: "0.75rem 1.5rem",
                  background:
                    (page + 1) * limit >= data.pagination.total
                      ? "var(--color-border)"
                      : "var(--color-accent)",
                  color: "var(--color-text-primary)",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
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
