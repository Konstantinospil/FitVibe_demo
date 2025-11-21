import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  deleteStorageObject,
  readStorageObject,
  saveUserAvatarFile,
} from "../mediaStorage.service";

function resolveTempRoot(): string {
  return path.join(os.tmpdir(), `fitvibe-media-storage-tests-${process.pid}`);
}

const TEMP_ROOT = resolveTempRoot();

jest.mock("../../config/env.js", () => ({
  env: {
    mediaStorageRoot: resolveTempRoot(),
  },
}));

describe("mediaStorage.service", () => {
  beforeEach(async () => {
    await fs.rm(TEMP_ROOT, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(TEMP_ROOT, { recursive: true, force: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("saves avatar files with mime-specific extensions and returns metadata", async () => {
    const buffer = Buffer.from("binary-avatar-data");
    jest.spyOn(crypto, "randomUUID").mockReturnValue("fixed-file-id");

    const result = await saveUserAvatarFile("user-123", buffer, "image/png");

    expect(result).toEqual({
      storageKey: "avatars/user-123/fixed-file-id.png",
      bytes: buffer.length,
    });

    const savedPath = path.join(TEMP_ROOT, "avatars", "user-123", "fixed-file-id.png");
    const savedBuffer = await fs.readFile(savedPath);
    expect(savedBuffer.equals(buffer)).toBe(true);
  });

  it("reads previously saved objects via storage keys", async () => {
    const stored = Buffer.from("existing-avatar");
    const keyPath = path.join(TEMP_ROOT, "avatars", "user-456", "existing.bin");
    await fs.mkdir(path.dirname(keyPath), { recursive: true });
    await fs.writeFile(keyPath, stored);

    const buffer = await readStorageObject("avatars/user-456/existing.bin");

    expect(buffer.equals(stored)).toBe(true);
  });

  it("prevents suspicious keys from touching files outside the storage root", async () => {
    const outsidePath = path.join(path.dirname(TEMP_ROOT), "sensitive.txt");
    await fs.writeFile(outsidePath, "super-secret");

    try {
      await expect(readStorageObject("../sensitive.txt")).rejects.toThrow(/ENOENT/);
      await deleteStorageObject("../sensitive.txt");
      await expect(fs.readFile(outsidePath, "utf8")).resolves.toBe("super-secret");
    } finally {
      await fs.rm(outsidePath, { force: true });
    }
  });

  it("deletes storage objects when requested by key", async () => {
    const deletePath = path.join(TEMP_ROOT, "avatars", "user-789", "remove.me");
    await fs.mkdir(path.dirname(deletePath), { recursive: true });
    await fs.writeFile(deletePath, Buffer.from("to-be-removed"));

    await deleteStorageObject("avatars/user-789/remove.me");

    await expect(fs.access(deletePath)).rejects.toThrow();
  });
});
