import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import {
  searchUsers,
  suspendUser,
  banUser,
  activateUser,
  deleteUser,
  type UserRecord,
} from "../../services/api";
import { logger } from "../../utils/logger";

type ActionType = "suspend" | "ban" | "activate" | "delete";

const UserManagement: React.FC = () => {
  const toast = useToast();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: ActionType;
    user: UserRecord;
  } | null>(null);
  const labels = {
    title: t("admin.userManagement.title"),
    description: t("admin.userManagement.description"),
    searchPlaceholder: t("admin.userManagement.searchPlaceholder"),
    searchButton: t("admin.userManagement.searchButton"),
    searching: t("admin.userManagement.searching"),
    error: t("admin.userManagement.error"),
    emptyTitle: t("admin.userManagement.emptyTitle"),
    emptyDescription: t("admin.userManagement.emptyDescription"),
    actionLabels: {
      suspend: t("admin.userManagement.actionLabels.suspend"),
      ban: t("admin.userManagement.actionLabels.ban"),
      activate: t("admin.userManagement.actionLabels.activate"),
      delete: t("admin.userManagement.actionLabels.delete"),
    },
  };
  const actionCopy: Record<
    ActionType,
    { title: string; confirm: string; success: string; error: string; body: string }
  > = {
    suspend: {
      title: t("admin.userManagement.actions.suspend.title"),
      confirm: t("admin.userManagement.actions.suspend.confirm"),
      success: t("admin.userManagement.actions.suspend.success"),
      error: t("admin.userManagement.actions.suspend.error"),
      body: t("admin.userManagement.actions.suspend.body"),
    },
    ban: {
      title: t("admin.userManagement.actions.ban.title"),
      confirm: t("admin.userManagement.actions.ban.confirm"),
      success: t("admin.userManagement.actions.ban.success"),
      error: t("admin.userManagement.actions.ban.error"),
      body: t("admin.userManagement.actions.ban.body"),
    },
    activate: {
      title: t("admin.userManagement.actions.activate.title"),
      confirm: t("admin.userManagement.actions.activate.confirm"),
      success: t("admin.userManagement.actions.activate.success"),
      error: t("admin.userManagement.actions.activate.error"),
      body: t("admin.userManagement.actions.activate.body"),
    },
    delete: {
      title: t("admin.userManagement.actions.delete.title"),
      confirm: t("admin.userManagement.actions.delete.confirm"),
      success: t("admin.userManagement.actions.delete.success"),
      error: t("admin.userManagement.actions.delete.error"),
      body: t("admin.userManagement.actions.delete.body"),
    },
  };

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const result = await searchUsers({ q: trimmed });
      setUsers(result.data ?? []);
    } catch (err) {
      logger.apiError("Failed to search users", err, "/api/v1/admin/users/search", "GET");
      setError(labels.error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAction = async () => {
    if (!pendingAction) {
      return;
    }
    const { type, user } = pendingAction;
    const endpoint =
      type === "suspend"
        ? `/api/v1/admin/users/${user.id}/suspend`
        : type === "ban"
          ? `/api/v1/admin/users/${user.id}/ban`
          : type === "activate"
            ? `/api/v1/admin/users/${user.id}/activate`
            : `/api/v1/admin/users/${user.id}`;
    const method = type === "delete" ? "DELETE" : "POST";

    try {
      if (type === "suspend") {
        await suspendUser(user.id);
      } else if (type === "ban") {
        await banUser(user.id);
      } else if (type === "activate") {
        await activateUser(user.id);
      } else {
        await deleteUser(user.id);
      }
      toast.success(actionCopy[type].success);
      setPendingAction(null);
      await runSearch();
    } catch (err) {
      logger.apiError(`Failed to ${type} user`, err, endpoint, method);
      toast.error(actionCopy[type].error);
      setPendingAction(null);
    }
  };

  const closeDialog = () => setPendingAction(null);

  return (
    <section>
      <h2>{labels.title}</h2>
      <p>{labels.description}</p>

      <div>
        <input
          placeholder={labels.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void runSearch();
            }
          }}
        />
        <button type="button" onClick={() => void runSearch()} disabled={!query.trim()}>
          {isSearching ? labels.searching : labels.searchButton}
        </button>
      </div>

      {error ? <p>{error}</p> : null}

      {!isSearching && !error && users.length === 0 && query.trim() ? (
        <div>
          <p>{labels.emptyTitle}</p>
          <p>{labels.emptyDescription}</p>
        </div>
      ) : null}

      {users.length > 0 ? (
        <div>
          {users.map((user) => (
            <div key={user.id}>
              <div>
                <strong>@{user.username}</strong>
                <p>{user.email}</p>
              </div>
              <div>
                <span>{user.sessionCount}</span>
                <span>{user.reportCount}</span>
              </div>
              <div>
                {user.status === "active" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPendingAction({ type: "suspend", user })}
                    >
                      {labels.actionLabels.suspend}
                    </button>
                    <button type="button" onClick={() => setPendingAction({ type: "ban", user })}>
                      {labels.actionLabels.ban}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingAction({ type: "activate", user })}
                  >
                    {labels.actionLabels.activate}
                  </button>
                )}
                <button type="button" onClick={() => setPendingAction({ type: "delete", user })}>
                  {labels.actionLabels.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {pendingAction ? (
        <div role="dialog" aria-modal="true">
          <h3>{actionCopy[pendingAction.type].title}</h3>
          <p>{actionCopy[pendingAction.type].body}</p>
          <div>
            <button type="button" onClick={() => void handleAction()}>
              {actionCopy[pendingAction.type].confirm}
            </button>
            <button type="button" onClick={closeDialog}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default UserManagement;
