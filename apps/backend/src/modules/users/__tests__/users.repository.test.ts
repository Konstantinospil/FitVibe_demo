import { db } from "../../../db/connection.js";
import * as usersRepository from "../users.repository.js";

// Mock the database connection
jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

// Add fn and raw helpers to mock db
(mockDb as unknown as { fn: { now: jest.Mock }; raw: jest.Mock }).fn = {
  now: jest.fn().mockReturnValue("NOW()"),
};
(mockDb as unknown as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

describe("Users Repository", () => {
  let mockQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    whereIn: jest.Mock;
    whereNull: jest.Mock;
    whereRaw: jest.Mock;
    andWhere: jest.Mock;
    join: jest.Mock;
    joinRaw: jest.Mock;
    leftJoin: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    returning: jest.Mock;
    clone: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      joinRaw: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue([1]),
      update: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      returning: jest.fn().mockResolvedValue([]),
      clone: jest.fn().mockReturnThis(),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("findUserByEmail", () => {
    it("should find user by email", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        display_name: "Test User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: "hash123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await usersRepository.findUserByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockDb).toHaveBeenCalledWith("users");
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.joinRaw).toHaveBeenCalled();
      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(c.value) = ?", [
        "test@example.com",
      ]);
    });

    it("should normalize email to lowercase", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      await usersRepository.findUserByEmail("TEST@EXAMPLE.COM");

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(c.value) = ?", [
        "test@example.com",
      ]);
    });

    it("should return undefined if user not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await usersRepository.findUserByEmail("nonexistent@example.com");

      expect(result).toBeUndefined();
    });
  });

  describe("findUserById", () => {
    it("should find user by id", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        display_name: "Test User",
      };

      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await usersRepository.findUserById("user-123");

      expect(result).toEqual(mockUser);
      expect(mockDb).toHaveBeenCalledWith("users");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "user-123" });
    });

    it("should return undefined if user not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await usersRepository.findUserById("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("findUserByUsername", () => {
    it("should find user by username case-insensitively", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        display_name: "Test User",
      };

      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await usersRepository.findUserByUsername("TestUser");

      expect(result).toEqual(mockUser);
      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(username) = ?", ["testuser"]);
    });
  });

  describe("listUsers", () => {
    it("should list users with default pagination", async () => {
      const mockUsers = [
        { id: "user-1", username: "user1", display_name: "User One" },
        { id: "user-2", username: "user2", display_name: "User Two" },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockUsers>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockUsers);
          return Promise.resolve(mockUsers);
        }) as never;

      const result = await usersRepository.listUsers();

      expect(result).toEqual(mockUsers);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
    });

    it("should list users with custom pagination", async () => {
      const mockUsers: never[] = [];

      (mockQueryBuilder as unknown as Promise<typeof mockUsers>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockUsers);
          return Promise.resolve(mockUsers);
        }) as never;

      await usersRepository.listUsers(10, 20);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20);
    });
  });

  describe("changePassword", () => {
    it("should update password hash", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await usersRepository.changePassword("user-123", "newhash");

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("users");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "user-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile with all fields", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await usersRepository.updateUserProfile("user-123", {
        username: "newusername",
        displayName: "New Name",
        locale: "de-DE",
        preferredLang: "de",
      });

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "user-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it("should update partial fields", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await usersRepository.updateUserProfile("user-123", {
        username: "newusername",
      });

      expect(result).toBe(1);
    });

    it("should return 0 if no fields to update", async () => {
      const result = await usersRepository.updateUserProfile("user-123", {});

      expect(result).toBe(0);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });
  });

  describe("createUserRecord", () => {
    it("should create user record with all fields", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const result = await usersRepository.createUserRecord({
        id: "user-new",
        username: "newuser",
        displayName: "New User",
        locale: "en-US",
        preferredLang: "en",
        status: "pending_verification",
        roleCode: "athlete",
        passwordHash: "hash123",
      });

      expect(result).toEqual([1]);
      expect(mockDb).toHaveBeenCalledWith("users");
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should use default locale and lang if not provided", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersRepository.createUserRecord({
        id: "user-new",
        username: "newuser",
        displayName: "New User",
        status: "pending_verification",
        roleCode: "athlete",
        passwordHash: "hash123",
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: "en-US",
          preferred_lang: "en",
        }),
      );
    });
  });

  describe("setUserStatus", () => {
    it("should update user status", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await usersRepository.setUserStatus("user-123", "active");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "user-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("insertStateHistory", () => {
    it("should insert state history record", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const result = await usersRepository.insertStateHistory(
        "user-123",
        "status",
        "pending",
        "active",
      );

      expect(result).toEqual([1]);
      expect(mockDb).toHaveBeenCalledWith("user_state_history");
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should handle null old value", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersRepository.insertStateHistory("user-123", "status", null, "active");

      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("getUserContacts", () => {
    it("should get user contacts", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          user_id: "user-123",
          type: "email" as const,
          value: "test@example.com",
          is_primary: true,
          is_recovery: true,
          is_verified: true,
          verified_at: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockContacts>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockContacts);
          return Promise.resolve(mockContacts);
        }) as never;

      const result = await usersRepository.getUserContacts("user-123");

      expect(result).toEqual(mockContacts);
      expect(mockDb).toHaveBeenCalledWith("user_contacts");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("created_at", "asc");
    });
  });

  describe("getUserAvatar", () => {
    it("should get user avatar", async () => {
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

      const result = await usersRepository.getUserAvatar("user-123");

      expect(result).toEqual(mockAvatar);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        owner_id: "user-123",
        target_type: "user_avatar",
        target_id: "user-123",
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("created_at", "desc");
    });

    it("should return null if no avatar found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await usersRepository.getUserAvatar("user-123");

      expect(result).toBeNull();
    });
  });

  describe("getContactById", () => {
    it("should get contact by id", async () => {
      const mockContact = {
        id: "contact-123",
        user_id: "user-123",
        type: "email" as const,
        value: "test@example.com",
        is_primary: true,
        is_recovery: true,
        is_verified: true,
        verified_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockContact);

      const result = await usersRepository.getContactById("contact-123");

      expect(result).toEqual(mockContact);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "contact-123" });
    });
  });

  describe("fetchUserWithContacts", () => {
    it("should fetch user with contacts and avatar", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        display_name: "Test User",
      };

      const mockContacts = [
        {
          id: "contact-1",
          user_id: "user-123",
          type: "email" as const,
          value: "test@example.com",
          is_primary: true,
          is_recovery: true,
          is_verified: true,
          verified_at: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

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
          first: jest.fn().mockResolvedValue(mockUser),
        } as never)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          then: jest.fn().mockImplementation((resolve) => {
            resolve(mockContacts);
            return Promise.resolve(mockContacts);
          }),
        } as never)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          first: jest.fn().mockResolvedValue(mockAvatar),
        } as never);

      const result = await usersRepository.fetchUserWithContacts("user-123");

      expect(result).toEqual({
        user: mockUser,
        contacts: mockContacts,
        avatar: mockAvatar,
      });
    });

    it("should return null if user not found", async () => {
      mockDb.mockReturnValueOnce({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(undefined),
      } as never);

      const result = await usersRepository.fetchUserWithContacts("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("upsertContact", () => {
    it("should insert new email contact", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const result = await usersRepository.upsertContact("user-123", {
        type: "email",
        value: "new@example.com",
      });

      expect(result).toEqual([1]);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_primary: false });
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should update existing contact when value changes", async () => {
      const existingContact = {
        id: "contact-1",
        user_id: "user-123",
        type: "email" as const,
        value: "old@example.com",
        is_primary: true,
        is_recovery: true,
        is_verified: true,
        verified_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockDb
        .mockReturnValueOnce(mockQueryBuilder as never)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          first: jest.fn().mockResolvedValue(existingContact),
        } as never)
        .mockReturnValueOnce(mockQueryBuilder as never);

      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await usersRepository.upsertContact("user-123", {
        type: "email",
        value: "new@example.com",
      });

      expect(result).toBe(1);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it("should not change verified status if value unchanged", async () => {
      const existingContact = {
        id: "contact-1",
        user_id: "user-123",
        type: "email" as const,
        value: "same@example.com",
        is_primary: true,
        is_recovery: true,
        is_verified: true,
        verified_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockDb
        .mockReturnValueOnce(mockQueryBuilder as never)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          first: jest.fn().mockResolvedValue(existingContact),
        } as never)
        .mockReturnValueOnce(mockQueryBuilder as never);

      mockQueryBuilder.update.mockResolvedValue(1);

      await usersRepository.upsertContact("user-123", {
        type: "email",
        value: "same@example.com",
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_verified: true,
        }),
      );
    });
  });

  describe("markContactVerified", () => {
    it("should mark contact as verified", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await usersRepository.markContactVerified("contact-123");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "contact-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("deleteContact", () => {
    it("should delete contact", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await usersRepository.deleteContact("user-123", "contact-123");

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("user_contacts");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        id: "contact-123",
        user_id: "user-123",
      });
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });
  });
});
