import {
  saveUserAvatarMetadata,
  getUserAvatarMetadata,
  deleteUserAvatarMetadata,
} from "../../../../apps/backend/src/modules/users/users.avatar.repository.js";

// Mock db
const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder() {
  return {
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    returning: jest.fn().mockResolvedValue([]),
  };
}

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  });

  return {
    db: mockDbFunction,
  };
});

describe("Users Avatar Repository", () => {
  const userId = "user-123";
  const mockMetadata = {
    storageKey: "avatars/user-123/avatar.jpg",
    fileUrl: "https://example.com/avatars/user-123/avatar.jpg",
    mimeType: "image/jpeg",
    bytes: 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("saveUserAvatarMetadata", () => {
    it("should create new avatar metadata when none exists", async () => {
      const mockRecord = {
        id: "media-123",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: mockMetadata.storageKey,
        file_url: mockMetadata.fileUrl,
        mime_type: mockMetadata.mimeType,
        media_type: "image",
        bytes: mockMetadata.bytes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.first = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockQueryBuilder.insert = jest.fn().mockReturnThis();
      mockQueryBuilder.returning = jest.fn().mockResolvedValue([mockRecord]);
      queryBuilders["media"] = mockQueryBuilder;

      const result = await saveUserAvatarMetadata(userId, mockMetadata);

      expect(result.previousKey).toBeNull();
      expect(result.record).toEqual(mockRecord);
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should update existing avatar metadata", async () => {
      const existingRecord = {
        id: "media-123",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: "old-key",
        file_url: "old-url",
        mime_type: "image/png",
        media_type: "image",
        bytes: 512,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedRecord = {
        ...existingRecord,
        storage_key: mockMetadata.storageKey,
        file_url: mockMetadata.fileUrl,
        mime_type: mockMetadata.mimeType,
        bytes: mockMetadata.bytes,
        updated_at: new Date().toISOString(),
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.first = jest
        .fn()
        .mockResolvedValueOnce(existingRecord)
        .mockResolvedValueOnce(updatedRecord);
      mockQueryBuilder.update = jest.fn().mockResolvedValue(1);
      queryBuilders["media"] = mockQueryBuilder;

      const result = await saveUserAvatarMetadata(userId, mockMetadata);

      expect(result.previousKey).toBe("old-key");
      expect(result.record.storage_key).toBe(mockMetadata.storageKey);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("getUserAvatarMetadata", () => {
    it("should return avatar metadata when it exists", async () => {
      const mockRecord = {
        id: "media-123",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: mockMetadata.storageKey,
        file_url: mockMetadata.fileUrl,
        mime_type: mockMetadata.mimeType,
        media_type: "image",
        bytes: mockMetadata.bytes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.first = jest.fn().mockResolvedValue(mockRecord);
      queryBuilders["media"] = mockQueryBuilder;

      const result = await getUserAvatarMetadata(userId);

      expect(result).toEqual(mockRecord);
    });

    it("should return null when no avatar exists", async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.first = jest.fn().mockResolvedValue(null);
      queryBuilders["media"] = mockQueryBuilder;

      const result = await getUserAvatarMetadata(userId);

      expect(result).toBeNull();
    });
  });

  describe("deleteUserAvatarMetadata", () => {
    it("should delete avatar metadata when it exists", async () => {
      const existingRecord = {
        id: "media-123",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: mockMetadata.storageKey,
        file_url: mockMetadata.fileUrl,
        mime_type: mockMetadata.mimeType,
        media_type: "image",
        bytes: mockMetadata.bytes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.first = jest.fn().mockResolvedValue(existingRecord);
      mockQueryBuilder.del = jest.fn().mockResolvedValue(1);
      queryBuilders["media"] = mockQueryBuilder;

      const result = await deleteUserAvatarMetadata(userId);

      expect(result).toEqual(existingRecord);
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it("should return null when no avatar exists", async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.first = jest.fn().mockResolvedValue(null);
      queryBuilders["media"] = mockQueryBuilder;

      const result = await deleteUserAvatarMetadata(userId);

      expect(result).toBeNull();
      expect(mockQueryBuilder.del).not.toHaveBeenCalled();
    });
  });
});
