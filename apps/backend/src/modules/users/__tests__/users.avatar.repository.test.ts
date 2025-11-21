import { db } from "../../../db/connection.js";
import * as avatarRepository from "../users.avatar.repository.js";

// Mock the database connection
jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Users Avatar Repository", () => {
  let mockQueryBuilder: {
    where: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    returning: jest.Mock;
    orderBy: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      returning: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("saveUserAvatarMetadata", () => {
    it("should update existing avatar metadata", async () => {
      const existingAvatar = {
        id: "avatar-1",
        owner_id: "user-123",
        target_type: "user_avatar",
        target_id: "user-123",
        storage_key: "old-key",
        file_url: "old-url",
        mime_type: "image/jpeg",
        media_type: "image",
        bytes: 10000,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: null,
      };

      const updatedAvatar = {
        ...existingAvatar,
        storage_key: "new-key",
        file_url: "new-url",
        mime_type: "image/png",
        bytes: 20000,
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockDb
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          first: jest.fn().mockResolvedValue(existingAvatar),
        } as never)
        .mockReturnValueOnce(mockQueryBuilder as never)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          first: jest.fn().mockResolvedValue(updatedAvatar),
        } as never);

      const result = await avatarRepository.saveUserAvatarMetadata("user-123", {
        storageKey: "new-key",
        fileUrl: "new-url",
        mimeType: "image/png",
        bytes: 20000,
      });

      expect(result.previousKey).toBe("old-key");
      expect(result.record).toEqual(updatedAvatar);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: existingAvatar.id });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it("should create new avatar metadata if none exists", async () => {
      const newAvatar = {
        id: "avatar-new",
        owner_id: "user-123",
        target_type: "user_avatar",
        target_id: "user-123",
        storage_key: "new-key",
        file_url: "new-url",
        mime_type: "image/png",
        media_type: "image",
        bytes: 15000,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockInsertBuilder = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([newAvatar]),
      };

      mockDb
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          first: jest.fn().mockResolvedValue(undefined),
        } as never)
        .mockReturnValueOnce(mockInsertBuilder as never);

      const result = await avatarRepository.saveUserAvatarMetadata("user-123", {
        storageKey: "new-key",
        fileUrl: "new-url",
        mimeType: "image/png",
        bytes: 15000,
      });

      expect(result.previousKey).toBeNull();
      expect(result.record).toEqual(newAvatar);
      expect(mockInsertBuilder.insert).toHaveBeenCalled();
      expect(mockInsertBuilder.returning).toHaveBeenCalledWith("*");
    });
  });

  describe("getUserAvatarMetadata", () => {
    it("should get user avatar metadata", async () => {
      const mockAvatar = {
        id: "avatar-1",
        owner_id: "user-123",
        target_type: "user_avatar",
        target_id: "user-123",
        storage_key: "avatars/user-123/avatar.png",
        file_url: "/media/avatars/user-123/avatar.png",
        mime_type: "image/png",
        media_type: "image",
        bytes: 12345,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: null,
      };

      mockQueryBuilder.first.mockResolvedValue(mockAvatar);

      const result = await avatarRepository.getUserAvatarMetadata("user-123");

      expect(result).toEqual(mockAvatar);
      expect(mockDb).toHaveBeenCalledWith("media");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        owner_id: "user-123",
        target_type: "user_avatar",
        target_id: "user-123",
      });
    });

    it("should return null if no avatar found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await avatarRepository.getUserAvatarMetadata("user-123");

      expect(result).toBeNull();
    });
  });

  describe("deleteUserAvatarMetadata", () => {
    it("should delete avatar metadata and return it", async () => {
      const mockAvatar = {
        id: "avatar-1",
        owner_id: "user-123",
        target_type: "user_avatar",
        target_id: "user-123",
        storage_key: "avatars/user-123/avatar.png",
        file_url: "/media/avatars/user-123/avatar.png",
        mime_type: "image/png",
        media_type: "image",
        bytes: 12345,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: null,
      };

      mockDb
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          first: jest.fn().mockResolvedValue(mockAvatar),
        } as never)
        .mockReturnValueOnce(mockQueryBuilder as never);

      const result = await avatarRepository.deleteUserAvatarMetadata("user-123");

      expect(result).toEqual(mockAvatar);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: mockAvatar.id });
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it("should return null if no avatar to delete", async () => {
      mockDb.mockReturnValueOnce({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(undefined),
      } as never);

      const result = await avatarRepository.deleteUserAvatarMetadata("user-123");

      expect(result).toBeNull();
      expect(mockQueryBuilder.del).not.toHaveBeenCalled();
    });
  });
});
