/**
 * Unit tests for brute force protection utility functions
 *
 * These tests cover pure functions that don't require database access
 */

import { describe, it, expect } from "@jest/globals";
import {
  getMaxAccountAttempts,
  getRemainingAccountAttempts,
  isAccountLocked,
  getRemainingLockoutSeconds,
  getMaxIPAttempts,
  getMaxIPDistinctEmails,
  getRemainingIPAttempts,
  isIPLocked,
  getRemainingIPLockoutSeconds,
  type FailedLoginAttempt,
  type FailedLoginAttemptByIP,
} from "../../../../apps/backend/src/modules/auth/bruteforce.repository.js";

describe("Brute Force Protection Utilities", () => {
  describe("Account-Level Protection Utilities", () => {
    describe("getMaxAccountAttempts", () => {
      it("should return 5 as the maximum attempts", () => {
        expect(getMaxAccountAttempts()).toBe(5);
      });
    });

    describe("getRemainingAccountAttempts", () => {
      it("should return max attempts when no attempt record exists", () => {
        const remaining = getRemainingAccountAttempts(null);
        expect(remaining).toBe(5);
      });

      it("should return correct remaining attempts for attempt record", () => {
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 2,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const remaining = getRemainingAccountAttempts(attempt);
        expect(remaining).toBe(3); // 5 - 2 = 3
      });

      it("should return 0 when attempt count exceeds max", () => {
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 10,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const remaining = getRemainingAccountAttempts(attempt);
        expect(remaining).toBe(0);
      });

      it("should return 0 when attempt count equals max", () => {
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const remaining = getRemainingAccountAttempts(attempt);
        expect(remaining).toBe(0);
      });
    });

    describe("isAccountLocked", () => {
      it("should return false when no attempt record exists", () => {
        expect(isAccountLocked(null)).toBe(false);
      });

      it("should return false when locked_until is null", () => {
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(isAccountLocked(attempt)).toBe(false);
      });

      it("should return true when lockout is in the future", () => {
        const futureLockout = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: futureLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(isAccountLocked(attempt)).toBe(true);
      });

      it("should return false when lockout is in the past", () => {
        const pastLockout = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: pastLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(isAccountLocked(attempt)).toBe(false);
      });
    });

    describe("getRemainingLockoutSeconds", () => {
      it("should return 0 when no attempt record exists", () => {
        expect(getRemainingLockoutSeconds(null)).toBe(0);
      });

      it("should return 0 when locked_until is null", () => {
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(getRemainingLockoutSeconds(attempt)).toBe(0);
      });

      it("should return 0 when lockout is in the past", () => {
        const pastLockout = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: pastLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(getRemainingLockoutSeconds(attempt)).toBe(0);
      });

      it("should return correct remaining seconds for future lockout", () => {
        const futureLockout = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: futureLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const remaining = getRemainingLockoutSeconds(attempt);
        expect(remaining).toBeGreaterThan(14 * 60);
        expect(remaining).toBeLessThanOrEqual(15 * 60);
      });

      it("should handle lockout that expires in less than a second", () => {
        const nearFutureLockout = new Date(Date.now() + 500).toISOString();
        const attempt: FailedLoginAttempt = {
          id: "1",
          identifier: "test@example.com",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          attempt_count: 5,
          locked_until: nearFutureLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const remaining = getRemainingLockoutSeconds(attempt);
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("IP-Based Protection Utilities", () => {
    describe("getMaxIPAttempts", () => {
      it("should return 10 as the maximum IP attempts", () => {
        expect(getMaxIPAttempts()).toBe(10);
      });
    });

    describe("getMaxIPDistinctEmails", () => {
      it("should return 5 as the maximum distinct emails", () => {
        expect(getMaxIPDistinctEmails()).toBe(5);
      });
    });

    describe("getRemainingIPAttempts", () => {
      it("should return max values when no attempt record exists", () => {
        const result = getRemainingIPAttempts(null);
        expect(result.remainingAttempts).toBe(10);
        expect(result.remainingDistinctEmails).toBe(5);
      });

      it("should return correct remaining attempts for attempt record", () => {
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 2,
          total_attempt_count: 3,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const result = getRemainingIPAttempts(attempt);
        expect(result.remainingAttempts).toBe(7); // 10 - 3 = 7
        expect(result.remainingDistinctEmails).toBe(3); // 5 - 2 = 3
      });

      it("should return 0 when counts exceed max", () => {
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 10,
          total_attempt_count: 20,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const result = getRemainingIPAttempts(attempt);
        expect(result.remainingAttempts).toBe(0);
        expect(result.remainingDistinctEmails).toBe(0);
      });

      it("should return 0 when counts equal max", () => {
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const result = getRemainingIPAttempts(attempt);
        expect(result.remainingAttempts).toBe(0);
        expect(result.remainingDistinctEmails).toBe(0);
      });
    });

    describe("isIPLocked", () => {
      it("should return false when no attempt record exists", () => {
        expect(isIPLocked(null)).toBe(false);
      });

      it("should return false when locked_until is null", () => {
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(isIPLocked(attempt)).toBe(false);
      });

      it("should return true when lockout is in the future", () => {
        const futureLockout = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: futureLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(isIPLocked(attempt)).toBe(true);
      });

      it("should return false when lockout is in the past", () => {
        const pastLockout = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: pastLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(isIPLocked(attempt)).toBe(false);
      });
    });

    describe("getRemainingIPLockoutSeconds", () => {
      it("should return 0 when no attempt record exists", () => {
        expect(getRemainingIPLockoutSeconds(null)).toBe(0);
      });

      it("should return 0 when locked_until is null", () => {
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: null,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(getRemainingIPLockoutSeconds(attempt)).toBe(0);
      });

      it("should return 0 when lockout is in the past", () => {
        const pastLockout = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: pastLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        expect(getRemainingIPLockoutSeconds(attempt)).toBe(0);
      });

      it("should return correct remaining seconds for future lockout", () => {
        const futureLockout = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const attempt: FailedLoginAttemptByIP = {
          id: "1",
          ip_address: "192.168.1.1",
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: futureLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const remaining = getRemainingIPLockoutSeconds(attempt);
        expect(remaining).toBeGreaterThan(29 * 60);
        expect(remaining).toBeLessThanOrEqual(30 * 60);
      });
    });
  });
});
