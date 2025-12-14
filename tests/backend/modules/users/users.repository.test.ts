import { db } from "../../../../apps/backend/src/db/connection.js";
import * as usersRepository from "../../../../apps/backend/src/modules/users/users.repository.js";
import type {
  ContactUpsertDTO,
  UpdateProfileDTO,
} from "../../../../apps/backend/src/modules/users/users.types.js";

// Mock db
const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = null) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    where: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    joinRaw: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
  });
  return builder;
}

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  }) as jest.Mock & {
    transaction: jest.Mock;
    raw: jest.Mock;
  };

  mockDbFunction.transaction = jest.fn((callback) => callback(mockDbFunction));
  mockDbFunction.raw = jest.fn().mockReturnValue({});

  return {
    db: mockDbFunction,
  };
});

describe("Users Repository", () => {
  const userId = "user-123";
  const email = "test@example.com";

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("findUserByEmail", () => {
    it("should find user by email", async () => {
      const mockUser: usersRepository.UserRow = {
        id: userId,
        username: "testuser",
        display_name: "Test User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: "hashed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
      }

      const result = await usersRepository.findUserByEmail(email);

      expect(result).toEqual(mockUser);
    });
  });

  describe("findUserById", () => {
    it("should find user by id", async () => {
      const mockUser: usersRepository.UserRow = {
        id: userId,
        username: "testuser",
        display_name: "Test User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: "hashed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
      }

      const result = await usersRepository.findUserById(userId);

      expect(result).toEqual(mockUser);
      expect(queryBuilders["users"]?.where).toHaveBeenCalledWith({ id: userId });
    });
  });

  describe("findUserByUsername", () => {
    it("should find user by username", async () => {
      const mockUser: usersRepository.UserRow = {
        id: userId,
        username: "testuser",
        display_name: "Test User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: "hashed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
      }

      const result = await usersRepository.findUserByUsername("testuser");

      expect(result).toEqual(mockUser);
    });
  });

  describe("listUsers", () => {
    it("should list users", async () => {
      const mockUsers: usersRepository.UserRow[] = [];

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].offset = jest.fn().mockResolvedValue(mockUsers);
      }

      const result = await usersRepository.listUsers();

      expect(result).toEqual(mockUsers);
    });

    it("should list users with limit and offset", async () => {
      const mockUsers: usersRepository.UserRow[] = [];

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].offset = jest.fn().mockResolvedValue(mockUsers);
      }

      const result = await usersRepository.listUsers(10, 20);

      expect(result).toEqual(mockUsers);
    });
  });

  describe("changePassword", () => {
    it("should update user password", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.changePassword(userId, "new-hash");

      expect(result).toBe(1);
      expect(queryBuilders["users"]?.update).toHaveBeenCalled();
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile with all fields", async () => {
      const updates: UpdateProfileDTO = {
        username: "newusername",
        displayName: "New Display Name",
        locale: "de-DE",
        preferredLang: "de",
        defaultVisibility: "private",
        units: { weight: "kg", distance: "km" },
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.updateUserProfile(userId, updates);

      expect(result).toBe(1);
      expect(queryBuilders["users"]?.update).toHaveBeenCalled();
    });

    it("should return 0 when no updates provided", async () => {
      const updates: UpdateProfileDTO = {};

      const result = await usersRepository.updateUserProfile(userId, updates);

      expect(result).toBe(0);
    });

    it("should work with transaction", async () => {
      const updates: UpdateProfileDTO = { username: "newuser" };
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.updateUserProfile(userId, updates, mockTrx);

      expect(result).toBe(1);
    });
  });

  describe("createUserRecord", () => {
    it("should create user record", async () => {
      const input: usersRepository.CreateUserRecordInput = {
        id: userId,
        username: "testuser",
        displayName: "Test User",
        status: "active",
        roleCode: "athlete",
        passwordHash: "hashed",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].insert.mockResolvedValue(1);
      }

      const result = await usersRepository.createUserRecord(input);

      expect(result).toBe(1);
      expect(queryBuilders["users"]?.insert).toHaveBeenCalled();
    });

    it("should use default locale and preferredLang", async () => {
      const input: usersRepository.CreateUserRecordInput = {
        id: userId,
        username: "testuser",
        displayName: "Test User",
        status: "active",
        roleCode: "athlete",
        passwordHash: "hashed",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].insert.mockResolvedValue(1);
      }

      await usersRepository.createUserRecord(input);

      expect(queryBuilders["users"]?.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: "en-US",
          preferred_lang: "en",
        }),
      );
    });

    it("should work with transaction", async () => {
      const input: usersRepository.CreateUserRecordInput = {
        id: userId,
        username: "testuser",
        displayName: "Test User",
        status: "active",
        roleCode: "athlete",
        passwordHash: "hashed",
      };
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].insert.mockResolvedValue(1);
      }

      const result = await usersRepository.createUserRecord(input, mockTrx);

      expect(result).toBe(1);
    });
  });

  describe("setUserStatus", () => {
    it("should update user status", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.setUserStatus(userId, "suspended");

      expect(result).toBe(1);
      expect(queryBuilders["users"]?.update).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.setUserStatus(userId, "active", mockTrx);

      expect(result).toBe(1);
    });
  });

  describe("insertStateHistory", () => {
    it("should insert state history", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_state_history");
      if (queryBuilders["user_state_history"]) {
        queryBuilders["user_state_history"].insert.mockResolvedValue(1);
      }

      const result = await usersRepository.insertStateHistory(
        userId,
        "status",
        "active",
        "suspended",
      );

      expect(result).toBe(1);
      expect(queryBuilders["user_state_history"]?.insert).toHaveBeenCalled();
    });

    it("should handle null values", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_state_history");
      if (queryBuilders["user_state_history"]) {
        queryBuilders["user_state_history"].insert.mockResolvedValue(1);
      }

      await usersRepository.insertStateHistory(userId, "status", null, "active");

      expect(queryBuilders["user_state_history"]?.insert).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("user_state_history");
      if (queryBuilders["user_state_history"]) {
        queryBuilders["user_state_history"].insert.mockResolvedValue(1);
      }

      const result = await usersRepository.insertStateHistory(
        userId,
        "status",
        "active",
        "suspended",
        mockTrx,
      );

      expect(result).toBe(1);
    });
  });

  describe("getUserContacts", () => {
    it("should get user contacts", async () => {
      const mockContacts: usersRepository.ContactRow[] = [
        {
          id: "contact-1",
          user_id: userId,
          type: "email",
          value: "test@example.com",
          is_primary: true,
          is_recovery: false,
          is_verified: true,
          verified_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy = jest.fn().mockResolvedValue(mockContacts);
      }

      const result = await usersRepository.getUserContacts(userId);

      expect(result).toEqual(mockContacts);
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;
      const mockContacts: usersRepository.ContactRow[] = [];

      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy = jest.fn().mockResolvedValue(mockContacts);
      }

      const result = await usersRepository.getUserContacts(userId, mockTrx);

      expect(result).toEqual(mockContacts);
    });
  });

  describe("getUserAvatar", () => {
    it("should get user avatar when it exists", async () => {
      const mockAvatar: usersRepository.AvatarRow = {
        id: "avatar-1",
        owner_id: userId,
        target_type: "user_avatar",
        target_id: userId,
        storage_key: "key",
        file_url: "url",
        mime_type: "image/jpeg",
        media_type: "image",
        bytes: 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("media");
      if (queryBuilders["media"]) {
        // orderBy returns this, then first resolves to the value
        queryBuilders["media"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["media"].first = jest.fn().mockResolvedValue(mockAvatar);
      }

      const result = await usersRepository.getUserAvatar(userId);

      expect(result).toEqual(mockAvatar);
    });

    it("should return null when no avatar exists", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("media");
      if (queryBuilders["media"]) {
        queryBuilders["media"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["media"].first = jest.fn().mockResolvedValue(null);
      }

      const result = await usersRepository.getUserAvatar(userId);

      expect(result).toBeNull();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("media");
      if (queryBuilders["media"]) {
        queryBuilders["media"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["media"].first = jest.fn().mockResolvedValue(null);
      }

      const result = await usersRepository.getUserAvatar(userId, mockTrx);

      expect(result).toBeNull();
    });
  });

  describe("getContactById", () => {
    it("should get contact by id", async () => {
      const contactId = "contact-1";
      const mockContact: usersRepository.ContactRow = {
        id: contactId,
        user_id: userId,
        type: "email",
        value: "test@example.com",
        is_primary: true,
        is_recovery: false,
        is_verified: true,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].first.mockResolvedValue(mockContact);
      }

      const result = await usersRepository.getContactById(contactId);

      expect(result).toEqual(mockContact);
    });

    it("should return undefined when contact not found", async () => {
      const contactId = "contact-1";

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].first.mockResolvedValue(undefined);
      }

      const result = await usersRepository.getContactById(contactId);

      expect(result).toBeUndefined();
    });

    it("should work with transaction", async () => {
      const contactId = "contact-1";
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].first.mockResolvedValue(undefined);
      }

      const result = await usersRepository.getContactById(contactId, mockTrx);

      expect(result).toBeUndefined();
    });
  });

  describe("fetchUserWithContacts", () => {
    it("should fetch user with contacts and avatar", async () => {
      const mockUser: usersRepository.UserRow = {
        id: userId,
        username: "testuser",
        display_name: "Test User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: "hashed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const mockContacts: usersRepository.ContactRow[] = [];
      const mockAvatar: usersRepository.AvatarRow | null = null;

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
      }
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy.mockResolvedValue(mockContacts);
      }
      dbFn("media");
      if (queryBuilders["media"]) {
        queryBuilders["media"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["media"].first = jest.fn().mockResolvedValue(mockAvatar);
      }

      const result = await usersRepository.fetchUserWithContacts(userId);

      expect(result).toEqual({
        user: mockUser,
        contacts: mockContacts,
        avatar: mockAvatar,
      });
    });

    it("should return null when user not found", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(undefined);
      }

      const result = await usersRepository.fetchUserWithContacts(userId);

      expect(result).toBeNull();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;
      const mockUser: usersRepository.UserRow = {
        id: userId,
        username: "testuser",
        display_name: "Test User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: "hashed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
      }
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy = jest.fn().mockResolvedValue([]);
      }
      dbFn("media");
      if (queryBuilders["media"]) {
        queryBuilders["media"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["media"].first = jest.fn().mockResolvedValue(null);
      }

      const result = await usersRepository.fetchUserWithContacts(userId, mockTrx);

      expect(result).toBeDefined();
    });
  });

  describe("upsertContact", () => {
    it("should create new contact when none exists", async () => {
      const dto: ContactUpsertDTO = {
        type: "email",
        value: "test@example.com",
        isPrimary: true,
        isRecovery: false,
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["user_contacts"].first.mockResolvedValue(undefined);
        queryBuilders["user_contacts"].insert.mockResolvedValue(1);
        queryBuilders["user_contacts"].update.mockResolvedValue(0);
      }

      const result = await usersRepository.upsertContact(userId, dto);

      expect(result).toBe(1);
      expect(queryBuilders["user_contacts"]?.insert).toHaveBeenCalled();
    });

    it("should update existing contact", async () => {
      const dto: ContactUpsertDTO = {
        type: "email",
        value: "newemail@example.com",
        isPrimary: true,
      };

      const existingContact: usersRepository.ContactRow = {
        id: "contact-1",
        user_id: userId,
        type: "email",
        value: "old@example.com",
        is_primary: false,
        is_recovery: false,
        is_verified: true,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["user_contacts"].first.mockResolvedValue(existingContact);
        queryBuilders["user_contacts"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.upsertContact(userId, dto);

      expect(result).toBe(1);
      expect(queryBuilders["user_contacts"]?.update).toHaveBeenCalled();
    });

    it("should normalize email addresses", async () => {
      const dto: ContactUpsertDTO = {
        type: "email",
        value: "  TEST@EXAMPLE.COM  ",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["user_contacts"].first.mockResolvedValue(undefined);
        queryBuilders["user_contacts"].insert.mockResolvedValue(1);
        queryBuilders["user_contacts"].update.mockResolvedValue(0);
      }

      await usersRepository.upsertContact(userId, dto);

      expect(queryBuilders["user_contacts"]?.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          value: "test@example.com",
        }),
      );
    });

    it("should work with transaction", async () => {
      const dto: ContactUpsertDTO = {
        type: "phone",
        value: "+1234567890",
      };
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["user_contacts"].first.mockResolvedValue(undefined);
        queryBuilders["user_contacts"].insert.mockResolvedValue(1);
        queryBuilders["user_contacts"].update.mockResolvedValue(0);
      }

      const result = await usersRepository.upsertContact(userId, dto, mockTrx);

      expect(result).toBe(1);
    });
  });

  describe("markContactVerified", () => {
    it("should mark contact as verified", async () => {
      const contactId = "contact-1";

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.markContactVerified(contactId);

      expect(result).toBe(1);
      expect(queryBuilders["user_contacts"]?.update).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const contactId = "contact-1";
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.markContactVerified(contactId, mockTrx);

      expect(result).toBe(1);
    });
  });

  describe("deleteContact", () => {
    it("should delete contact", async () => {
      const contactId = "contact-1";

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].del.mockResolvedValue(1);
      }

      const result = await usersRepository.deleteContact(userId, contactId);

      expect(result).toBe(1);
      expect(queryBuilders["user_contacts"]?.del).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const contactId = "contact-1";
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("user_contacts");
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].del.mockResolvedValue(1);
      }

      const result = await usersRepository.deleteContact(userId, contactId, mockTrx);

      expect(result).toBe(1);
    });
  });

  describe("getUserMetrics", () => {
    it("should get user metrics", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;

      // Mock followers count
      dbFn("followers");
      if (queryBuilders["followers"]) {
        queryBuilders["followers"].count = jest.fn().mockReturnThis();
        queryBuilders["followers"].first.mockResolvedValueOnce({ count: 10 });
        queryBuilders["followers"].first.mockResolvedValueOnce({ count: 5 });
      }

      // Mock sessions count
      dbFn("sessions");
      if (queryBuilders["sessions"]) {
        queryBuilders["sessions"].count = jest.fn().mockReturnThis();
        queryBuilders["sessions"].first.mockResolvedValue({ count: 20 });
        // For getUserMetrics streak calculation
        queryBuilders["sessions"].whereNotNull = jest.fn().mockReturnThis();
        queryBuilders["sessions"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["sessions"].select = jest.fn().mockReturnThis();
        queryBuilders["sessions"].limit = jest.fn().mockResolvedValue([]);
      }

      // Mock points sum
      dbFn("user_points");
      if (queryBuilders["user_points"]) {
        queryBuilders["user_points"].sum = jest.fn().mockReturnThis();
        queryBuilders["user_points"].first.mockResolvedValue({ sum: 1000 });
      }

      // Mock streak
      dbFn("user_streaks");
      if (queryBuilders["user_streaks"]) {
        queryBuilders["user_streaks"].max = jest.fn().mockReturnThis();
        queryBuilders["user_streaks"].first.mockResolvedValue({ max: 5 });
      }

      const result = await usersRepository.getUserMetrics(userId);

      expect(result).toHaveProperty("follower_count");
      expect(result).toHaveProperty("following_count");
      expect(result).toHaveProperty("sessions_completed");
      expect(result).toHaveProperty("total_points");
      expect(result).toHaveProperty("current_streak_days");
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("followers");
      if (queryBuilders["followers"]) {
        queryBuilders["followers"].count = jest.fn().mockReturnThis();
        queryBuilders["followers"].first.mockResolvedValueOnce({ count: 0 });
        queryBuilders["followers"].first.mockResolvedValueOnce({ count: 0 });
      }

      dbFn("sessions");
      if (queryBuilders["sessions"]) {
        queryBuilders["sessions"].count = jest.fn().mockReturnThis();
        queryBuilders["sessions"].first.mockResolvedValue({ count: 0 });
        // For getUserMetrics streak calculation
        queryBuilders["sessions"].whereNotNull = jest.fn().mockReturnThis();
        queryBuilders["sessions"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["sessions"].select = jest.fn().mockReturnThis();
        queryBuilders["sessions"].limit = jest.fn().mockResolvedValue([]);
      }

      dbFn("user_points");
      if (queryBuilders["user_points"]) {
        queryBuilders["user_points"].sum = jest.fn().mockReturnThis();
        queryBuilders["user_points"].first.mockResolvedValue({ sum: 0 });
      }

      dbFn("user_streaks");
      if (queryBuilders["user_streaks"]) {
        queryBuilders["user_streaks"].max = jest.fn().mockReturnThis();
        queryBuilders["user_streaks"].first.mockResolvedValue({ max: 0 });
      }

      const result = await usersRepository.getUserMetrics(userId, mockTrx);

      expect(result).toBeDefined();
    });
  });

  describe("getProfileByUserId", () => {
    it("should get profile by user id", async () => {
      const mockProfile: usersRepository.ProfileRow = {
        user_id: userId,
        alias: "testuser",
        bio: "Test bio",
        avatar_asset_id: null,
        date_of_birth: null,
        gender_code: null,
        visibility: "private",
        timezone: "UTC",
        unit_preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(mockProfile);
      }

      const result = await usersRepository.getProfileByUserId(userId);

      expect(result).toEqual(mockProfile);
    });

    it("should return null when profile not found", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(null);
      }

      const result = await usersRepository.getProfileByUserId(userId);

      expect(result).toBeNull();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(null);
      }

      const result = await usersRepository.getProfileByUserId(userId, mockTrx);

      expect(result).toBeNull();
    });
  });

  describe("checkAliasAvailable", () => {
    it("should return true when alias is available", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(null);
      }

      const result = await usersRepository.checkAliasAvailable("newalias");

      expect(result).toBe(true);
    });

    it("should return false when alias is taken", async () => {
      const mockProfile: usersRepository.ProfileRow = {
        user_id: "other-user",
        alias: "taken",
        bio: null,
        avatar_asset_id: null,
        date_of_birth: null,
        gender_code: null,
        visibility: "private",
        timezone: null,
        unit_preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(mockProfile);
      }

      const result = await usersRepository.checkAliasAvailable("taken");

      expect(result).toBe(false);
    });

    it("should exclude user id when provided", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(null);
      }

      const result = await usersRepository.checkAliasAvailable("alias", userId);

      expect(result).toBe(true);
      expect(queryBuilders["profiles"]?.where).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(null);
      }

      const result = await usersRepository.checkAliasAvailable("alias", undefined, mockTrx);

      expect(result).toBe(true);
    });
  });

  describe("updateProfileAlias", () => {
    it("should update existing profile alias", async () => {
      const mockProfile: usersRepository.ProfileRow = {
        user_id: userId,
        alias: "oldalias",
        bio: null,
        avatar_asset_id: null,
        date_of_birth: null,
        gender_code: null,
        visibility: "private",
        timezone: null,
        unit_preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(mockProfile);
        queryBuilders["profiles"].update.mockResolvedValue(1);
      }

      const result = await usersRepository.updateProfileAlias(userId, "newalias");

      expect(result).toBe(1);
      expect(queryBuilders["profiles"]?.update).toHaveBeenCalled();
    });

    it("should create profile if it doesn't exist", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(null);
        queryBuilders["profiles"].insert.mockResolvedValue(1);
      }

      const result = await usersRepository.updateProfileAlias(userId, "newalias");

      expect(result).toBe(1);
      expect(queryBuilders["profiles"]?.insert).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("profiles");
      if (queryBuilders["profiles"]) {
        queryBuilders["profiles"].first.mockResolvedValue(null);
        queryBuilders["profiles"].insert.mockResolvedValue(1);
      }

      const result = await usersRepository.updateProfileAlias(userId, "newalias", mockTrx);

      expect(result).toBe(1);
    });
  });

  describe("insertUserMetric", () => {
    it("should insert user metric", async () => {
      const metric = {
        weight: 75,
        unit: "kg",
        fitness_level_code: "intermediate",
        training_frequency: "3-4",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_metrics");
      if (queryBuilders["user_metrics"]) {
        queryBuilders["user_metrics"].insert = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].returning = jest.fn().mockResolvedValue([{ id: "metric-1" }]);
      }

      const result = await usersRepository.insertUserMetric(userId, metric);

      expect(result).toBe("metric-1");
      expect(queryBuilders["user_metrics"]?.insert).toHaveBeenCalled();
    });

    it("should use default values for optional fields", async () => {
      const metric = { weight: 75 };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_metrics");
      if (queryBuilders["user_metrics"]) {
        queryBuilders["user_metrics"].insert = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].returning = jest.fn().mockResolvedValue([{ id: "metric-1" }]);
      }

      await usersRepository.insertUserMetric(userId, metric);

      expect(queryBuilders["user_metrics"]?.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: "kg",
          fitness_level_code: null,
          training_frequency: null,
        }),
      );
    });

    it("should work with transaction", async () => {
      const metric = { weight: 75 };
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("user_metrics");
      if (queryBuilders["user_metrics"]) {
        queryBuilders["user_metrics"].insert = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].returning = jest.fn().mockResolvedValue([{ id: "metric-1" }]);
      }

      const result = await usersRepository.insertUserMetric(userId, metric, mockTrx);

      expect(result).toBe("metric-1");
    });
  });

  describe("getLatestUserMetrics", () => {
    it("should get latest user metrics", async () => {
      const mockMetric: usersRepository.UserMetricRow = {
        id: "metric-1",
        user_id: userId,
        weight: 75,
        unit: "kg",
        fitness_level_code: "intermediate",
        training_frequency: "3-4",
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_metrics");
      if (queryBuilders["user_metrics"]) {
        queryBuilders["user_metrics"].select = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].first = jest.fn().mockResolvedValue(mockMetric);
      }

      const result = await usersRepository.getLatestUserMetrics(userId);

      expect(result).toEqual({
        weight: 75,
        unit: "kg",
        fitness_level_code: "intermediate",
        training_frequency: "3-4",
      });
    });

    it("should return null when no metrics exist", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("user_metrics");
      if (queryBuilders["user_metrics"]) {
        queryBuilders["user_metrics"].select = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].first = jest.fn().mockResolvedValue(null);
      }

      const result = await usersRepository.getLatestUserMetrics(userId);

      expect(result).toBeNull();
    });

    it("should work with transaction", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      const mockTrx = dbFn as any;

      dbFn("user_metrics");
      if (queryBuilders["user_metrics"]) {
        queryBuilders["user_metrics"].select = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].orderBy = jest.fn().mockReturnThis();
        queryBuilders["user_metrics"].first = jest.fn().mockResolvedValue(null);
      }

      const result = await usersRepository.getLatestUserMetrics(userId, mockTrx);

      expect(result).toBeNull();
    });
  });
});
