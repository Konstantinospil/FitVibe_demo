import crypto from "node:crypto";
import { HttpError } from "../../utils/http.js";
import { insertAudit } from "../common/audit.util.js";
import {
  getActiveLegalTranslationRows,
  getCurrentLegalVersion,
  getLatestAcceptanceForDocument,
  getLatestRequiredLegalVersion,
  getLegalSnapshot,
  getLegalVersionById,
  getVersionStringsByPrefix,
  insertLegalSnapshot,
  insertLegalVersion,
  listLegalVersions,
  listSnapshotLanguages,
  lockLegalDocument,
  recordLegalAcceptance,
  withLegalTransaction,
} from "./legal.repository.js";
import type {
  LegalChangeClass,
  LegalDocumentContent,
  LegalDocumentType,
  LegalDocumentVersionRow,
  LegalUserAction,
  PublishLegalDocumentInput,
  PublishedLegalDocument,
} from "./legal.types.js";

const ALLOWED_ACTIONS: Record<LegalDocumentType, Set<LegalUserAction>> = {
  terms: new Set(["none", "accept"]),
  privacy: new Set(["none", "acknowledge", "accept", "renew_consent"]),
  cookie: new Set(["none", "renew_consent"]),
};

function assertPublicationPolicy(
  documentType: LegalDocumentType,
  changeClass: Exclude<LegalChangeClass, "legacy">,
  userAction: LegalUserAction,
): void {
  if (!ALLOWED_ACTIONS[documentType].has(userAction)) {
    throw new HttpError(400, "LEGAL_ACTION_INVALID", "Invalid user action for legal document");
  }
  if (changeClass === "editorial" && userAction !== "none") {
    throw new HttpError(
      400,
      "LEGAL_EDITORIAL_ACTION_INVALID",
      "Editorial changes cannot require renewed user action",
    );
  }
  if (changeClass === "material" && userAction === "none") {
    throw new HttpError(
      400,
      "LEGAL_MATERIAL_ACTION_REQUIRED",
      "Material changes must define the required user action",
    );
  }
}

function normalizeEffectiveAt(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "LEGAL_EFFECTIVE_AT_INVALID", "Invalid effective date");
  }
  return parsed.toISOString();
}

function setNestedValue(
  target: Record<string, unknown>,
  path: string[],
  value: string,
): void {
  let current = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const existing = current[key];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

function buildSnapshots(
  documentType: LegalDocumentType,
  rows: Array<{ language: string; key_path: string; value: string }>,
): Map<string, Record<string, unknown>> {
  const snapshots = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const content = snapshots.get(row.language) ?? {};
    const prefix = `${documentType}.`;
    const relativePath = row.key_path.startsWith(prefix)
      ? row.key_path.slice(prefix.length)
      : row.key_path;
    const keys = relativePath.split(".").filter(Boolean);
    if (keys.length === 0) {
      continue;
    }
    setNestedValue(content, keys, row.value);
    snapshots.set(row.language, content);
  }
  return snapshots;
}

function hashSnapshot(content: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function nextVersion(prefix: string, existing: string[]): string {
  let highest = 0;
  for (const version of existing) {
    const match = new RegExp(`^${prefix}\\.(\\d+)$`).exec(version);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return `${prefix}.${highest + 1}`;
}

export async function publishLegalDocument(
  input: PublishLegalDocumentInput,
  publishedBy: string,
): Promise<PublishedLegalDocument> {
  assertPublicationPolicy(input.documentType, input.changeClass, input.userAction);
  const effectiveAt = normalizeEffectiveAt(input.effectiveAt);
  const publishedAt = new Date().toISOString();

  const publication = await withLegalTransaction(async (trx) => {
    await lockLegalDocument(input.documentType, trx);

    const rows = await getActiveLegalTranslationRows(input.documentType, trx);
    if (rows.length === 0) {
      throw new HttpError(
        409,
        "LEGAL_TRANSLATIONS_EMPTY",
        "Cannot publish a legal document without active translations",
      );
    }

    const snapshots = buildSnapshots(input.documentType, rows);
    if (snapshots.size === 0) {
      throw new HttpError(
        409,
        "LEGAL_SNAPSHOT_EMPTY",
        "Cannot publish an empty legal document snapshot",
      );
    }

    const prefix = publishedAt.slice(0, 10);
    const existing = await getVersionStringsByPrefix(input.documentType, prefix, trx);
    const version = nextVersion(prefix, existing);

    const created = await insertLegalVersion(
      {
        document_type: input.documentType,
        version,
        change_class: input.changeClass,
        user_action: input.userAction,
        effective_at: effectiveAt,
        published_at: publishedAt,
        published_by: publishedBy,
        source: "backoffice",
      },
      trx,
    );

    for (const [language, content] of snapshots.entries()) {
      await insertLegalSnapshot(
        {
          version_id: created.id,
          language,
          content,
          content_hash: hashSnapshot(content),
        },
        trx,
      );
    }

    return { created, languages: [...snapshots.keys()].sort() };
  });

  await insertAudit({
    actorUserId: publishedBy,
    entityType: "legal_document_version",
    action: "publish",
    entityId: publication.created.id,
    outcome: "success",
    metadata: {
      documentType: publication.created.document_type,
      version: publication.created.version,
      changeClass: publication.created.change_class,
      userAction: publication.created.user_action,
      effectiveAt: publication.created.effective_at,
      languages: publication.languages,
    },
  });

  return {
    id: publication.created.id,
    documentType: publication.created.document_type,
    version: publication.created.version,
    changeClass: publication.created.change_class,
    userAction: publication.created.user_action,
    effectiveAt: publication.created.effective_at,
    publishedAt: publication.created.published_at,
    publishedBy: publication.created.published_by,
    languages: publication.languages,
  };
}

export async function getCurrentLegalPublication(
  documentType: LegalDocumentType,
): Promise<LegalDocumentVersionRow> {
  const version = await getCurrentLegalVersion(documentType);
  if (!version) {
    throw new HttpError(503, "LEGAL_VERSION_UNAVAILABLE", "No effective legal version is published");
  }
  return version;
}

export async function getCurrentLegalVersions(): Promise<Record<LegalDocumentType, string>> {
  const [terms, privacy, cookie] = await Promise.all([
    getCurrentLegalPublication("terms"),
    getCurrentLegalPublication("privacy"),
    getCurrentLegalPublication("cookie"),
  ]);
  return {
    terms: terms.version,
    privacy: privacy.version,
    cookie: cookie.version,
  };
}

export async function getCurrentLegalDocument(
  documentType: LegalDocumentType,
  language: string,
): Promise<LegalDocumentContent> {
  const publication = await getCurrentLegalPublication(documentType);
  const requested = await getLegalSnapshot(publication.id, language);
  const fallback =
    requested ?? (language === "en" ? null : await getLegalSnapshot(publication.id, "en"));
  return {
    documentType,
    version: publication.version,
    changeClass: publication.change_class,
    userAction: publication.user_action,
    effectiveAt: publication.effective_at,
    publishedAt: publication.published_at,
    language: fallback?.language ?? language,
    content: fallback?.content ?? null,
    legacyWithoutSnapshot: fallback === null,
  };
}

export async function listLegalPublications(
  documentType?: LegalDocumentType,
): Promise<PublishedLegalDocument[]> {
  const versions = await listLegalVersions(documentType);
  return Promise.all(
    versions.map(async (version) => ({
      id: version.id,
      documentType: version.document_type,
      version: version.version,
      changeClass: version.change_class,
      userAction: version.user_action,
      effectiveAt: version.effective_at,
      publishedAt: version.published_at,
      publishedBy: version.published_by,
      languages: await listSnapshotLanguages(version.id),
    })),
  );
}

export async function legalVersionSatisfiesCurrentRequirement(
  documentType: LegalDocumentType,
  versionId: string | null | undefined,
): Promise<boolean> {
  if (!versionId) {
    return false;
  }
  const [version, required] = await Promise.all([
    getLegalVersionById(versionId),
    getLatestRequiredLegalVersion(documentType),
  ]);
  if (!version || version.document_type !== documentType) {
    return false;
  }
  if (!required) {
    return true;
  }

  const versionEffectiveAt = new Date(version.effective_at).getTime();
  const requiredEffectiveAt = new Date(required.effective_at).getTime();
  return (
    versionEffectiveAt > requiredEffectiveAt ||
    (versionEffectiveAt === requiredEffectiveAt &&
      new Date(version.published_at).getTime() >= new Date(required.published_at).getTime())
  );
}

export async function getLegalActionStatus(
  userId: string,
  documentType: LegalDocumentType,
): Promise<{
  currentVersion: string;
  requiredVersion: string | null;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  requiredAction: LegalUserAction;
  needsAction: boolean;
}> {
  const [current, required, latestAcceptance] = await Promise.all([
    getCurrentLegalPublication(documentType),
    getLatestRequiredLegalVersion(documentType),
    getLatestAcceptanceForDocument(userId, documentType),
  ]);

  if (!required) {
    return {
      currentVersion: current.version,
      requiredVersion: null,
      acceptedVersion: latestAcceptance?.version ?? null,
      acceptedAt: latestAcceptance?.accepted_at ?? null,
      requiredAction: "none",
      needsAction: false,
    };
  }

  const latestAcceptedEffectiveAt = latestAcceptance
    ? new Date(latestAcceptance.version_effective_at).getTime()
    : Number.NEGATIVE_INFINITY;
  const requiredEffectiveAt = new Date(required.effective_at).getTime();

  const acceptedRequiredOrNewer =
    latestAcceptedEffectiveAt > requiredEffectiveAt ||
    (latestAcceptedEffectiveAt === requiredEffectiveAt &&
      latestAcceptance !== null &&
      new Date(latestAcceptance.version_published_at).getTime() >=
        new Date(required.published_at).getTime());

  return {
    currentVersion: current.version,
    requiredVersion: required.version,
    acceptedVersion: latestAcceptance?.version ?? null,
    acceptedAt: latestAcceptance?.accepted_at ?? null,
    requiredAction: required.user_action,
    needsAction: !acceptedRequiredOrNewer,
  };
}

export async function acceptLegalDocumentVersion(
  userId: string,
  versionId: string,
  source = "application",
): Promise<LegalDocumentVersionRow> {
  const version = await getLegalVersionById(versionId);
  if (!version) {
    throw new HttpError(404, "LEGAL_VERSION_NOT_FOUND", "Legal version not found");
  }
  const action: Exclude<LegalUserAction, "none"> =
    version.user_action === "none"
      ? version.document_type === "cookie"
        ? "renew_consent"
        : version.document_type === "privacy"
          ? "acknowledge"
          : "accept"
      : version.user_action;
  await recordLegalAcceptance(userId, version.id, action, new Date().toISOString(), source);
  return version;
}

export async function acceptCurrentLegalDocument(
  userId: string,
  documentType: LegalDocumentType,
  source = "application",
): Promise<LegalDocumentVersionRow> {
  const version = await getCurrentLegalPublication(documentType);
  const action: Exclude<LegalUserAction, "none"> =
    version.user_action === "none"
      ? documentType === "cookie"
        ? "renew_consent"
        : documentType === "privacy"
          ? "acknowledge"
          : "accept"
      : version.user_action;
  await recordLegalAcceptance(userId, version.id, action, new Date().toISOString(), source);
  return version;
}
