/**
 * Unit tests for IP extractor utility
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request } from "express";
import type { Socket } from "net";
import { extractClientIp, extractClientIpForRateLimit } from "../ip-extractor.js";
import { env } from "../../config/env.js";

// Mock environment config
jest.mock("../../config/env.js", () => ({
  env: {
    trustProxy: false,
  },
}));

describe("IP Extractor", () => {
  let mockReq: Partial<Request>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      socket: {
        remoteAddress: "192.168.1.1",
      } as Partial<Socket> as Socket,
      ip: "192.168.1.1",
      headers: {},
    } as Partial<Request>;
  });

  describe("extractClientIp", () => {
    it("should extract IP from socket when trust proxy is disabled", () => {
      jest.mocked(env).trustProxy = false;

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from X-Forwarded-For when trust proxy is enabled", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {
        "x-forwarded-for": "203.0.113.1, 192.168.1.1",
      };

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should use first IP from X-Forwarded-For chain", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {
        "x-forwarded-for": "203.0.113.1, 198.51.100.1, 192.168.1.1",
      };

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should trim whitespace from X-Forwarded-For IPs", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {
        "x-forwarded-for": "  203.0.113.1  ,  198.51.100.1  ",
      };

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should fallback to socket IP if X-Forwarded-For is invalid", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {
        "x-forwarded-for": "invalid-ip",
      };

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("192.168.1.1");
    });

    it("should fallback to socket IP if X-Forwarded-For is missing", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {};

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("192.168.1.1");
    });

    it("should handle IPv6 addresses", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {
        "x-forwarded-for": "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      };

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });

    it("should handle localhost IPv6", () => {
      jest.mocked(env).trustProxy = false;
      mockReq.socket = {
        remoteAddress: "::1",
      } as Partial<Socket> as Socket;
      (mockReq as { ip?: string }).ip = "::1";

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("::1");
    });

    it("should return unknown if IP cannot be determined", () => {
      jest.mocked(env).trustProxy = false;
      mockReq.socket = undefined;
      (mockReq as { ip?: string }).ip = undefined;

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("unknown");
    });

    it("should ignore X-Forwarded-For when trust proxy is disabled", () => {
      jest.mocked(env).trustProxy = false;
      mockReq.headers = {
        "x-forwarded-for": "203.0.113.1",
      };
      mockReq.socket = {
        remoteAddress: "192.168.1.1",
      } as Partial<Socket> as Socket;
      (mockReq as { ip?: string }).ip = "192.168.1.1";

      const ip = extractClientIp(mockReq as Request);

      expect(ip).toBe("192.168.1.1");
    });

    it("should handle array format X-Forwarded-For", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {
        "x-forwarded-for": ["203.0.113.1", "198.51.100.1"],
      };

      const ip = extractClientIp(mockReq as Request);

      // Should fall back to socket IP since array format is not a string
      expect(ip).toBe("192.168.1.1");
    });
  });

  describe("extractClientIpForRateLimit", () => {
    it("should return same result as extractClientIp", () => {
      jest.mocked(env).trustProxy = false;

      const ip = extractClientIpForRateLimit(mockReq as Request);

      expect(ip).toBe("192.168.1.1");
    });

    it("should use X-Forwarded-For when trust proxy enabled", () => {
      jest.mocked(env).trustProxy = true;
      mockReq.headers = {
        "x-forwarded-for": "203.0.113.1",
      };

      const ip = extractClientIpForRateLimit(mockReq as Request);

      expect(ip).toBe("203.0.113.1");
    });
  });
});
