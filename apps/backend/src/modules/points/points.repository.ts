import type { Knex } from "knex";

import { db } from "../../db/connection.js";
import type {
  BadgeAwardRecord,
  BadgeCatalogEntry,
  ExerciseMetadata,
  InsertPointsEvent,
  InsertBadgeAward,
  PointsEventRecord,
  UserPointsProfile,
} from "./points.types.js";

const TABLE = "user_points";

function executor(trx?: Knex.Transaction) {
  return trx ?? db;
}

function toIsoString(value: unknown): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  return new Date(value as number).toISOString();
}

function normalizeTagList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

interface PointsEventRow {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string | null;
  algorithm_version: string | null;
  points: string | number;
  calories: string | number | null;
  metadata: unknown;
  awarded_at: Date | string | number | null;
  created_at: Date | string | number | null;
}

interface ProfileRow {
  user_id: string;
  date_of_birth: string | null;
  gender_code: string | null;
}

interface UserMetricsRow {
  user_id: string;
  fitness_level_code: string | null;
  training_frequency: string | null;
  recorded_at: Date | string | null;
}

interface ExerciseRow {
  id: string;
  type_code: string | null;
  tags: unknown;
}

interface BadgeCatalogRow {
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  priority: string | number | null;
  criteria: unknown;
}

interface BadgeRow {
  user_id: string;
  badge_type: string;
}

interface CompletedSessionRow {
  owner_id: string;
  status: string;
  completed_at: Date | string | null;
}

interface BadgeAwardRow {
  id: string;
  user_id: string;
  badge_type: string;
  metadata: unknown;
  awarded_at: Date | string | number | null;
}

const POINTS_EVENT_COLUMNS = [
  "id",
  "user_id",
  "source_type",
  "source_id",
  "algorithm_version",
  "points",
  "calories",
  "metadata",
  "awarded_at",
  "created_at",
] as const;

type PointsEventQueryBuilder = Knex.QueryBuilder<PointsEventRow, PointsEventRow[]>;

function toPointsEventRecord(row: PointsEventRow): PointsEventRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    source_type: row.source_type,
    source_id: row.source_id ?? null,
    algorithm_version: row.algorithm_version ?? null,
    points: Number(row.points),
    calories: row.calories === null || row.calories === undefined ? null : Number(row.calories),
    metadata: toRecord(row.metadata),
    awarded_at: toIsoString(row.awarded_at),
    created_at: toIsoString(row.created_at),
  };
}

export async function insertPointsEvent(
  event: InsertPointsEvent,
  trx?: Knex.Transaction,
): Promise<PointsEventRecord> {
  const exec = executor(trx);
  const [row] = await exec<PointsEventRow>(TABLE)
    .insert(event)
    .returning<PointsEventRow[]>(POINTS_EVENT_COLUMNS);
  return toPointsEventRecord(row);
}

export async function findPointsEventBySource(
  userId: string,
  sourceType: string,
  sourceId: string,
  trx?: Knex.Transaction,
): Promise<PointsEventRecord | undefined> {
  const exec = executor(trx);
  const row = await exec<PointsEventRow>(TABLE)
    .select<PointsEventRow[]>(POINTS_EVENT_COLUMNS)
    .where({
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
    })
    .first();
  return row ? toPointsEventRecord(row) : undefined;
}

export async function getPointsBalance(userId: string, trx?: Knex.Transaction): Promise<number> {
  const exec = executor(trx);
  const result = await exec(TABLE)
    .where({ user_id: userId })
    .sum<{ total: string | number }>("points as total")
    .first();
  const value = result?.total ?? 0;
  return typeof value === "string" ? Number(value) : Number(value ?? 0);
}

export async function getRecentPointsEvents(
  userId: string,
  limit: number,
  trx?: Knex.Transaction,
): Promise<PointsEventRecord[]> {
  const exec = executor(trx);
  const rows = await exec<PointsEventRow>(TABLE)
    .select<PointsEventRow[]>(POINTS_EVENT_COLUMNS)
    .where({ user_id: userId })
    .orderBy("awarded_at", "desc")
    .orderBy("id", "desc")
    .limit(limit);
  return rows.map(toPointsEventRecord);
}

export interface HistoryCursor {
  awardedAt: Date;
  id: string;
}

export interface PointsHistoryOptions {
  limit: number;
  cursor?: HistoryCursor;
  from?: Date;
  to?: Date;
}

export async function getPointsHistory(
  userId: string,
  options: PointsHistoryOptions,
  trx?: Knex.Transaction,
): Promise<PointsEventRecord[]> {
  const exec = executor(trx);
  const query = exec<PointsEventRow>(TABLE)
    .select<PointsEventRow[]>(POINTS_EVENT_COLUMNS)
    .where({ user_id: userId })
    .orderBy("awarded_at", "desc")
    .orderBy("id", "desc")
    .limit(options.limit);

  if (options.from) {
    query.andWhere("awarded_at", ">=", options.from);
  }
  if (options.to) {
    query.andWhere("awarded_at", "<=", options.to);
  }
  if (options.cursor) {
    query.andWhere((builder: PointsEventQueryBuilder) => {
      builder
        .where("awarded_at", "<", options.cursor!.awardedAt)
        .orWhere((inner: PointsEventQueryBuilder) => {
          inner
            .where("awarded_at", "=", options.cursor!.awardedAt)
            .andWhere("id", "<", options.cursor!.id);
        });
    });
  }

  const rows = await query;
  return rows.map(toPointsEventRecord);
}

export async function getUserPointsProfile(
  userId: string,
  trx?: Knex.Transaction,
): Promise<UserPointsProfile> {
  const exec = executor(trx);
  const [staticRow, metricsRow] = await Promise.all([
    exec<ProfileRow>("profiles")
      .select<ProfileRow[]>(["date_of_birth", "gender_code"])
      .where({ user_id: userId })
      .first(),
    exec<UserMetricsRow>("user_metrics")
      .select<UserMetricsRow[]>(["fitness_level_code", "training_frequency", "recorded_at"])
      .where({ user_id: userId })
      .orderBy("recorded_at", "desc")
      .first(),
  ]);

  return {
    dateOfBirth: staticRow?.date_of_birth ?? null,
    genderCode: staticRow?.gender_code ?? null,
    fitnessLevelCode: metricsRow?.fitness_level_code ?? null,
    trainingFrequency: metricsRow?.training_frequency ?? null,
  };
}

export async function getExercisesMetadata(
  exerciseIds: string[],
  trx?: Knex.Transaction,
): Promise<Map<string, ExerciseMetadata>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }
  const exec = executor(trx);
  const rows = await exec<ExerciseRow>("exercises")
    .whereIn("id", exerciseIds)
    .select<ExerciseRow[]>(["id", "type_code", "tags"]);

  const map = new Map<string, ExerciseMetadata>();
  for (const row of rows) {
    const tags = normalizeTagList(row.tags);
    map.set(row.id, {
      id: row.id,
      type_code: row.type_code ?? null,
      tags,
    });
  }
  return map;
}

export async function getBadgeCatalog(
  trx?: Knex.Transaction,
): Promise<Map<string, BadgeCatalogEntry>> {
  const exec = executor(trx);
  const rows = await exec<BadgeCatalogRow>("badge_catalog").select<BadgeCatalogRow[]>([
    "code",
    "name",
    "description",
    "category",
    "icon",
    "priority",
    "criteria",
  ]);
  const map = new Map<string, BadgeCatalogEntry>();
  for (const row of rows) {
    map.set(row.code, {
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      category: row.category ?? "",
      icon: row.icon ?? null,
      priority: Number(row.priority ?? 0),
      criteria: toRecord(row.criteria),
    });
  }
  return map;
}

export async function getUserBadgeCodes(
  userId: string,
  trx?: Knex.Transaction,
): Promise<Set<string>> {
  const exec = executor(trx);
  const rows = await exec<BadgeRow>("badges")
    .where({ user_id: userId })
    .select<BadgeRow[]>(["badge_type"]);
  return new Set(rows.map((row) => row.badge_type));
}

export async function insertBadgeAward(
  award: InsertBadgeAward,
  trx?: Knex.Transaction,
): Promise<BadgeAwardRecord> {
  const exec = executor(trx);
  const [row] = await exec<BadgeAwardRow>("badges")
    .insert({
      ...award,
      metadata: award.metadata,
    })
    .returning<BadgeAwardRow[]>(["id", "user_id", "badge_type", "metadata", "awarded_at"]);

  return {
    id: row.id,
    user_id: row.user_id,
    badge_type: row.badge_type,
    metadata: toRecord(row.metadata),
    awarded_at: toIsoString(row.awarded_at),
  };
}

export async function countCompletedSessions(
  userId: string,
  trx?: Knex.Transaction,
): Promise<number> {
  const exec = executor(trx);
  const row = await exec("sessions")
    .where({ owner_id: userId, status: "completed" })
    .whereNull("deleted_at")
    .count<{ count: string | number }>("id as count")
    .first();
  const value = row?.count ?? 0;
  return typeof value === "string" ? Number(value) : Number(value ?? 0);
}

export async function getCompletedSessionDatesInRange(
  userId: string,
  from: Date,
  to: Date,
  trx?: Knex.Transaction,
): Promise<Set<string>> {
  const exec = executor(trx);
  const rows: CompletedSessionRow[] = await exec<CompletedSessionRow>("sessions")
    .where({ owner_id: userId, status: "completed" })
    .whereNull("deleted_at")
    .whereBetween("completed_at", [from, to])
    .select<CompletedSessionRow[]>(["completed_at"]);

  const days = new Set<string>();
  for (const row of rows) {
    if (!row.completed_at) {
      continue;
    }
    const iso = toIsoString(row.completed_at);
    days.add(iso.slice(0, 10));
  }
  return days;
}

// Vibe Level Repository Functions

import type {
  DomainCode,
  DomainVibeLevel,
  InsertVibeLevelChange,
  VibeLevelChangeRecord,
} from "./points.types.js";

interface DomainVibeLevelRow {
  user_id: string;
  domain_code: string;
  vibe_level: string | number;
  rating_deviation: string | number;
  volatility: string | number;
  last_updated_at: Date | string | number | null;
  created_at: Date | string | number | null;
  updated_at: Date | string | number | null;
}

interface VibeLevelChangeRow {
  id: string;
  user_id: string;
  domain_code: string;
  session_id: string | null;
  old_vibe_level: string | number;
  new_vibe_level: string | number;
  old_rd: string | number;
  new_rd: string | number;
  change_amount: string | number;
  performance_score: string | number | null;
  domain_impact: string | number | null;
  points_awarded: string | number | null;
  change_reason: string;
  metadata: unknown;
  created_at: Date | string | number | null;
}

function toDomainVibeLevel(row: DomainVibeLevelRow): DomainVibeLevel {
  return {
    user_id: row.user_id,
    domain_code: row.domain_code as DomainCode,
    vibe_level: Number(row.vibe_level),
    rating_deviation: Number(row.rating_deviation),
    volatility: Number(row.volatility),
    last_updated_at: toIsoString(row.last_updated_at),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

function toVibeLevelChangeRecord(row: VibeLevelChangeRow): VibeLevelChangeRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    domain_code: row.domain_code as DomainCode,
    session_id: row.session_id ?? null,
    old_vibe_level: Number(row.old_vibe_level),
    new_vibe_level: Number(row.new_vibe_level),
    old_rd: Number(row.old_rd),
    new_rd: Number(row.new_rd),
    change_amount: Number(row.change_amount),
    performance_score:
      row.performance_score === null || row.performance_score === undefined
        ? null
        : Number(row.performance_score),
    domain_impact:
      row.domain_impact === null || row.domain_impact === undefined
        ? null
        : Number(row.domain_impact),
    points_awarded:
      row.points_awarded === null || row.points_awarded === undefined
        ? null
        : Number(row.points_awarded),
    change_reason: row.change_reason as "session_completed" | "decay" | "manual_adjustment",
    metadata: toRecord(row.metadata),
    created_at: toIsoString(row.created_at),
  };
}

export async function getDomainVibeLevel(
  userId: string,
  domainCode: DomainCode,
  trx?: Knex.Transaction,
): Promise<DomainVibeLevel | undefined> {
  const exec = executor(trx);
  const row = await exec<DomainVibeLevelRow>("user_domain_vibe_levels")
    .where({ user_id: userId, domain_code: domainCode })
    .first();

  return row ? toDomainVibeLevel(row) : undefined;
}

export async function getAllDomainVibeLevels(
  userId: string,
  trx?: Knex.Transaction,
): Promise<Map<DomainCode, DomainVibeLevel>> {
  const exec = executor(trx);
  const rows = await exec<DomainVibeLevelRow>("user_domain_vibe_levels")
    .where({ user_id: userId })
    .select<
      DomainVibeLevelRow[]
    >(["user_id", "domain_code", "vibe_level", "rating_deviation", "volatility", "last_updated_at", "created_at", "updated_at"]);

  const map = new Map<DomainCode, DomainVibeLevel>();
  for (const row of rows) {
    map.set(row.domain_code as DomainCode, toDomainVibeLevel(row));
  }
  return map;
}

export async function updateDomainVibeLevel(
  userId: string,
  domainCode: DomainCode,
  vibeLevel: number,
  ratingDeviation: number,
  volatility: number,
  trx?: Knex.Transaction,
): Promise<void> {
  const exec = executor(trx);
  const now = new Date().toISOString();

  await exec("user_domain_vibe_levels").where({ user_id: userId, domain_code: domainCode }).update({
    vibe_level: vibeLevel,
    rating_deviation: ratingDeviation,
    volatility: volatility,
    last_updated_at: now,
    updated_at: now,
  });
}

export async function insertVibeLevelChange(
  change: InsertVibeLevelChange,
  trx?: Knex.Transaction,
): Promise<VibeLevelChangeRecord> {
  const exec = executor(trx);
  const [row] = await exec<VibeLevelChangeRow>("vibe_level_changes")
    .insert({
      user_id: change.user_id,
      domain_code: change.domain_code,
      session_id: change.session_id ?? null,
      old_vibe_level: change.old_vibe_level,
      new_vibe_level: change.new_vibe_level,
      old_rd: change.old_rd,
      new_rd: change.new_rd,
      change_amount: change.change_amount,
      performance_score: change.performance_score ?? null,
      domain_impact: change.domain_impact ?? null,
      points_awarded: change.points_awarded ?? null,
      change_reason: change.change_reason,
      metadata: change.metadata,
    })
    .returning<VibeLevelChangeRow[]>(["*"]);

  return toVibeLevelChangeRecord(row);
}
