import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../../apps/backend/src/utils/http.js";

jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    isProduction: false,
    COOKIE_SECURE: false,
  },
}));

import {
  csrfProtection,
  csrfTokenRoute,
  validateOrigin,
} from "../../../apps/backend/src/middlewares/csrf.js";
import { env } from "../../../apps/backend/src/config/env.js";

const CSRF_COOKIE = "fitvibe-csrf";

function issueCsrfToken() {
  const req = {
    method: "GET",
    headers: {},
    body: {},
    query: {},
    cookies: {},
  } as unknown as Request;
  const res = {
    cookie: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  csrfTokenRoute(req, res);

  const cookieCall = (res.cookie as jest.Mock).mock.calls[0] as [string, string] | undefined;
  const secret = cookieCall?.[1];
  const csrfToken = (res.json as jest.Mock).mock.calls[0][0].csrfToken as string;
  return { secret, csrfToken };
}

describe("CSRF Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    (env as { isProduction: boolean }).isProduction = false;

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
      const { secret, csrfToken } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };
      mockRequest.headers = { "x-csrf-token": csrfToken };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in csrf-token header", () => {
      const { secret, csrfToken } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };
      mockRequest.headers = { "csrf-token": csrfToken };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in x-xsrf-token header", () => {
      const { secret, csrfToken } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };
      mockRequest.headers = { "x-xsrf-token": csrfToken };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in body", () => {
      const { secret, csrfToken } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };
      mockRequest.body = { _csrf: csrfToken };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow request with valid token in query", () => {
      const { secret, csrfToken } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };
      mockRequest.query = { _csrf: csrfToken };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject request with invalid token", () => {
      const { secret } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };
      mockRequest.headers = { "x-csrf-token": "invalid-token" };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(403);
      expect((error as HttpError).code).toBe("CSRF_TOKEN_INVALID");
    });

    it("should reject request with missing token", () => {
      const { secret } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };

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

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CSRF_COOKIE,
        expect.any(String),
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
      mockRequest.method = "GET";
      mockRequest.cookies = { [CSRF_COOKIE]: "existing-secret" };

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it("should set secure flag in production", () => {
      (env as { isProduction: boolean }).isProduction = true;
      mockRequest.method = "GET";
      mockRequest.cookies = {};

      csrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CSRF_COOKIE,
        expect.any(String),
        expect.objectContaining({
          secure: true,
        }),
      );
    });
  });

  describe("csrfTokenRoute", () => {
    it("should return CSRF token", () => {
      const { secret } = issueCsrfToken();
      mockRequest.cookies = { [CSRF_COOKIE]: secret };

      csrfTokenRoute(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        csrfToken: expect.any(String),
      });
    });

    it("should create new secret if cookie doesn't exist", () => {
      mockRequest.cookies = {};

      csrfTokenRoute(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CSRF_COOKIE,
        expect.any(String),
        expect.objectContaining({ httpOnly: true, path: "/" }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        csrfToken: expect.any(String),
      });
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
