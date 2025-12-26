import type { Request, Response } from "express";
import * as consentController from "../../../../apps/backend/src/modules/consent/consent.controller.js";
import * as consentService from "../../../../apps/backend/src/modules/consent/consent.service.js";
import { extractClientIp } from "../../../../apps/backend/src/utils/ip-extractor.js";

jest.mock("../../../../apps/backend/src/modules/consent/consent.service.js");
jest.mock("../../../../apps/backend/src/utils/ip-extractor.js", () => ({
  extractClientIp: jest.fn(),
}));

const mockService = jest.mocked(consentService);
const mockExtractClientIp = jest.mocked(extractClientIp);

describe("Consent Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("getCookieStatusHandler", () => {
    it("returns no consent when IP is unknown", async () => {
      mockExtractClientIp.mockReturnValue("unknown");

      await consentController.getCookieStatusHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.getConsentStatus).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { hasConsent: false },
      });
    });

    it("returns consent status for known IP", async () => {
      mockExtractClientIp.mockReturnValue("203.0.113.12");
      mockService.getConsentStatus.mockResolvedValue({
        hasConsent: true,
        consent: {
          essential: true,
          preferences: false,
          analytics: false,
          marketing: false,
          version: "2024-06-01",
          updatedAt: "2024-06-10T10:00:00.000Z",
        },
      });

      await consentController.getCookieStatusHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.getConsentStatus).toHaveBeenCalledWith("203.0.113.12");
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hasConsent: true,
          consent: {
            essential: true,
            preferences: false,
            analytics: false,
            marketing: false,
            version: "2024-06-01",
            updatedAt: "2024-06-10T10:00:00.000Z",
          },
        },
      });
    });
  });

  describe("saveCookiePreferencesHandler", () => {
    it("returns 400 when IP is unknown", async () => {
      mockExtractClientIp.mockReturnValue("unknown");

      await consentController.saveCookiePreferencesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.saveCookiePreferences).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "CONSENT_IP_UNKNOWN",
          message: "Unable to determine IP address",
        },
      });
    });

    it("saves preferences and maps response", async () => {
      mockExtractClientIp.mockReturnValue("203.0.113.13");
      mockRequest = {
        body: {
          essential: true,
          preferences: true,
          analytics: false,
          marketing: true,
        },
        headers: {
          "user-agent": "TestAgent",
        },
      };
      mockService.saveCookiePreferences.mockResolvedValue({
        id: "consent-3",
        ipAddress: "203.0.113.13",
        consentVersion: "2024-06-01",
        essentialCookies: true,
        preferencesCookies: true,
        analyticsCookies: false,
        marketingCookies: true,
        consentGivenAt: "2024-06-10T10:00:00.000Z",
        lastUpdatedAt: "2024-06-10T10:00:00.000Z",
        userAgent: "TestAgent",
        createdAt: "2024-06-10T10:00:00.000Z",
        updatedAt: "2024-06-10T10:00:00.000Z",
      });

      await consentController.saveCookiePreferencesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.saveCookiePreferences).toHaveBeenCalledWith(
        "203.0.113.13",
        mockRequest.body,
        "TestAgent",
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          essential: true,
          preferences: true,
          analytics: false,
          marketing: true,
          version: "2024-06-01",
          updatedAt: "2024-06-10T10:00:00.000Z",
        },
      });
    });
  });
});
