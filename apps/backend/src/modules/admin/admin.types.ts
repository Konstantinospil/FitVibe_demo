/**
 * Admin module types
 */

export interface FeedReport {
  id: string;
  reporterId: string;
  reporterUsername: string;
  feedItemId: string | null;
  commentId: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  contentPreview: string | null;
  contentAuthor: string | null;
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  email: string;
  roleCode: string;
  status: "active" | "suspended" | "banned";
  createdAt: string;
  deactivatedAt: string | null;
  lastLoginAt: string | null;
  sessionCount: number;
  reportCount: number;
  avatarUrl: string | null;
}

export interface ModerateReportInput {
  reportId: string;
  action: "dismiss" | "hide" | "ban";
  adminId: string;
}

export interface UserActionInput {
  userId: string;
  action: "blacklist" | "unblacklist" | "delete";
  adminId: string;
  reason?: string;
}

export interface ListReportsQuery {
  status?: "pending" | "reviewed" | "dismissed" | "all";
  limit?: number;
  offset?: number;
}

export interface SearchUsersQuery {
  query: string;
  limit?: number;
  offset?: number;
  blacklisted?: boolean;
}

export interface ActionUiMapping {
  action: string;
  uiName: string | null;
}
