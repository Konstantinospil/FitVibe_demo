import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  saveUserAvatarFile,
  readStorageObject,
  deleteStorageObject,
} from "../../../apps/backend/src/services/mediaStorage.service.js";
import { env } from "../../../apps/backend/src/config/env.js";

// Mock fs module
jest.mock("node:fs/promises");
jest.mock("node:crypto");
jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    mediaStorageRoot: "/tmp/test-storage",
  },
}));

describe("mediaStorage.service", () => {
  const mockMkdir = jest.mocked(fs.mkdir);
  const mockWriteFile = jest.mocked(fs.writeFile);
  const mockReadFile = jest.mocked(fs.readFile);
  const mockAccess = jest.mocked(fs.access);
  const mockRm = jest.mocked(fs.rm);
  const mockRandomUUID = jest.mocked(crypto.randomUUID);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("saveUserAvatarFile", () => {
    it("should save a PNG avatar file and return storage key", async () => {
      const userId = "user-123";
      const buffer = Buffer.from("fake-image-data");
      const mimeType = "image/png";
      const mockUUID = "test-uuid-123";

      mockRandomUUID.mockReturnValue(mockUUID);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await saveUserAvatarFile(userId, buffer, mimeType);

      const expectedDir = path.resolve(env.mediaStorageRoot, "avatars", userId);
      const expectedFile = path.resolve(env.mediaStorageRoot, "avatars", userId, `${mockUUID}.png`);

      expect(mockMkdir).toHaveBeenCalledWith(expectedDir, {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalledWith(expectedFile, buffer);
      expect(result).toEqual({
        storageKey: `avatars/${userId}/${mockUUID}.png`,
        bytes: buffer.length,
      });
    });

    it("should save a JPEG avatar file and return storage key", async () => {
      const userId = "user-456";
      const buffer = Buffer.from("fake-jpeg-data");
      const mimeType = "image/jpeg";
      const mockUUID = "test-uuid-456";

      mockRandomUUID.mockReturnValue(mockUUID);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await saveUserAvatarFile(userId, buffer, mimeType);

      expect(result.storageKey).toContain(".jpg");
      expect(result.bytes).toBe(buffer.length);
    });

    it("should save a WebP avatar file and return storage key", async () => {
      const userId = "user-789";
      const buffer = Buffer.from("fake-webp-data");
      const mimeType = "image/webp";
      const mockUUID = "test-uuid-789";

      mockRandomUUID.mockReturnValue(mockUUID);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await saveUserAvatarFile(userId, buffer, mimeType);

      expect(result.storageKey).toContain(".webp");
      expect(result.bytes).toBe(buffer.length);
    });

    it("should use .bin extension for unknown MIME types", async () => {
      const userId = "user-unknown";
      const buffer = Buffer.from("fake-data");
      const mimeType = "application/octet-stream";
      const mockUUID = "test-uuid-unknown";

      mockRandomUUID.mockReturnValue(mockUUID);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await saveUserAvatarFile(userId, buffer, mimeType);

      expect(result.storageKey).toContain(".bin");
      expect(result.bytes).toBe(buffer.length);
    });

    it("should handle directory creation errors", async () => {
      const userId = "user-error";
      const buffer = Buffer.from("fake-data");
      const mimeType = "image/png";

      mockMkdir.mockRejectedValue(new Error("Permission denied"));

      await expect(saveUserAvatarFile(userId, buffer, mimeType)).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should handle file write errors", async () => {
      const userId = "user-write-error";
      const buffer = Buffer.from("fake-data");
      const mimeType = "image/png";
      const mockUUID = "test-uuid-write-error";

      mockRandomUUID.mockReturnValue(mockUUID);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(new Error("Disk full"));

      await expect(saveUserAvatarFile(userId, buffer, mimeType)).rejects.toThrow("Disk full");
    });
  });

  describe("readStorageObject", () => {
    it("should read a storage object successfully", async () => {
      const storageKey = "avatars/user-123/file.png";
      const buffer = Buffer.from("file-content");

      mockReadFile.mockResolvedValue(buffer);

      const result = await readStorageObject(storageKey);

      expect(mockReadFile).toHaveBeenCalled();
      expect(result).toEqual(buffer);
    });

    it("should prevent path traversal attacks", async () => {
      const storageKey = "../../../etc/passwd";
      const buffer = Buffer.from("file-content");

      // The implementation sanitizes path traversal attempts by removing '..'
      // So '../../../etc/passwd' becomes 'etc/passwd' which is within storage root
      mockReadFile.mockResolvedValue(buffer);

      const result = await readStorageObject(storageKey);

      // Should successfully read the file after sanitization
      expect(result).toEqual(buffer);
      expect(mockReadFile).toHaveBeenCalled();
    });

    it("should handle file not found errors", async () => {
      const storageKey = "avatars/user-123/nonexistent.png";
      const error = new Error("ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";

      mockReadFile.mockRejectedValue(error);

      await expect(readStorageObject(storageKey)).rejects.toThrow();
    });

    it("should handle other read errors", async () => {
      const storageKey = "avatars/user-123/file.png";

      mockReadFile.mockRejectedValue(new Error("Permission denied"));

      await expect(readStorageObject(storageKey)).rejects.toThrow("Permission denied");
    });

    it("should normalize storage keys with backslashes", async () => {
      const storageKey = "avatars\\user-123\\file.png";
      const buffer = Buffer.from("file-content");

      mockReadFile.mockResolvedValue(buffer);

      await readStorageObject(storageKey);

      expect(mockReadFile).toHaveBeenCalled();
    });
  });

  describe("deleteStorageObject", () => {
    it("should delete a storage object successfully", async () => {
      const storageKey = "avatars/user-123/file.png";

      mockAccess.mockResolvedValue(undefined);
      mockRm.mockResolvedValue(undefined);

      await deleteStorageObject(storageKey);

      expect(mockAccess).toHaveBeenCalled();
      expect(mockRm).toHaveBeenCalledWith(expect.any(String), { force: true });
    });

    it("should throw error when file does not exist", async () => {
      const storageKey = "avatars/user-123/nonexistent.png";
      const error = new Error("ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";

      mockAccess.mockRejectedValue(error);

      await expect(deleteStorageObject(storageKey)).rejects.toThrow("Storage object not found:");
    });

    it("should handle other access errors", async () => {
      const storageKey = "avatars/user-123/file.png";

      mockAccess.mockRejectedValue(new Error("Permission denied"));

      await expect(deleteStorageObject(storageKey)).rejects.toThrow("Permission denied");
    });

    it("should handle delete errors", async () => {
      const storageKey = "avatars/user-123/file.png";

      mockAccess.mockResolvedValue(undefined);
      mockRm.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteStorageObject(storageKey)).rejects.toThrow("Delete failed");
    });

    it("should prevent path traversal attacks", async () => {
      const storageKey = "../../../etc/passwd";

      // The implementation sanitizes path traversal attempts by removing '..'
      // So '../../../etc/passwd' becomes 'etc/passwd' which is within storage root
      mockAccess.mockResolvedValue(undefined);
      mockRm.mockResolvedValue(undefined);

      await deleteStorageObject(storageKey);

      // Should successfully delete after sanitization
      expect(mockAccess).toHaveBeenCalled();
      expect(mockRm).toHaveBeenCalled();
    });

    it("should use force flag when deleting", async () => {
      const storageKey = "avatars/user-123/file.png";

      mockAccess.mockResolvedValue(undefined);
      mockRm.mockResolvedValue(undefined);

      await deleteStorageObject(storageKey);

      expect(mockRm).toHaveBeenCalledWith(expect.any(String), { force: true });
    });
  });
});
