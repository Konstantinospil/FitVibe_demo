import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../../apps/backend/src/utils/http.js";

// Mock csrf library before importing the module
const mockTokensInstance = {
  secretSync: jest.fn().mockReturnValue("mock-secret"),
  create: jest.fn().mockReturnValue("mock-token"),
  verify: jest.fn().mockReturnValue(true),
};

jest.doMock("csrf", () => {
  return jest.fn().mockImplementation(() => mockTokensInstance);
});

// Mock env
jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    isProduction: false,
  },
}));

// Import after mocks are set up
import {
  csrfProtection,
  csrfTokenRoute,
  validateOrigin,
} from "../../../apps/backend/src/middlewares/csrf.js";
import { env } from "../../../apps/backend/src/config/env.js";

describe("CSRF Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockTokensInstance.secretSync.mockReturnValue("mock-secret");
    mockTokensInstance.create.mockReturnValue("mock-token");
    mockTokensInstance.verify.mockReturnValue(true);

    mockRequest = {
      method: "POST",
      headers: {},
      body: {},
      query: {},
      cookies: {},
    };

    mockResponse = {
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("csrfProtection", () => {
    it("should allow safe methods (GET)", () => {
      mockRequest.method = "GET";

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockTokensInstance.verify).not.toHaveBeenCalled();
    });

    it("should allow safe methods (HEAD)", () => {
      mockRequest.method = "HEAD";

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow safe methods (OPTIONS)", () => {
      mockRequest.method = "OPTIONS";

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in header", () => {
      const secret = "test-secret";
      const token = "valid-token";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };
      mockRequest.headers = { "x-csrf-token": token };
      mockTokensInstance.verify.mockReturnValue(true);

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.verify).toHaveBeenCalledWith(secret, token);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in csrf-token header", () => {
      const secret = "test-secret";
      const token = "valid-token";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };
      mockRequest.headers = { "csrf-token": token };
      mockTokensInstance.verify.mockReturnValue(true);

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.verify).toHaveBeenCalledWith(secret, token);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in x-xsrf-token header", () => {
      const secret = "test-secret";
      const token = "valid-token";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };
      mockRequest.headers = { "x-xsrf-token": token };
      mockTokensInstance.verify.mockReturnValue(true);

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.verify).toHaveBeenCalledWith(secret, token);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in body", () => {
      const secret = "test-secret";
      const token = "valid-token";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };
      mockRequest.body = { _csrf: token };
      mockTokensInstance.verify.mockReturnValue(true);

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.verify).toHaveBeenCalledWith(secret, token);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in query", () => {
      const secret = "test-secret";
      const token = "valid-token";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };
      mockRequest.query = { _csrf: token };
      mockTokensInstance.verify.mockReturnValue(true);

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.verify).toHaveBeenCalledWith(secret, token);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject request with invalid token", () => {
      const secret = "test-secret";
      const token = "invalid-token";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };
      mockRequest.headers = { "x-csrf-token": token };
      mockTokensInstance.verify.mockReturnValue(false);

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.verify).toHaveBeenCalledWith(secret, token);
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(403);
      expect((error as HttpError).code).toBe("CSRF_TOKEN_INVALID");
    });

    it("should reject request with missing token", () => {
      const secret = "test-secret";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(403);
      expect((error as HttpError).code).toBe("CSRF_TOKEN_INVALID");
    });

    it("should create new secret if cookie doesn't exist", () => {
      mockRequest.method = "GET";
      mockRequest.cookies = {};

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.secretSync).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "__Host-fitvibe-csrf",
        "mock-secret",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it("should use existing secret from cookie", () => {
      const secret = "existing-secret";
      mockRequest.method = "GET";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensInstance.secretSync).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it("should set secure flag in production", () => {
      (env as { isProduction: boolean }).isProduction = true;
      mockRequest.method = "GET";
      mockRequest.cookies = {};

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "__Host-fitvibe-csrf",
        expect.any(String),
        expect.objectContaining({
          secure: true,
        }),
      );
    });
  });

  describe("csrfTokenRoute", () => {
    it("should return CSRF token", () => {
      const secret = "test-secret";
      const token = "generated-token";
      mockRequest.cookies = { "__Host-fitvibe-csrf": secret };
      mockTokensInstance.create.mockReturnValue(token);

      csrfTokenRoute(mockRequest as Request, mockResponse as Response);

      expect(mockTokensInstance.create).toHaveBeenCalledWith(secret);
      expect(mockResponse.json).toHaveBeenCalledWith({ csrfToken: token });
    });

    it("should create new secret if cookie doesn't exist", () => {
      mockRequest.cookies = {};
      mockTokensInstance.create.mockReturnValue("new-token");

      csrfTokenRoute(mockRequest as Request, mockResponse as Response);

      expect(mockTokensInstance.secretSync).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockTokensInstance.create).toHaveBeenCalledWith("mock-secret");
    });
  });

  describe("validateOrigin", () => {
    const allowedOrigins = ["http://localhost:5173", "https://example.com"];

    it("should allow safe methods (GET)", () => {
      mockRequest.method = "GET";
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid origin", () => {
      mockRequest.method = "POST";
      mockRequest.headers = { origin: "http://localhost:5173" };
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid referer", () => {
      mockRequest.method = "POST";
      mockRequest.headers = { referer: "http://localhost:5173/path" };
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject request with invalid origin", () => {
      mockRequest.method = "POST";
      mockRequest.headers = { origin: "http://evil.com" };
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { code: "FORBIDDEN", message: "Origin not allowed" },
      });
    });

    it("should reject request with invalid referer", () => {
      mockRequest.method = "POST";
      mockRequest.headers = { referer: "http://evil.com/path" };
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { code: "FORBIDDEN", message: "Referer not allowed" },
      });
    });

    it("should reject request with invalid referer URL", () => {
      mockRequest.method = "POST";
      mockRequest.headers = { referer: "not-a-valid-url" };
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { code: "FORBIDDEN", message: "Invalid referer" },
      });
    });

    it("should reject request with missing origin and referer", () => {
      mockRequest.method = "POST";
      mockRequest.headers = {};
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { code: "FORBIDDEN", message: "Missing Origin/Referer header" },
      });
    });

    it("should prioritize origin over referer", () => {
      mockRequest.method = "POST";
      mockRequest.headers = {
        origin: "http://localhost:5173",
        referer: "http://evil.com/path",
      };
      const middleware = validateOrigin(allowedOrigins);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
