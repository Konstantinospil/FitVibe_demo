import bcrypt from "bcryptjs";
import { login } from "../auth.service.js";
import * as authRepository from "../auth.repository.js";
import * as bruteforceRepository from "../bruteforce.repository.js";
import type { AuthUserRecord } from "../auth.repository.js";

describe("Q-11 login enumeration protections", () => {
  const findUserByEmailSpy = jest.spyOn(authRepository, "findUserByEmail");
  const compareSpy = jest.spyOn(bcrypt, "compare") as unknown as jest.SpyInstance<
    Promise<boolean>,
    [string | Buffer, string]
  >;
  const getFailedAttemptSpy = jest.spyOn(bruteforceRepository, "getFailedAttempt");
  const recordFailedAttemptSpy = jest.spyOn(bruteforceRepository, "recordFailedAttempt");

  beforeEach(() => {
    jest.clearAllMocks();
    compareSpy.mockResolvedValue(false);
    // Mock bruteforce repository functions
    getFailedAttemptSpy.mockResolvedValue(null);
    recordFailedAttemptSpy.mockResolvedValue({
      id: "attempt-123",
      identifier: "test@example.com",
      ip_address: "127.0.0.1",
      user_agent: null,
      attempt_count: 1,
      locked_until: null,
      last_attempt_at: new Date().toISOString(),
      first_attempt_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it("performs a dummy password comparison when the user does not exist", async () => {
    findUserByEmailSpy.mockResolvedValue(undefined);

    await expect(
      login({ email: "missing@fitvibe.test", password: "Secret123" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTH_INVALID_CREDENTIALS",
    });

    expect(compareSpy).toHaveBeenCalledWith("Secret123", expect.any(String));
    expect(compareSpy).toHaveBeenCalledTimes(1);
  });

  it("performs a dummy comparison when the account is not active", async () => {
    const inactiveUser: AuthUserRecord = {
      id: "user-inactive",
      username: "inactive",
      display_name: "Inactive",
      locale: "en-US",
      preferred_lang: "en",
      status: "pending_verification",
      role_code: "athlete",
      password_hash: "$2a$10$123456789012345678901uWXyzabcdefghijklmnopqrstuv",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      primary_email: "inactive@fitvibe.test",
      email_verified: false,
    };
    findUserByEmailSpy.mockResolvedValue(inactiveUser);

    await expect(
      login({ email: "inactive@fitvibe.test", password: "Secret123" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTH_INVALID_CREDENTIALS",
    });

    expect(compareSpy).toHaveBeenCalledWith("Secret123", expect.any(String));
    expect(compareSpy).toHaveBeenCalledTimes(1);
  });
});
