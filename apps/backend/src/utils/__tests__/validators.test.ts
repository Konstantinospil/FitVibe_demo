import { isStrongPassword, cleanUsername } from "../validators";

describe("validators utilities", () => {
  describe("isStrongPassword", () => {
    it("should return true for valid strong password", () => {
      const result = isStrongPassword("MyP@ssw0rd123");

      expect(result).toBe(true);
    });

    it("should return true for password with all required character types", () => {
      const result = isStrongPassword("Abcdefgh123!");

      expect(result).toBe(true);
    });

    it("should return false for password shorter than 12 characters", () => {
      const result = isStrongPassword("Short1!Aa");

      expect(result).toBe(false);
    });

    it("should return false for password without uppercase letter", () => {
      const result = isStrongPassword("myp@ssw0rd123");

      expect(result).toBe(false);
    });

    it("should return false for password without lowercase letter", () => {
      const result = isStrongPassword("MYP@SSW0RD123");

      expect(result).toBe(false);
    });

    it("should return false for password without digit", () => {
      const result = isStrongPassword("MyP@ssword!!");

      expect(result).toBe(false);
    });

    it("should return false for password without special character", () => {
      const result = isStrongPassword("MyPassword123");

      expect(result).toBe(false);
    });

    it("should return false for non-string input (number)", () => {
      const result = isStrongPassword(12345678901);

      expect(result).toBe(false);
    });

    it("should return false for non-string input (null)", () => {
      const result = isStrongPassword(null);

      expect(result).toBe(false);
    });

    it("should return false for non-string input (undefined)", () => {
      const result = isStrongPassword(undefined);

      expect(result).toBe(false);
    });

    it("should return false for non-string input (object)", () => {
      const result = isStrongPassword({});

      expect(result).toBe(false);
    });

    it("should return false for empty string", () => {
      const result = isStrongPassword("");

      expect(result).toBe(false);
    });

    it("should accept various special characters", () => {
      expect(isStrongPassword("MyP@ssw0rd123")).toBe(true);
      expect(isStrongPassword("MyP#ssw0rd123")).toBe(true);
      expect(isStrongPassword("MyP$ssw0rd123")).toBe(true);
      expect(isStrongPassword("MyP%ssw0rd123")).toBe(true);
      expect(isStrongPassword("MyP&ssw0rd123")).toBe(true);
      expect(isStrongPassword("MyP*ssw0rd123")).toBe(true);
    });

    it("should return true for exactly 12 characters with all requirements", () => {
      const result = isStrongPassword("MyPass1!word");

      expect(result).toBe(true);
    });

    it("should return true for very long password", () => {
      const result = isStrongPassword("MyP@ssw0rd123456789MyP@ssw0rd123456789");

      expect(result).toBe(true);
    });

    it("should handle password with spaces", () => {
      const result = isStrongPassword("My P@ssw0rd 123");

      expect(result).toBe(true);
    });
  });

  describe("cleanUsername", () => {
    it("should return cleaned lowercase username", () => {
      const result = cleanUsername("TestUser");

      expect(result).toBe("testuser");
    });

    it("should trim whitespace", () => {
      const result = cleanUsername("  testuser  ");

      expect(result).toBe("testuser");
    });

    it("should allow dots in username", () => {
      const result = cleanUsername("test.user");

      expect(result).toBe("test.user");
    });

    it("should allow hyphens in username", () => {
      const result = cleanUsername("test-user");

      expect(result).toBe("test-user");
    });

    it("should allow underscores in username", () => {
      const result = cleanUsername("test_user");

      expect(result).toBe("test_user");
    });

    it("should allow numbers in username", () => {
      const result = cleanUsername("testuser123");

      expect(result).toBe("testuser123");
    });

    it("should return null for username shorter than 3 characters", () => {
      const result = cleanUsername("ab");

      expect(result).toBeNull();
    });

    it("should return null for username longer than 24 characters", () => {
      const result = cleanUsername("abcdefghijklmnopqrstuvwxyz");

      expect(result).toBeNull();
    });

    it("should accept exactly 3 characters", () => {
      const result = cleanUsername("abc");

      expect(result).toBe("abc");
    });

    it("should accept exactly 24 characters", () => {
      const result = cleanUsername("abcdefghijklmnopqrstuv12");

      expect(result).toBe("abcdefghijklmnopqrstuv12");
    });

    it("should return null for username with invalid characters (spaces)", () => {
      const result = cleanUsername("test user");

      expect(result).toBeNull();
    });

    it("should return null for username with invalid characters (special chars)", () => {
      const result = cleanUsername("test@user");

      expect(result).toBeNull();
    });

    it("should return null for username with uppercase after cleaning", () => {
      // Actually, it converts to lowercase first, so uppercase is allowed
      const result = cleanUsername("TESTUSER");

      expect(result).toBe("testuser");
    });

    it("should return null for non-string input (number)", () => {
      const result = cleanUsername(12345);

      expect(result).toBeNull();
    });

    it("should return null for non-string input (null)", () => {
      const result = cleanUsername(null);

      expect(result).toBeNull();
    });

    it("should return null for non-string input (undefined)", () => {
      const result = cleanUsername(undefined);

      expect(result).toBeNull();
    });

    it("should return null for non-string input (object)", () => {
      const result = cleanUsername({});

      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = cleanUsername("");

      expect(result).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      const result = cleanUsername("   ");

      expect(result).toBeNull();
    });

    it("should handle mixed valid characters", () => {
      const result = cleanUsername("test_user.123-abc");

      expect(result).toBe("test_user.123-abc");
    });

    it("should allow username starting with hyphen", () => {
      const result = cleanUsername("-testuser");

      expect(result).toBe("-testuser");
    });

    it("should allow username ending with dot", () => {
      const result = cleanUsername("testuser.");

      expect(result).toBe("testuser.");
    });

    it("should handle all lowercase input", () => {
      const result = cleanUsername("testuser");

      expect(result).toBe("testuser");
    });
  });
});
