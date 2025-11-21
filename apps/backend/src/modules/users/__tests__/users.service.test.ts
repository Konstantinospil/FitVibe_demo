import bcrypt from "bcryptjs";
import { db } from "../../../db/connection.js";
import * as usersService from "../users.service.js";
import * as usersRepository from "../users.repository.js";
import * as authRepository from "../../auth/auth.repository.js";
import * as dsrService from "../dsr.service.js";
import * as auditUtil from "../../common/audit.util.js";
import { HttpError } from "../../../utils/http.js";
import type {
  CreateUserDTO,
  UpdateProfileDTO,
  ChangePasswordDTO,
  UserStatus,
} from "../users.types.js";
import type { UserRow, ContactRow, AvatarRow } from "../users.repository.js";

// Mock dependencies
jest.mock("../users.repository.js");
jest.mock("../../auth/auth.repository.js");
jest.mock("../dsr.service.js");
jest.mock("../../common/audit.util.js");
jest.mock("bcryptjs");

const mockUsersRepo = jest.mocked(usersRepository);
const mockAuthRepo = jest.mocked(authRepository);
const mockDsrService = jest.mocked(dsrService);
const mockAuditUtil = jest.mocked(auditUtil);
const mockBcrypt = jest.mocked(bcrypt);

// Mock db - needs to be both a function and have methods like transaction
jest.mock("../../../db/connection.js", () => {
  const mockQueryBuilder = {
    whereRaw: jest.fn().mockReturnThis(),
    whereNot: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue(1),
    insert: jest.fn().mockResolvedValue([]),
  };

  const mockDbFunction = jest.fn(() => mockQueryBuilder);
  mockDbFunction.transaction = jest.fn((cb: (trx: unknown) => Promise<void>) => cb({}));

  return { db: mockDbFunction };
});

const mockDb = jest.mocked(db);

describe("Users Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    const validUserDto: CreateUserDTO = {
      username: "testuser",
      displayName: "Test User",
      email: "test@example.com",
      password: "SecureP@ssw0rd123",
      role: "athlete",
    };

    it("should create a new user with valid data", async () => {
      const hashedPassword = "hashed_password";
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      mockUsersRepo.createUserRecord.mockResolvedValue(undefined as never);
      mockUsersRepo.upsertContact.mockResolvedValue(undefined as never);
      mockUsersRepo.insertStateHistory.mockResolvedValue(undefined as never);
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: expect.any(String),
          username: "testuser",
          display_name: "Test User",
          locale: "en",
          preferred_lang: "en",
          role_code: "athlete",
          status: "pending_verification",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserRow,
        contacts: [
          {
            id: "contact-1",
            type: "email",
            value: "test@example.com",
            is_primary: true,
            is_recovery: true,
            is_verified: false,
            verified_at: null,
            created_at: new Date().toISOString(),
          } as ContactRow,
        ],
        avatar: null,
      });

      const result = await usersService.createUser(null, validUserDto);

      expect(result.username).toBe("testuser");
      expect(result.primaryEmail).toBe("test@example.com");
      expect(mockBcrypt.hash).toHaveBeenCalledWith("SecureP@ssw0rd123", 12);
      expect(mockUsersRepo.createUserRecord).toHaveBeenCalled();
    });

    it("should validate username format", async () => {
      const invalidUserDto = {
        ...validUserDto,
        username: "ab", // too short
      };

      await expect(usersService.createUser(null, invalidUserDto)).rejects.toThrow(HttpError);
      await expect(usersService.createUser(null, invalidUserDto)).rejects.toThrow(
        "USER_USERNAME_INVALID",
      );
    });

    it("should reject invalid username characters", async () => {
      const invalidUserDto = {
        ...validUserDto,
        username: "user@name!", // invalid characters
      };

      await expect(usersService.createUser(null, invalidUserDto)).rejects.toThrow(HttpError);
    });

    it("should handle username conflicts", async () => {
      mockBcrypt.hash.mockResolvedValue("hashed" as never);

      (db as jest.Mock).mockImplementation(() => ({
        transaction: jest.fn((cb: (trx: unknown) => Promise<void>) => cb({})),
      }));

      mockDb.mockReturnValue({
        whereRaw: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockUsersRepo.createUserRecord.mockRejectedValue({ code: "23505" });

      await expect(usersService.createUser(null, validUserDto)).rejects.toThrow(HttpError);
      await expect(usersService.createUser(null, validUserDto)).rejects.toThrow(
        "USER_USERNAME_TAKEN",
      );
    });

    it("should use custom status when provided", async () => {
      const hashedPassword = "hashed_password";
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      (db as jest.Mock).mockImplementation(() => ({
        transaction: jest.fn((cb: (trx: unknown) => Promise<void>) => cb({})),
      }));

      mockDb.mockReturnValue({
        whereRaw: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockUsersRepo.createUserRecord.mockResolvedValue(undefined as never);
      mockUsersRepo.upsertContact.mockResolvedValue(undefined as never);
      mockUsersRepo.insertStateHistory.mockResolvedValue(undefined as never);
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: "user-123",
          username: "testuser",
          display_name: "Test User",
          status: "pending_verification",
        } as UserRow,
        contacts: [],
        avatar: null,
      });

      const dtoWithStatus = {
        ...validUserDto,
        status: "pending_verification" as UserStatus,
      };

      await usersService.createUser(null, dtoWithStatus);

      expect(mockUsersRepo.createUserRecord).toHaveBeenCalled();
    });

    it("should reject invalid initial status", async () => {
      const invalidDto = {
        ...validUserDto,
        status: "pending_deletion" as UserStatus,
      };

      await expect(usersService.createUser(null, invalidDto)).rejects.toThrow(HttpError);
    });
  });

  describe("getMe", () => {
    const userId = "user-123";

    it("should return user detail with contacts and avatar", async () => {
      const mockUserData = {
        user: {
          id: userId,
          username: "testuser",
          display_name: "Test User",
          locale: "en",
          preferred_lang: "en",
          role_code: "athlete",
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        } as UserRow,
        contacts: [
          {
            id: "contact-1",
            type: "email",
            value: "test@example.com",
            is_primary: true,
            is_recovery: false,
            is_verified: true,
            verified_at: "2024-01-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
          } as ContactRow,
        ],
        avatar: {
          file_url: "https://example.com/avatar.jpg",
          mime_type: "image/jpeg",
          bytes: 1024,
          created_at: "2024-01-01T00:00:00Z",
        } as AvatarRow,
      };

      mockUsersRepo.fetchUserWithContacts.mockResolvedValue(mockUserData);

      const result = await usersService.getMe(userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(userId);
      expect(result?.username).toBe("testuser");
      expect(result?.primaryEmail).toBe("test@example.com");
      expect(result?.avatar).toEqual({
        url: "https://example.com/avatar.jpg",
        mimeType: "image/jpeg",
        bytes: 1024,
        updatedAt: "2024-01-01T00:00:00Z",
      });
      expect(result?.contacts).toHaveLength(1);
    });

    it("should return null when user not found", async () => {
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue(null);

      const result = await usersService.getMe(userId);

      expect(result).toBeNull();
    });

    it("should handle user without avatar", async () => {
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: userId,
          username: "testuser",
          display_name: "Test User",
        } as UserRow,
        contacts: [],
        avatar: null,
      });

      const result = await usersService.getMe(userId);

      expect(result?.avatar).toBeNull();
    });
  });

  describe("listAll", () => {
    it("should return list of users", async () => {
      const mockUsers = [
        {
          id: "user-1",
          username: "user1",
          display_name: "User One",
          locale: "en",
          preferred_lang: "en",
          role_code: "athlete",
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        } as UserRow,
      ];

      mockUsersRepo.listUsers.mockResolvedValue(mockUsers);

      const result = await usersService.listAll(10, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("user-1");
      expect(mockUsersRepo.listUsers).toHaveBeenCalledWith(10, 0);
    });

    it("should use default limit and offset", async () => {
      mockUsersRepo.listUsers.mockResolvedValue([]);

      await usersService.listAll();

      expect(mockUsersRepo.listUsers).toHaveBeenCalledWith(50, 0);
    });
  });

  describe("updateProfile", () => {
    const userId = "user-123";

    it("should update username with valid format", async () => {
      const dto: UpdateProfileDTO = {
        username: "newusername",
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        username: "oldusername",
        display_name: "Test User",
      } as UserRow);

      mockDb.mockReturnValue({
        whereRaw: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockUsersRepo.updateUserProfile.mockResolvedValue();
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: userId,
          username: "newusername",
          display_name: "Test User",
        } as UserRow,
        contacts: [],
        avatar: null,
      });

      const result = await usersService.updateProfile(userId, dto);

      expect(result.username).toBe("newusername");
      expect(mockUsersRepo.updateUserProfile).toHaveBeenCalledWith(userId, dto, {});
    });

    it("should reject invalid username format", async () => {
      const dto: UpdateProfileDTO = {
        username: "ab", // too short
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        username: "testuser",
        display_name: "Test User",
      } as UserRow);

      await expect(usersService.updateProfile(userId, dto)).rejects.toThrow(
        "USER_USERNAME_INVALID",
      );
    });

    it("should reject taken username", async () => {
      const dto: UpdateProfileDTO = {
        username: "takenusername",
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        username: "testuser",
        display_name: "Test User",
      } as UserRow);

      mockDb.mockReturnValue({
        whereRaw: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: "other-user" }),
      } as never);

      await expect(usersService.updateProfile(userId, dto)).rejects.toThrow("USER_USERNAME_TAKEN");
    });

    it("should update display name", async () => {
      const dto: UpdateProfileDTO = {
        displayName: "New Display Name",
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        username: "testuser",
        display_name: "Old Name",
      } as UserRow);

      mockUsersRepo.updateUserProfile.mockResolvedValue();
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: userId,
          username: "testuser",
          display_name: "New Display Name",
        } as UserRow,
        contacts: [],
        avatar: null,
      });

      const result = await usersService.updateProfile(userId, dto);

      expect(result.displayName).toBe("New Display Name");
    });

    it("should update locale and preferred language", async () => {
      const dto: UpdateProfileDTO = {
        locale: "de",
        preferredLang: "de",
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        username: "testuser",
        display_name: "Test User",
        locale: "en",
        preferred_lang: "en",
      } as UserRow);

      mockUsersRepo.updateUserProfile.mockResolvedValue();
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: userId,
          username: "testuser",
          display_name: "Test User",
          locale: "de",
          preferred_lang: "de",
        } as UserRow,
        contacts: [],
        avatar: null,
      });

      const result = await usersService.updateProfile(userId, dto);

      expect(result.locale).toBe("de");
      expect(result.preferredLang).toBe("de");
    });
  });

  describe("updatePassword", () => {
    const userId = "user-123";

    it("should update password with valid current password", async () => {
      const dto: ChangePasswordDTO = {
        currentPassword: "OldP@ssw0rd123",
        newPassword: "NewP@ssw0rd456",
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        password_hash: "old_hash",
        username: "testuser",
        primary_email: "test@example.com",
      } as never);

      mockUsersRepo.getUserContacts.mockResolvedValue([
        { type: "email", value: "test@example.com", is_primary: true } as ContactRow,
      ]);

      (db as jest.Mock).mockImplementation(() => ({
        transaction: jest.fn((cb: (trx: unknown) => Promise<void>) => cb({})),
      }));

      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue("new_hash" as never);
      mockUsersRepo.changePassword.mockResolvedValue();

      await usersService.updatePassword(userId, dto);

      expect(mockBcrypt.compare).toHaveBeenCalledWith("OldP@ssw0rd123", "old_hash");
      expect(mockBcrypt.hash).toHaveBeenCalledWith("NewP@ssw0rd456", 12);
      expect(mockUsersRepo.changePassword).toHaveBeenCalled();
      expect(mockAuditUtil.insertAudit).toHaveBeenCalled();
    });

    it("should reject incorrect current password", async () => {
      const dto: ChangePasswordDTO = {
        currentPassword: "WrongPassword",
        newPassword: "NewP@ssw0rd456",
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        password_hash: "old_hash",
        username: "testuser",
        primary_email: "test@example.com",
      } as never);

      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(usersService.updatePassword(userId, dto)).rejects.toThrow(
        "USER_INVALID_PASSWORD",
      );
    });

    it("should throw error if user not found", async () => {
      const dto: ChangePasswordDTO = {
        currentPassword: "OldP@ssw0rd123",
        newPassword: "NewP@ssw0rd456",
      };

      mockUsersRepo.findUserById.mockResolvedValue(null);

      await expect(usersService.updatePassword(userId, dto)).rejects.toThrow();
    });

    it("should revoke all refresh tokens after password change", async () => {
      const dto: ChangePasswordDTO = {
        currentPassword: "OldP@ssw0rd123",
        newPassword: "NewP@ssw0rd456",
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        password_hash: "old_hash",
        username: "testuser",
        primary_email: "test@example.com",
      } as never);

      mockUsersRepo.getUserContacts.mockResolvedValue([
        { type: "email", value: "test@example.com", is_primary: true } as ContactRow,
      ]);

      (db as jest.Mock).mockImplementation(() => ({
        transaction: jest.fn((cb: (trx: unknown) => Promise<void>) => cb({})),
      }));

      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue("new_hash" as never);
      mockUsersRepo.changePassword.mockResolvedValue();

      await usersService.updatePassword(userId, dto);

      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe("changeStatus", () => {
    const userId = "user-123";

    it("should change status from pending_verification to active", async () => {
      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        status: "pending_verification",
      } as UserRow);

      (db as jest.Mock).mockImplementation(() => ({
        transaction: jest.fn((cb: (trx: unknown) => Promise<void>) => cb({})),
      }));

      mockUsersRepo.setUserStatus.mockResolvedValue();
      mockUsersRepo.insertStateHistory.mockResolvedValue();
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: userId,
          status: "active",
        } as UserRow,
        contacts: [],
        avatar: null,
      });

      await usersService.changeStatus(null, userId, "active");

      expect(mockUsersRepo.setUserStatus).toHaveBeenCalled();
    });

    it("should change status from active to archived", async () => {
      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        status: "active",
      } as UserRow);

      (db as jest.Mock).mockImplementation(() => ({
        transaction: jest.fn((cb: (trx: unknown) => Promise<void>) => cb({})),
      }));

      mockUsersRepo.setUserStatus.mockResolvedValue();
      mockUsersRepo.insertStateHistory.mockResolvedValue();
      mockUsersRepo.fetchUserWithContacts.mockResolvedValue({
        user: {
          id: userId,
          status: "archived",
        } as UserRow,
        contacts: [],
        avatar: null,
      });

      await usersService.changeStatus(null, userId, "archived");

      expect(mockUsersRepo.setUserStatus).toHaveBeenCalled();
    });

    it("should reject invalid status transition", async () => {
      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        status: "pending_deletion",
      } as UserRow);

      await expect(usersService.changeStatus(null, userId, "active")).rejects.toThrow(
        "Cannot transition status from pending_deletion to active",
      );
    });

    it("should throw error if user not found", async () => {
      mockUsersRepo.findUserById.mockResolvedValue(null);

      await expect(usersService.changeStatus(null, userId, "active")).rejects.toThrow();
    });
  });

  describe("requestAccountDeletion", () => {
    const userId = "user-123";

    it("should schedule account deletion", async () => {
      const mockSchedule = {
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        canCancel: true,
      };

      mockUsersRepo.findUserById.mockResolvedValue({
        id: userId,
        status: "active",
      } as UserRow);

      mockDsrService.scheduleAccountDeletion.mockResolvedValue(mockSchedule);

      const result = await usersService.requestAccountDeletion(userId);

      expect(result).toEqual(mockSchedule);
      expect(mockDsrService.scheduleAccountDeletion).toHaveBeenCalledWith(userId);
    });
  });

  describe("listContacts", () => {
    const userId = "user-123";

    it("should return user contacts", async () => {
      const mockContacts: ContactRow[] = [
        {
          id: "contact-1",
          user_id: userId,
          type: "email",
          value: "test@example.com",
          is_primary: true,
          is_recovery: false,
          is_verified: true,
          verified_at: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockUsersRepo.getUserContacts.mockResolvedValue(mockContacts);

      const result = await usersService.listContacts(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("contact-1");
      expect(result[0].value).toBe("test@example.com");
      expect(result[0].isPrimary).toBe(true);
    });

    it("should return empty array when no contacts", async () => {
      mockUsersRepo.getUserContacts.mockResolvedValue([]);

      const result = await usersService.listContacts(userId);

      expect(result).toEqual([]);
    });
  });

  describe("removeContact", () => {
    const userId = "user-123";
    const contactId = "contact-123";

    it("should remove contact when it exists and user owns it", async () => {
      mockUsersRepo.getContactById.mockResolvedValue({
        id: contactId,
        user_id: userId,
        type: "email",
        value: "test@example.com",
        is_primary: false,
      } as ContactRow);

      mockUsersRepo.deleteContact.mockResolvedValue();

      await usersService.removeContact(userId, contactId);

      expect(mockUsersRepo.deleteContact).toHaveBeenCalledWith(userId, contactId);
    });

    it("should throw error if contact not found", async () => {
      mockUsersRepo.getContactById.mockResolvedValue(null);

      await expect(usersService.removeContact(userId, contactId)).rejects.toThrow();
    });

    it("should throw error if user does not own contact", async () => {
      mockUsersRepo.getContactById.mockResolvedValue({
        id: contactId,
        user_id: "other-user",
        type: "email",
        value: "test@example.com",
      } as ContactRow);

      await expect(usersService.removeContact(userId, contactId)).rejects.toThrow();
    });

    it("should throw error if trying to remove primary email", async () => {
      mockUsersRepo.getContactById.mockResolvedValue({
        id: contactId,
        user_id: userId,
        type: "email",
        value: "primary@example.com",
        is_primary: true,
      } as ContactRow);

      await expect(usersService.removeContact(userId, contactId)).rejects.toThrow(
        "USER_CONTACT_REMOVE_PRIMARY",
      );
    });
  });
});
