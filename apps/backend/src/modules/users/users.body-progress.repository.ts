import crypto from "node:crypto";
import { db } from "../../db/connection.js";

const TARGET_TYPE = "body_progress";

export interface BodyWeightEntry {
  id: string;
  weightKg: number;
  measuredAt: string;
}

export interface BodyProgressPhoto {
  id: string;
  fileUrl: string;
  mimeType: string | null;
  bytes: number | null;
  createdAt: string;
}

export async function listBodyWeights(userId: string, limit = 50): Promise<BodyWeightEntry[]> {
  const rows = await db("bio_attribute_values as v")
    .join("bio_attributes as a", "a.id", "v.attribute_id")
    .where("v.user_id", userId)
    .andWhere("a.key", "weight_kg")
    .whereNull("v.deactivated_at")
    .orderBy("v.measured_at", "desc")
    .limit(limit)
    .select<Array<{ id: string; value_number: string | number; measured_at: string }>>(
      "v.id",
      "v.value_number",
      "v.measured_at",
    );

  return rows.map((row) => ({
    id: row.id,
    weightKg: Number(row.value_number),
    measuredAt: row.measured_at,
  }));
}

export async function addBodyWeight(
  userId: string,
  weightKg: number,
  measuredAt: string,
): Promise<BodyWeightEntry> {
  const attribute = await db("bio_attributes").where({ key: "weight_kg" }).first<{ id: string }>();
  if (!attribute) {
    throw new Error("WEIGHT_ATTRIBUTE_NOT_FOUND");
  }

  const now = new Date().toISOString();
  const [row] = (await db("bio_attribute_values")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      attribute_id: attribute.id,
      value_number: weightKg,
      measured_at: measuredAt,
      created_at: now,
    })
    .returning(["id", "value_number", "measured_at"])) as Array<{
    id: string;
    value_number: string | number;
    measured_at: string;
  }>;

  return {
    id: row.id,
    weightKg: Number(row.value_number),
    measuredAt: row.measured_at,
  };
}

export async function listBodyProgressPhotos(
  userId: string,
  limit = 50,
): Promise<BodyProgressPhoto[]> {
  const rows = await db("media")
    .where({ owner_id: userId, target_type: TARGET_TYPE })
    .orderBy("created_at", "desc")
    .limit(limit)
    .select<
      Array<{
        id: string;
        file_url: string;
        mime_type: string | null;
        bytes: number | null;
        created_at: string;
      }>
    >(["id", "file_url", "mime_type", "bytes", "created_at"]);

  return rows.map((row) => ({
    id: row.id,
    fileUrl: row.file_url,
    mimeType: row.mime_type,
    bytes: row.bytes,
    createdAt: row.created_at,
  }));
}

export async function addBodyProgressPhoto(
  userId: string,
  storageKey: string,
  mimeType: string,
  bytes: number,
): Promise<{ id: string; storageKey: string; createdAt: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db("media").insert({
    id,
    owner_id: userId,
    target_type: TARGET_TYPE,
    target_id: id,
    storage_key: storageKey,
    file_url: `/api/v1/users/me/body-progress/photo/${id}`,
    mime_type: mimeType,
    media_type: "image",
    bytes,
    created_at: now,
  });
  return { id, storageKey, createdAt: now };
}

export async function getBodyProgressPhoto(
  userId: string,
  id: string,
): Promise<
  | {
      id: string;
      storageKey: string;
      mimeType: string | null;
    }
  | null
> {
  const row = await db("media")
    .where({ id, owner_id: userId, target_type: TARGET_TYPE })
    .first<{ id: string; storage_key: string; mime_type: string | null }>();
  if (!row) {
    return null;
  }
  return { id: row.id, storageKey: row.storage_key, mimeType: row.mime_type };
}

export async function deleteBodyProgressPhoto(
  userId: string,
  id: string,
): Promise<{ storageKey: string } | null> {
  const row = await getBodyProgressPhoto(userId, id);
  if (!row) {
    return null;
  }
  await db("media").where({ id, owner_id: userId, target_type: TARGET_TYPE }).del();
  return { storageKey: row.storageKey };
}
