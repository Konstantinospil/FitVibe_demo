export type UserStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "banned"
  | "pending_deletion"
  | "deleted";

export type SessionStatus = "planned" | "in_progress" | "completed" | "canceled";

export type SessionVisibility = "private" | "followers" | "link" | "public";
