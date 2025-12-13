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
    joinRaw: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
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
  });
});
