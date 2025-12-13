import {
  assertPasswordPolicy,
  PASSWORD_COMPLEXITY_REGEX,
} from "../../../../apps/backend/src/modules/auth/passwordPolicy.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";

describe("passwordPolicy", () => {
  describe("assertPasswordPolicy", () => {
    it("should accept valid password meeting all requirements", () => {
      const validPassword = "StrongP@ssw0rd123";

      expect(() => assertPasswordPolicy(validPassword)).not.toThrow();
    });

    it("should reject password without lowercase letter", () => {
      const invalidPassword = "STRONGP@SSW0RD123";

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password without uppercase letter", () => {
      const invalidPassword = "strongp@ssw0rd123";

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password without digit", () => {
      const invalidPassword = "StrongP@ssword";

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password without special character", () => {
      const invalidPassword = "StrongPassword123";

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password shorter than 12 characters", () => {
      const invalidPassword = "Str0ngP@ss";

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should accept password exactly 12 characters", () => {
      const validPassword = "Str0ngP@ss12";

      expect(() => assertPasswordPolicy(validPassword)).not.toThrow();
    });

    it("should accept password longer than 12 characters", () => {
      const validPassword = "VeryStr0ngP@ssw0rd123";

      expect(() => assertPasswordPolicy(validPassword)).not.toThrow();
    });

    it("should reject password containing username (case-insensitive)", () => {
      const password = "MyUs3rname!@#";
      const context = { username: "myus3rname" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_USERNAME");
    });

    it("should reject password containing username with different case", () => {
      const password = "JohnD0e!@#123";
      const context = { username: "johnd0e" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_USERNAME");
    });

    it("should accept password not containing username", () => {
      const password = "Str0ngP@ssw0rd123";
      const context = { username: "differentuser" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should reject password containing email local part (case-insensitive)", () => {
      const password = "MyEmail123!@#";
      const context = { email: "myemail@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_EMAIL");
    });

    it("should reject password containing email local part with different case", () => {
      const password = "TestUs3r!@#123";
      const context = { email: "testus3r@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_EMAIL");
    });

    it("should accept password not containing email local part", () => {
      const password = "Str0ngP@ssw0rd123";
      const context = { email: "user@example.com" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should handle email with complex local part", () => {
      const password = "User.Name+Tag@123";
      const context = { email: "user.name+tag@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_EMAIL");
    });

    it("should handle context with both username and email", () => {
      const password = "MyUs3rname!@#123";
      const context = { username: "myus3rname", email: "different@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_USERNAME");
    });

    it("should handle context with only email", () => {
      const password = "Str0ngP@ssw0rd123";
      const context = { email: "user@example.com" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should handle context with only username", () => {
      const password = "Str0ngP@ssw0rd123";
      const context = { username: "user" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should handle empty context", () => {
      const password = "Str0ngP@ssw0rd123";

      expect(() => assertPasswordPolicy(password, undefined)).not.toThrow();
      expect(() => assertPasswordPolicy(password, {})).not.toThrow();
    });

    it("should handle password with various special characters", () => {
      // Note: - and _ are word characters (\w), so they don't count as special characters
      // The regex requires [^\w\s], which excludes word characters and whitespace
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", "="];

      for (const char of specialChars) {
        const password = `Str0ngP${char}ssw0rd12`;
        // All should be valid (have lowercase, uppercase, digit, special char, >=12 chars)
        expect(() => assertPasswordPolicy(password)).not.toThrow();
      }
    });

    it("should reject password with only special characters", () => {
      const invalidPassword = "!@#$%^&*()_+-";

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password with only numbers and special characters", () => {
      const invalidPassword = "123456!@#$%^";

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should handle password with unicode characters", () => {
      const password = "Str0ngP@ssw0rd\u00E9";

      expect(() => assertPasswordPolicy(password)).not.toThrow();
    });
  });

  describe("PASSWORD_COMPLEXITY_REGEX", () => {
    it("should export the complexity regex", () => {
      expect(PASSWORD_COMPLEXITY_REGEX).toBeDefined();
      expect(PASSWORD_COMPLEXITY_REGEX).toBeInstanceOf(RegExp);
    });

    it("should match valid passwords", () => {
      const validPasswords = [
        "Str0ngP@ssw0rd",
        "MyP@ssw0rd123",
        "Test!@#$%^&*()1",
        "Abc123!@#Def456",
        "ValidP@ss1234",
      ];

      for (const password of validPasswords) {
        expect(PASSWORD_COMPLEXITY_REGEX.test(password)).toBe(true);
      }
    });

    it("should not match invalid passwords", () => {
      const invalidPasswords = [
        "short", // too short
        "nouppercase123!", // no uppercase
        "NOLOWERCASE123!", // no lowercase
        "NoDigitsHere!", // no digits
        "NoSpecialChars123", // no special chars
      ];

      for (const password of invalidPasswords) {
        expect(PASSWORD_COMPLEXITY_REGEX.test(password)).toBe(false);
      }
    });
  });
});
