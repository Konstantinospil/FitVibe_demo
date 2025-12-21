import type { Request, Response } from "express";
import {
  listTypes,
  getType,
  createType,
  updateType,
  deleteType,
} from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.controller.js";
import * as service from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.service.js";

// Mock the service
jest.mock("../../../../apps/backend/src/modules/exercise-types/exerciseTypes.service.js");

describe("exerciseTypes.controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { sub: "admin-123", role: "admin", sid: "session-123" },
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    jest.clearAllMocks();
  });

  describe("listTypes", () => {
    it("should return all exercise types without locale", async () => {
      const mockTypes = [
        { code: "strength", name: "Strength Training" },
        { code: "cardio", name: "Cardio" },
      ];
      (service.getAllTypes as jest.Mock).mockResolvedValue(mockTypes);

      await listTypes(mockRequest as Request, mockResponse as Response);

      expect(service.getAllTypes).toHaveBeenCalledWith(undefined);
      expect(jsonMock).toHaveBeenCalledWith(mockTypes);
    });

    it("should return all exercise types with locale", async () => {
      const mockTypes = [{ code: "strength", name: "Krafttraining" }];
      mockRequest.query = { locale: "de" };
      (service.getAllTypes as jest.Mock).mockResolvedValue(mockTypes);

      await listTypes(mockRequest as Request, mockResponse as Response);

      expect(service.getAllTypes).toHaveBeenCalledWith("de");
      expect(jsonMock).toHaveBeenCalledWith(mockTypes);
    });

    it("should handle empty results", async () => {
      (service.getAllTypes as jest.Mock).mockResolvedValue([]);

      await listTypes(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith([]);
    });
  });

  describe("getType", () => {
    it("should return a specific exercise type", async () => {
      const mockType = { code: "strength", name: "Strength Training" };
      mockRequest.params = { code: "strength" };
      (service.getOneType as jest.Mock).mockResolvedValue(mockType);

      await getType(mockRequest as Request, mockResponse as Response);

      expect(service.getOneType).toHaveBeenCalledWith("strength");
      expect(jsonMock).toHaveBeenCalledWith(mockType);
    });

    it("should return 404 when type not found", async () => {
      mockRequest.params = { code: "nonexistent" };
      (service.getOneType as jest.Mock).mockResolvedValue(null);

      await getType(mockRequest as Request, mockResponse as Response);

      expect(service.getOneType).toHaveBeenCalledWith("nonexistent");
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Not found" });
    });

    it("should handle different type codes", async () => {
      const mockType = { code: "flexibility", name: "Flexibility" };
      mockRequest.params = { code: "flexibility" };
      (service.getOneType as jest.Mock).mockResolvedValue(mockType);

      await getType(mockRequest as Request, mockResponse as Response);

      expect(service.getOneType).toHaveBeenCalledWith("flexibility");
      expect(jsonMock).toHaveBeenCalledWith(mockType);
    });
  });

  describe("createType", () => {
    it("should create a new exercise type", async () => {
      const newType = { code: "hiit", name: "High Intensity Interval Training" };
      const createdType = { ...newType, id: "123" };
      mockRequest.body = newType;
      (service.addType as jest.Mock).mockResolvedValue(createdType);

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).toHaveBeenCalledWith(newType, "admin-123");
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(createdType);
    });

    it("should create type with description", async () => {
      const newType = {
        code: "yoga",
        name: "Yoga",
        description: "Mind-body practice",
      };
      const createdType = { ...newType, id: "456" };
      mockRequest.body = newType;
      (service.addType as jest.Mock).mockResolvedValue(createdType);

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).toHaveBeenCalledWith(newType, "admin-123");
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(createdType);
    });

    it("should return 400 for invalid code (too short)", async () => {
      mockRequest.body = { code: "a", name: "Invalid Type" };

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);

      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg).toHaveProperty("error");
    });

    it("should return 400 for invalid code (too long)", async () => {
      mockRequest.body = {
        code: "a".repeat(31),
        name: "Invalid Type",
      };

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 for invalid name (too short)", async () => {
      mockRequest.body = { code: "test", name: "ab" };

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 for invalid name (too long)", async () => {
      mockRequest.body = {
        code: "test",
        name: "a".repeat(101),
      };

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 for missing required fields", async () => {
      mockRequest.body = { code: "test" }; // missing name

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 for description too long", async () => {
      mockRequest.body = {
        code: "test",
        name: "Test Type",
        description: "a".repeat(256),
      };

      await createType(mockRequest as Request, mockResponse as Response);

      expect(service.addType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe("updateType", () => {
    it("should update exercise type name", async () => {
      const updatedType = { code: "strength", name: "Updated Strength" };
      mockRequest.params = { code: "strength" };
      mockRequest.body = { name: "Updated Strength" };
      (service.editType as jest.Mock).mockResolvedValue(updatedType);

      await updateType(mockRequest as Request, mockResponse as Response);

      expect(service.editType).toHaveBeenCalledWith(
        "strength",
        { name: "Updated Strength" },
        "admin-123",
      );
      expect(jsonMock).toHaveBeenCalledWith(updatedType);
    });

    it("should update exercise type description", async () => {
      const updatedType = {
        code: "cardio",
        name: "Cardio",
        description: "New description",
      };
      mockRequest.params = { code: "cardio" };
      mockRequest.body = { description: "New description" };
      (service.editType as jest.Mock).mockResolvedValue(updatedType);

      await updateType(mockRequest as Request, mockResponse as Response);

      expect(service.editType).toHaveBeenCalledWith(
        "cardio",
        { description: "New description" },
        "admin-123",
      );
      expect(jsonMock).toHaveBeenCalledWith(updatedType);
    });

    it("should update both name and description", async () => {
      const updatedType = {
        code: "yoga",
        name: "Yoga Practice",
        description: "Mindfulness and flexibility",
      };
      mockRequest.params = { code: "yoga" };
      mockRequest.body = {
        name: "Yoga Practice",
        description: "Mindfulness and flexibility",
      };
      (service.editType as jest.Mock).mockResolvedValue(updatedType);

      await updateType(mockRequest as Request, mockResponse as Response);

      expect(service.editType).toHaveBeenCalledWith(
        "yoga",
        { name: "Yoga Practice", description: "Mindfulness and flexibility" },
        "admin-123",
      );
      expect(jsonMock).toHaveBeenCalledWith(updatedType);
    });

    it("should return 400 for invalid name", async () => {
      mockRequest.params = { code: "test" };
      mockRequest.body = { name: "ab" }; // too short

      await updateType(mockRequest as Request, mockResponse as Response);

      expect(service.editType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 for invalid description", async () => {
      mockRequest.params = { code: "test" };
      mockRequest.body = { description: "a".repeat(256) }; // too long

      await updateType(mockRequest as Request, mockResponse as Response);

      expect(service.editType).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should handle empty update body", async () => {
      const updatedType = { code: "strength", name: "Strength" };
      mockRequest.params = { code: "strength" };
      mockRequest.body = {};
      (service.editType as jest.Mock).mockResolvedValue(updatedType);

      await updateType(mockRequest as Request, mockResponse as Response);

      expect(service.editType).toHaveBeenCalledWith("strength", {}, "admin-123");
      expect(jsonMock).toHaveBeenCalledWith(updatedType);
    });
  });

  describe("deleteType", () => {
    it("should delete an exercise type", async () => {
      mockRequest.params = { code: "obsolete" };
      (service.removeType as jest.Mock).mockResolvedValue(1);

      await deleteType(mockRequest as Request, mockResponse as Response);

      expect(service.removeType).toHaveBeenCalledWith("obsolete", "admin-123");
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it("should handle deletion of different types", async () => {
      mockRequest.params = { code: "deprecated" };
      (service.removeType as jest.Mock).mockResolvedValue(1);

      await deleteType(mockRequest as Request, mockResponse as Response);

      expect(service.removeType).toHaveBeenCalledWith("deprecated", "admin-123");
      expect(statusMock).toHaveBeenCalledWith(204);
    });

    it("should pass admin ID to service", async () => {
      mockRequest.params = { code: "test" };
      mockRequest.user = { sub: "different-admin-456", role: "admin", sid: "session-456" };
      (service.removeType as jest.Mock).mockResolvedValue(1);

      await deleteType(mockRequest as Request, mockResponse as Response);

      expect(service.removeType).toHaveBeenCalledWith("test", "different-admin-456");
    });
  });
});
