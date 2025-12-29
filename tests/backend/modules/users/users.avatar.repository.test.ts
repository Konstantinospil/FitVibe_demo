import { db } from "../../../../apps/backend/src/db/connection.js";
import {
  deleteUserAvatarMetadata,
  getUserAvatarMetadata,
  saveUserAvatarMetadata,
} from "../../../../apps/backend/src/modules/users/users.avatar.repository.js";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Users Avatar Repository", () => {
  let mockQueryBuilder: {
    where: jest.Mock;
    first: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    returning: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
    };

    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  it("creates a new avatar record when none exists", async () => {
    const created = {
      id: "media-1",
      owner_id: "user-1",
      target_type: "user_avatar",
      target_id: "user-1",
      storage_key: "avatars/user-1.png",
      file_url: "https://cdn.example.com/user-1.png",
      mime_type: "image/png",
      media_type: "image",
      bytes: 1024,
      created_at: "2024-01-01T00:00:00Z",
    };

    mockQueryBuilder.first.mockResolvedValueOnce(null);
    mockQueryBuilder.returning.mockResolvedValueOnce([created]);

    const result = await saveUserAvatarMetadata("user-1", {
      storageKey: "avatars/user-1.png",
      fileUrl: "https://cdn.example.com/user-1.png",
      mimeType: "image/png",
      bytes: 1024,
    });

    expect(mockDb).toHaveBeenCalledWith("media");
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "user-1",
        target_type: "user_avatar",
        target_id: "user-1",
        storage_key: "avatars/user-1.png",
        file_url: "https://cdn.example.com/user-1.png",
        mime_type: "image/png",
        media_type: "image",
        bytes: 1024,
        created_at: expect.any(String),
      }),
    );
    expect(result).toEqual({ previousKey: null, record: created });
  });

  it("updates an existing avatar record and returns the previous key", async () => {
    const existing = {
      id: "media-2",
      owner_id: "user-2",
      target_type: "user_avatar",
      target_id: "user-2",
      storage_key: "avatars/old.png",
      file_url: "https://cdn.example.com/old.png",
      mime_type: "image/png",
      media_type: "image",
      bytes: 512,
      created_at: "2024-01-01T00:00:00Z",
    };
    const updated = {
      ...existing,
      storage_key: "avatars/new.png",
      file_url: "https://cdn.example.com/new.png",
      bytes: 2048,
    };

    mockQueryBuilder.first.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);

    const result = await saveUserAvatarMetadata("user-2", {
      storageKey: "avatars/new.png",
      fileUrl: "https://cdn.example.com/new.png",
      mimeType: "image/png",
      bytes: 2048,
    });

    expect(mockQueryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        storage_key: "avatars/new.png",
        file_url: "https://cdn.example.com/new.png",
        mime_type: "image/png",
        bytes: 2048,
      }),
    );
    expect(result).toEqual({ previousKey: "avatars/old.png", record: updated });
  });

  it("returns null when no avatar exists", async () => {
    mockQueryBuilder.first.mockResolvedValueOnce(null);

    const result = await getUserAvatarMetadata("user-3");

    expect(mockQueryBuilder.where).toHaveBeenCalledWith({
      owner_id: "user-3",
      target_type: "user_avatar",
      target_id: "user-3",
    });
    expect(result).toBeNull();
  });

  it("deletes and returns the avatar metadata", async () => {
    const existing = {
      id: "media-4",
      owner_id: "user-4",
      target_type: "user_avatar",
      target_id: "user-4",
      storage_key: "avatars/user-4.png",
      file_url: "https://cdn.example.com/user-4.png",
      mime_type: "image/png",
      media_type: "image",
      bytes: 1024,
      created_at: "2024-01-01T00:00:00Z",
    };

    mockQueryBuilder.first.mockResolvedValueOnce(existing);

    const result = await deleteUserAvatarMetadata("user-4");

    expect(mockQueryBuilder.del).toHaveBeenCalled();
    expect(result).toEqual(existing);
  });

  it("does nothing when deleting a missing avatar", async () => {
    mockQueryBuilder.first.mockResolvedValueOnce(null);

    const result = await deleteUserAvatarMetadata("user-5");

    expect(mockQueryBuilder.del).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
