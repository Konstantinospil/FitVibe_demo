import type { Response } from "express";
import type * as ArchiverModule from "archiver";

// TypeScript rewrites import() to require() in this CommonJS package. Keeping
// this tiny boundary native is required for Archiver 8's ESM-only entry point.
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- isolated ESM interop boundary
const loadArchiver = new Function("return import('archiver')") as () => Promise<
  typeof ArchiverModule
>;

export async function writeUserDataArchive(response: Response, data: unknown): Promise<void> {
  // Archiver 8 is ESM-only. This preserves native import() when TypeScript emits
  // the surrounding backend as CommonJS.
  const { ZipArchive } = await loadArchiver();
  const archive = new ZipArchive();

  archive.pipe(response);
  archive.append(JSON.stringify(data, null, 2), { name: "user_data.json" });
  await archive.finalize();
}
