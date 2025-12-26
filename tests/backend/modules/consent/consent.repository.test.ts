import * as consentRepository from "../../../../apps/backend/src/modules/consent/consent.repository.js";

const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = []) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
  });
  return builder;
}

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  });

  return {
    db: mockDbFunction,
  };
});

describe("Consent Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("getConsentByIp", () => {
    it("returns mapped consent when row exists", async () => {
      const row = {
        id: "consent-1",
        ip_address: "203.0.113.1",
        consent_version: "2024-06-01",
        essential_cookies: true,
        preferences_cookies: false,
        analytics_cookies: true,
        marketing_cookies: false,
        consent_given_at: "2024-06-10T10:00:00.000Z",
        last_updated_at: "2024-06-10T10:00:00.000Z",
        user_agent: "UA",
        created_at: "2024-06-10T10:00:00.000Z",
        updated_at: "2024-06-10T10:00:00.000Z",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("cookie_consents");
      queryBuilders.cookie_consents.first.mockResolvedValue(row);

      const result = await consentRepository.getConsentByIp("203.0.113.1");

      expect(result).toEqual({
        id: "consent-1",
        ipAddress: "203.0.113.1",
        consentVersion: "2024-06-01",
        essentialCookies: true,
        preferencesCookies: false,
        analyticsCookies: true,
        marketingCookies: false,
        consentGivenAt: "2024-06-10T10:00:00.000Z",
        lastUpdatedAt: "2024-06-10T10:00:00.000Z",
        userAgent: "UA",
        createdAt: "2024-06-10T10:00:00.000Z",
        updatedAt: "2024-06-10T10:00:00.000Z",
      });
    });
  });

  describe("upsertConsent", () => {
    it("inserts and merges consent data", async () => {
      const row = {
        id: "consent-2",
        ip_address: "203.0.113.2",
        consent_version: "2024-06-01",
        essential_cookies: true,
        preferences_cookies: true,
        analytics_cookies: false,
        marketing_cookies: true,
        consent_given_at: "2024-06-10T10:00:00.000Z",
        last_updated_at: "2024-06-10T10:00:00.000Z",
        user_agent: "UA",
        created_at: "2024-06-10T10:00:00.000Z",
        updated_at: "2024-06-10T10:00:00.000Z",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("cookie_consents");
      queryBuilders.cookie_consents.returning.mockResolvedValue([row]);

      const result = await consentRepository.upsertConsent("203.0.113.2", {
        consentVersion: "2024-06-01",
        essentialCookies: true,
        preferencesCookies: true,
        analyticsCookies: false,
        marketingCookies: true,
        userAgent: "UA",
      });

      expect(queryBuilders.cookie_consents.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: "203.0.113.2",
          consent_version: "2024-06-01",
          essential_cookies: true,
          preferences_cookies: true,
          analytics_cookies: false,
          marketing_cookies: true,
          user_agent: "UA",
        }),
      );
      expect(queryBuilders.cookie_consents.merge).toHaveBeenCalledWith(
        expect.objectContaining({
          consent_version: "2024-06-01",
          essential_cookies: true,
          preferences_cookies: true,
          analytics_cookies: false,
          marketing_cookies: true,
          user_agent: "UA",
        }),
      );
      expect(result.id).toBe("consent-2");
    });
  });
});
