import type { Request, Response } from "express";
import type { JwtPayload } from "../../auth/auth.types.js";
import * as usersController from "../users.controller.js";
import * as usersService from "../users.service.js";
import * as usersRepository from "../users.repository.js";

// Helper to create complete JwtPayload
function createMockJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: "user-123",
    role: "user",
    sid: "session-123",
    ...overrides,
  };
}

// Mock dependencies
jest.mock("../users.service.js");
jest.mock("../users.repository.js");

const mockUsersService = jest.mocked(usersService);
const mockUsersRepository = jest.mocked(usersRepository);

describe("Users Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      params: {},
      query: {},
      body: {},
      headers: {},
      get: jest.fn((headerName: string) => {
        if (headerName === "set-cookie") {
          return [];
        }
        return (mockRequest.headers as Record<string, string>)?.[headerName.toLowerCase()];
      }) as jest.Mock,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      pipe: jest.fn(),
      on: jest.fn().mockReturnThis(),
      once: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      writable: true,
      write: jest.fn(),
      end: jest.fn(),
    };
    jest.clearAllMocks();
    // Reset repository/service mocks to clear mockResolvedValue/mockImplementation
    mockUsersRepository.getUserMetrics.mockReset();
    mockUsersService.getMe.mockReset();
    mockUsersService.createUser.mockReset();
  });

  describe("me", () => {
    it("should return current user details", async () => {
      mockRequest.user = createMockJwtPayload();

      const mockUser = {
        id: "user-123",
        username: "testuser",
        displayName: "Test User",
        primaryEmail: "test@example.com",
        contacts: [],
        avatar: null,
      };

      mockUsersService.getMe.mockResolvedValue(mockUser as never);

      await usersController.me(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.getMe).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    });

    it("should return 401 if user not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should return 404 if user not found", async () => {
      mockRequest.user = createMockJwtPayload();
      mockUsersService.getMe.mockResolvedValue(null);

      await usersController.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "User not found" });
    });
  });

  describe("list", () => {
    it("should list users with default pagination", async () => {
      const mockUsers = [
        { id: "user-1", username: "user1" },
        { id: "user-2", username: "user2" },
      ];

      mockUsersService.listAll.mockResolvedValue(mockUsers as never);

      await usersController.list(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.listAll).toHaveBeenCalledWith(50, 0);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should list users with custom pagination", async () => {
      mockRequest.query = { limit: "10", offset: "20" };

      mockUsersService.listAll.mockResolvedValue([] as never);

      await usersController.list(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.listAll).toHaveBeenCalledWith(10, 20);
    });
  });

  describe("adminCreateUser", () => {
    it("should create user with valid data", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "admin-123", role: "admin" });
      mockRequest.body = {
        username: "newuser",
        displayName: "New User",
        email: "newuser@example.com",
        password: "SecureP@ssw0rd123",
        role: "athlete",
      };

      const mockUser = {
        id: "new-user-id",
        username: "newuser",
        displayName: "New User",
      };

      mockUsersService.createUser.mockResolvedValue(mockUser as never);

      await usersController.adminCreateUser(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.createUser).toHaveBeenCalledWith("admin-123", mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    });

    it("should return 400 for invalid data", async () => {
      mockRequest.body = {
        username: "ab", // too short
        displayName: "Test",
        email: "invalid-email",
        password: "weak",
        role: "athlete",
      };

      await usersController.adminCreateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe("updateMe", () => {
    it("should update user profile", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = {
        displayName: "Updated Name",
      };

      const mockUpdatedUser = {
        id: "user-123",
        displayName: "Updated Name",
      };

      mockUsersService.updateProfile.mockResolvedValue(mockUpdatedUser as never);

      await usersController.updateMe(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith("user-123", mockRequest.body);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedUser);
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.updateMe(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should return 400 for invalid data", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = {
        username: "a", // too short
      };

      await usersController.updateMe(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("changePassword", () => {
    it("should change password with valid credentials", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = {
        currentPassword: "OldP@ssw0rd123",
        newPassword: "NewP@ssw0rd456",
      };

      mockUsersService.updatePassword.mockResolvedValue();

      await usersController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.updatePassword).toHaveBeenCalledWith("user-123", mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should return 400 for invalid password format", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = {
        currentPassword: "short",
        newPassword: "weak",
      };

      await usersController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("deleteAccount", () => {
    it("should schedule account deletion", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = { password: "ValidPassword123!" };

      const mockSchedule = {
        scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        purgeDueAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        backupPurgeDueAt: new Date(Date.now() + 74 * 24 * 60 * 60 * 1000).toISOString(),
      };

      mockUsersService.requestAccountDeletion.mockResolvedValue(mockSchedule as never);

      await usersController.deleteAccount(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.requestAccountDeletion).toHaveBeenCalledWith(
        "user-123",
        "ValidPassword123!",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "pending_deletion",
        scheduledAt: mockSchedule.scheduledAt,
        purgeDueAt: mockSchedule.purgeDueAt,
        backupPurgeDueAt: mockSchedule.backupPurgeDueAt,
      });
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.deleteAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("exportData", () => {
    it("should export user data as zip", async () => {
      mockRequest.user = createMockJwtPayload();

      const mockUserData = {
        meta: {
          schemaVersion: "1.0",
          exportedAt: new Date().toISOString(),
          recordCounts: {},
        },
        user: {},
        profile: null,
        contacts: [],
        metrics: [],
        social: { followers: [], following: [] },
        exercises: { personal: [], plans: [] },
        sessions: { items: [], exercises: [], sets: [] },
        points: { total: 0, history: [] },
        badges: [],
        media: [],
        stateHistory: [],
      };

      mockUsersService.collectUserData.mockResolvedValue(mockUserData as never);

      await usersController.exportData(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.collectUserData).toHaveBeenCalledWith("user-123");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/zip");
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment"),
      );
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.exportData(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("getById", () => {
    it("should return user by ID", async () => {
      mockRequest.params = { id: "user-456" };

      const mockUser = {
        id: "user-456",
        username: "otheruser",
      };

      mockUsersService.getMe.mockResolvedValue(mockUser as never);

      await usersController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.getMe).toHaveBeenCalledWith("user-456");
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    });

    it("should return 404 if user not found", async () => {
      mockRequest.params = { id: "nonexistent" };
      mockUsersService.getMe.mockResolvedValue(null);

      await usersController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe("listUserContacts", () => {
    it("should list user contacts", async () => {
      mockRequest.user = createMockJwtPayload();

      const mockContacts = [
        {
          id: "contact-1",
          type: "email",
          value: "test@example.com",
          isPrimary: true,
        },
      ];

      mockUsersService.listContacts.mockResolvedValue(mockContacts as never);

      await usersController.listUserContacts(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.listContacts).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith(mockContacts);
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.listUserContacts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("requestContactVerificationHandler", () => {
    it("should request contact verification", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.params = { contactId: "550e8400-e29b-41d4-a716-446655440000" };

      const mockVerification = {
        token: "verification-token",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      mockUsersService.requestContactVerification.mockResolvedValue(mockVerification as never);

      await usersController.requestContactVerificationHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockUsersService.requestContactVerification).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockVerification);
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.requestContactVerificationHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("updateEmail", () => {
    it("should update primary email", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = { email: "newemail@example.com" };

      const mockUpdatedUser = {
        id: "user-123",
        primaryEmail: "newemail@example.com",
      };

      mockUsersService.updatePrimaryEmail.mockResolvedValue(mockUpdatedUser as never);

      await usersController.updateEmail(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.updatePrimaryEmail).toHaveBeenCalledWith(
        "user-123",
        "newemail@example.com",
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedUser);
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.updateEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should return 400 for invalid email", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = { email: "invalid-email" };

      await usersController.updateEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("updatePhone", () => {
    it("should update phone number", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = { phone: "+1234567890" };

      const mockUpdatedUser = {
        id: "user-123",
        phoneNumber: "+1234567890",
      };

      mockUsersService.updatePhoneNumber.mockResolvedValue(mockUpdatedUser as never);

      await usersController.updatePhone(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.updatePhoneNumber).toHaveBeenCalledWith(
        "user-123",
        "+1234567890",
        true,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedUser);
    });

    it("should update phone with recovery flag", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.body = { phone: "+1234567890", isRecovery: true };

      mockUsersService.updatePhoneNumber.mockResolvedValue({} as never);

      await usersController.updatePhone(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.updatePhoneNumber).toHaveBeenCalledWith(
        "user-123",
        "+1234567890",
        true,
      );
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.updatePhone(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("verifyContactHandler", () => {
    it("should verify contact with valid token", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.params = { contactId: "550e8400-e29b-41d4-a716-446655440001" };
      mockRequest.body = { token: "verification-token-12345" };

      // Mock contact ownership check (security requirement)
      const mockContact = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        user_id: "user-123",
        contact_type: "email",
        contact_value: "test@example.com",
        is_verified: false,
      };
      mockUsersRepository.getContactById.mockResolvedValue(mockContact as never);

      const mockUpdatedUser = {
        id: "user-123",
      };

      mockUsersService.verifyContact.mockResolvedValue(mockUpdatedUser as never);

      await usersController.verifyContactHandler(mockRequest as Request, mockResponse as Response);

      expect(mockUsersRepository.getContactById).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440001",
      );
      expect(mockUsersService.verifyContact).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440001",
        "verification-token-12345",
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedUser);
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.verifyContactHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should return 403 if contact belongs to different user (CWE-807 fix)", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.params = { contactId: "550e8400-e29b-41d4-a716-446655440001" };
      mockRequest.body = { token: "verification-token-12345" };

      // Contact exists but belongs to a different user
      const mockContact = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        user_id: "different-user-456",
        contact_type: "email",
        contact_value: "other@example.com",
        is_verified: false,
      };
      mockUsersRepository.getContactById.mockResolvedValue(mockContact as never);

      await usersController.verifyContactHandler(mockRequest as Request, mockResponse as Response);

      expect(mockUsersRepository.getContactById).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440001",
      );
      expect(mockUsersService.verifyContact).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "FORBIDDEN",
          message: "Contact not found or access denied",
        },
      });
    });

    it("should return 403 if contact does not exist (CWE-807 fix)", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.params = { contactId: "550e8400-e29b-41d4-a716-446655440001" };
      mockRequest.body = { token: "verification-token-12345" };

      // Contact not found
      mockUsersRepository.getContactById.mockResolvedValue(undefined);

      await usersController.verifyContactHandler(mockRequest as Request, mockResponse as Response);

      expect(mockUsersRepository.getContactById).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440001",
      );
      expect(mockUsersService.verifyContact).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it("should return 400 for invalid token format", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.params = { contactId: "contact-456" };
      mockRequest.body = { token: "short" };

      await usersController.verifyContactHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("removeContactHandler", () => {
    it("should remove contact", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.params = { contactId: "550e8400-e29b-41d4-a716-446655440002" };

      mockUsersService.removeContact.mockResolvedValue();

      await usersController.removeContactHandler(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.removeContact).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440002",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await usersController.removeContactHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("adminChangeStatus", () => {
    it("should change user status", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "admin-123", role: "admin" });
      mockRequest.params = { id: "user-456" };
      mockRequest.body = { status: "archived" };

      const mockUpdatedUser = {
        id: "user-456",
        status: "archived",
      };

      mockUsersService.changeStatus.mockResolvedValue(mockUpdatedUser as never);

      await usersController.adminChangeStatus(mockRequest as Request, mockResponse as Response);

      expect(mockUsersService.changeStatus).toHaveBeenCalledWith(
        "admin-123",
        "user-456",
        "archived",
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedUser);
    });

    it("should return 400 for invalid status", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "admin-123", role: "admin" });
      mockRequest.params = { id: "user-456" };
      mockRequest.body = { status: "invalid-status" };

      await usersController.adminChangeStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getMetrics", () => {
    it("should return metrics for authenticated user (me endpoint)", async () => {
      mockRequest.user = createMockJwtPayload();
      mockRequest.params = {};

      const mockMetrics = {
        follower_count: 50,
        following_count: 30,
        sessions_completed: 100,
        total_points: 5000,
        current_streak_days: 7,
      };

      mockUsersRepository.getUserMetrics.mockResolvedValue(mockMetrics as never);

      await usersController.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockMetrics);
      expect(mockUsersRepository.getUserMetrics).toHaveBeenCalledWith("user-123");
    });

    it("should return metrics for specific user by ID (admin access)", async () => {
      mockRequest.user = createMockJwtPayload({
        sub: "admin-123",
        role: "admin",
        sid: "session-admin",
      });
      mockRequest.params = { userId: "user-456" };

      const mockMetrics = {
        follower_count: 100,
        following_count: 75,
        sessions_completed: 250,
        total_points: 12500,
        current_streak_days: 14,
      };

      mockUsersRepository.getUserMetrics.mockResolvedValue(mockMetrics as never);

      await usersController.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockMetrics);
      expect(mockUsersRepository.getUserMetrics).toHaveBeenCalledWith("user-456");
    });

    it("should return 401 if no user ID provided", async () => {
      mockRequest.user = undefined;
      mockRequest.params = {};

      await usersController.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should handle metrics with zero values", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "new-user-123" });
      mockRequest.params = {};

      const mockMetrics = {
        follower_count: 0,
        following_count: 0,
        sessions_completed: 0,
        total_points: 0,
        current_streak_days: 0,
      };

      mockUsersRepository.getUserMetrics.mockResolvedValue(mockMetrics as never);

      await usersController.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockMetrics);
      expect(mockUsersRepository.getUserMetrics).toHaveBeenCalledWith("new-user-123");
    });
  });
});
