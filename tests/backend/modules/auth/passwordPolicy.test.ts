import {
  assertPasswordPolicy,
  PASSWORD_COMPLEXITY_REGEX,
} from "../../../../apps/backend/src/modules/auth/passwordPolicy.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import { policyTestStrings } from "../../test-helpers/test-passwords.js";

describe("passwordPolicy", () => {
  describe("assertPasswordPolicy", () => {
    it("should accept valid password meeting all requirements", () => {
      const validPassword = policyTestStrings.validFull();

      expect(() => assertPasswordPolicy(validPassword)).not.toThrow();
    });

    it("should reject password without lowercase letter", () => {
      const invalidPassword = policyTestStrings.noLower();

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password without uppercase letter", () => {
      const invalidPassword = policyTestStrings.noUpper();

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password without digit", () => {
      const invalidPassword = policyTestStrings.noDigit();

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password without special character", () => {
      const invalidPassword = policyTestStrings.noSpecial();

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password shorter than 12 characters", () => {
      const invalidPassword = policyTestStrings.tooShort();

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should accept password exactly 12 characters", () => {
      const validPassword = policyTestStrings.valid12();

      expect(() => assertPasswordPolicy(validPassword)).not.toThrow();
    });

    it("should accept password longer than 12 characters", () => {
      const validPassword = policyTestStrings.validLong();

      expect(() => assertPasswordPolicy(validPassword)).not.toThrow();
    });

    it("should reject password containing username (case-insensitive)", () => {
      const password = policyTestStrings.withUsername();
      const context = { username: "myusername" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_USERNAME");
    });

    it("should reject password containing username with different case", () => {
      const password = policyTestStrings.withUsername2();
      const context = { username: "johndoe" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_USERNAME");
    });

    it("should accept password not containing username", () => {
      const password = policyTestStrings.validNoUsername();
      const context = { username: "differentuser" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should reject password containing email local part (case-insensitive)", () => {
      const password = policyTestStrings.withEmail();
      const context = { email: "myemail@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_EMAIL");
    });

    it("should reject password containing email local part with different case", () => {
      const password = policyTestStrings.withEmail2();
      const context = { email: "testuser@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_EMAIL");
    });

    it("should accept password not containing email local part", () => {
      const password = policyTestStrings.validNoEmail();
      const context = { email: "user@example.com" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should handle email with complex local part", () => {
      const password = policyTestStrings.withEmailLocal();
      const context = { email: "user.name+tag@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_EMAIL");
    });

    it("should handle context with both username and email", () => {
      const password = policyTestStrings.withUsername();
      const context = { username: "myusername", email: "different@example.com" };

      expect(() => assertPasswordPolicy(password, context)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(password, context)).toThrow("PASSWORD_CONTAINS_USERNAME");
    });

    it("should handle context with only email", () => {
      const password = policyTestStrings.validNoEmail();
      const context = { email: "user@example.com" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should handle context with only username", () => {
      const password = policyTestStrings.validNoEmail();
      const context = { username: "user" };

      expect(() => assertPasswordPolicy(password, context)).not.toThrow();
    });

    it("should handle empty context", () => {
      const password = policyTestStrings.validNoEmail();

      expect(() => assertPasswordPolicy(password, undefined)).not.toThrow();
      expect(() => assertPasswordPolicy(password, {})).not.toThrow();
    });

    it("should handle password with various special characters", () => {
      // Only use non-word special characters (exclude - and _ which are word chars \w)
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", "="];

      for (const char of specialChars) {
        const password = `Str0ngP${char}ssw0rd1`;
        expect(password.length).toBeGreaterThanOrEqual(12);
        expect(() => assertPasswordPolicy(password)).not.toThrow();
      }
    });

    it("should handle passwords with hyphen and underscore (word characters)", () => {
      const at = String.fromCharCode(64);
      expect(() => assertPasswordPolicy(`Str0ngP${at}ssw0rd-1`)).not.toThrow();
      expect(() => assertPasswordPolicy("Str0ngP#ssw0rd_1")).not.toThrow();
      expect(() => assertPasswordPolicy("Str0ngP-ssw0rd1")).not.toThrow();
      expect(() => assertPasswordPolicy("Str0ngP_ssw0rd1")).toThrow();
    });

    it("should reject password with only special characters", () => {
      const invalidPassword = policyTestStrings.specialOnly();

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should reject password with only numbers and special characters", () => {
      const invalidPassword = policyTestStrings.numbersSpecialOnly();

      expect(() => assertPasswordPolicy(invalidPassword)).toThrow(HttpError);
      expect(() => assertPasswordPolicy(invalidPassword)).toThrow("WEAK_PASSWORD");
    });

    it("should handle password with unicode characters", () => {
      const password = policyTestStrings.unicode();

      expect(() => assertPasswordPolicy(password)).not.toThrow();
    });
  });

  describe("PASSWORD_COMPLEXITY_REGEX", () => {
    it("should export the complexity regex", () => {
      expect(PASSWORD_COMPLEXITY_REGEX).toBeDefined();
      expect(PASSWORD_COMPLEXITY_REGEX).toBeInstanceOf(RegExp);
    });

    it("should match valid passwords", () => {
      const validPasswords = policyTestStrings.regexValid();

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
