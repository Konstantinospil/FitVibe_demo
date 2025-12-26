import type { Request, Response } from "express";
import * as translationsController from "../../../../apps/backend/src/modules/translations/translations.controller.js";
import * as translationsService from "../../../../apps/backend/src/modules/translations/translations.service.js";

jest.mock("../../../../apps/backend/src/modules/translations/translations.service.js");

const mockService = jest.mocked(translationsService);

describe("Translations Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { sub: "admin-1" },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it("returns language translations for namespace", async () => {
    mockRequest.params = { language: "en" };
    mockRequest.query = { namespace: "auth" };
    mockService.getLanguageTranslations.mockResolvedValue({ auth: { signIn: "Sign in" } });

    await translationsController.getTranslations(mockRequest as Request, mockResponse as Response);

    expect(mockService.getLanguageTranslations).toHaveBeenCalledWith("en", "auth");
    expect(mockResponse.json).toHaveBeenCalledWith({ auth: { signIn: "Sign in" } });
  });

  it("returns merged translations when namespace is omitted", async () => {
    mockRequest.params = { language: "en" };
    mockService.getAllTranslationsForLanguage.mockResolvedValue({ hello: "Hello" });

    await translationsController.getTranslations(mockRequest as Request, mockResponse as Response);

    expect(mockService.getAllTranslationsForLanguage).toHaveBeenCalledWith("en");
    expect(mockResponse.json).toHaveBeenCalledWith({ hello: "Hello" });
  });

  it("decodes keyPath before updating", async () => {
    mockRequest.params = {
      language: "en",
      namespace: "common",
      keyPath: "errors%2Erequired",
    };
    mockRequest.body = { value: "Required" };
    mockService.updateTranslationService.mockResolvedValue({
      id: "t-1",
      namespace: "common",
      key_path: "errors.required",
      language: "en",
      value: "Required",
      created_at: "2024-06-10T10:00:00.000Z",
      updated_at: "2024-06-10T10:00:00.000Z",
      deleted_at: null,
      created_by: "admin-1",
      updated_by: "admin-1",
    });

    await translationsController.updateTranslation(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockService.updateTranslationService).toHaveBeenCalledWith(
      "en",
      "common",
      "errors.required",
      { value: "Required" },
      "admin-1",
    );
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("sends 204 on delete", async () => {
    mockRequest.params = {
      language: "en",
      namespace: "common",
      keyPath: "errors%2EnotFound",
    };

    await translationsController.deleteTranslation(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockService.deleteTranslationService).toHaveBeenCalledWith(
      "en",
      "common",
      "errors.notFound",
    );
    expect(mockResponse.status).toHaveBeenCalledWith(204);
    expect(mockResponse.send).toHaveBeenCalled();
  });
});
