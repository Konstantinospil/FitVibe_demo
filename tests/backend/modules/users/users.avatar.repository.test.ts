/**
 * Unit tests for users avatar repository
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as repo from "../../../../apps/backend/src/modules/users/users.avatar.repository.js";
import { db } from "../../../../apps/backend/src/db/connection.js";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Users Avatar Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveUserAvatarMetadata", () => {
    it("should create new avatar metadata when none exists", async () => {
      const userId = "user-123";
      const meta = {
        storageKey: "avatars/user-123/avatar.png",
        fileUrl: "/users/avatar/user-123",
        mimeType: "image/png",
        bytes: 1024,
      };

      const mockRecord = {
        id: "media-1",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: meta.storageKey,
        file_url: meta.fileUrl,
        mime_type: meta.mimeType,
        media_type: "image",
        bytes: meta.bytes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock first() to return null (no existing record)
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);

      // Mock insert().returning()
      const mockInsertBuilder = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockRecord]),
      };
      mockDb.mockReturnValueOnce(mockInsertBuilder as never);

      const result = await repo.saveUserAvatarMetadata(userId, meta);

      expect(result.previousKey).toBeNull();
      expect(result.record).toEqual(mockRecord);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
      });
    });

    it("should update existing avatar metadata", async () => {
      const userId = "user-123";
      const meta = {
        storageKey: "avatars/user-123/avatar-new.png",
        fileUrl: "/users/avatar/user-123",
        mimeType: "image/png",
        bytes: 2048,
      };

      const existingRecord = {
        id: "media-1",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: "avatars/user-123/avatar-old.png",
        file_url: "/users/avatar/user-123",
        mime_type: "image/png",
        media_type: "image",
        bytes: 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedRecord = {
        ...existingRecord,
        storage_key: meta.storageKey,
        bytes: meta.bytes,
        updated_at: new Date().toISOString(),
      };

      // Mock first() to return existing record
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingRecord),
      };
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);

      // Mock update()
      const mockUpdateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(mockUpdateBuilder as never);

      // Mock second first() call to get updated record
      const mockUpdatedQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(updatedRecord),
      };
      mockDb.mockReturnValueOnce(mockUpdatedQueryBuilder as never);

      const result = await repo.saveUserAvatarMetadata(userId, meta);

      expect(result.previousKey).toBe(existingRecord.storage_key);
      expect(result.record).toEqual(updatedRecord);
    });
  });

  describe("getUserAvatarMetadata", () => {
    it("should return avatar metadata when it exists", async () => {
      const userId = "user-123";
      const mockRecord = {
        id: "media-1",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: "avatars/user-123/avatar.png",
        file_url: "/users/avatar/user-123",
        mime_type: "image/png",
        media_type: "image",
        bytes: 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockRecord),
      };
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);

      const result = await repo.getUserAvatarMetadata(userId);

      expect(result).toEqual(mockRecord);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
      });
    });

    it("should return null when avatar metadata does not exist", async () => {
      const userId = "user-123";

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);

      const result = await repo.getUserAvatarMetadata(userId);

      expect(result).toBeNull();
    });
  });

  describe("deleteUserAvatarMetadata", () => {
    it("should delete and return avatar metadata when it exists", async () => {
      const userId = "user-123";
      const mockRecord = {
        id: "media-1",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: "avatars/user-123/avatar.png",
        file_url: "/users/avatar/user-123",
        mime_type: "image/png",
        media_type: "image",
        bytes: 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock first() to return existing record
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockRecord),
      };
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);

      // Mock del()
      const mockDeleteBuilder = {
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(mockDeleteBuilder as never);

      const result = await repo.deleteUserAvatarMetadata(userId);

      expect(result).toEqual(mockRecord);
      expect(mockDeleteBuilder.where).toHaveBeenCalledWith({ id: mockRecord.id });
    });

    it("should return null when avatar metadata does not exist", async () => {
      const userId = "user-123";

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);

      const result = await repo.deleteUserAvatarMetadata(userId);

      expect(result).toBeNull();
    });
  });
});
