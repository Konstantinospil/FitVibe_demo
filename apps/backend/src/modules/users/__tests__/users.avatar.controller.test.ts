import type { Request, Response } from "express";
import {
  uploadAvatarHandler,
  getAvatarHandler,
  deleteAvatarHandler,
} from "../users.avatar.controller";
import * as repository from "../users.avatar.repository";
import * as mediaStorage from "../../../services/mediaStorage.service";
import * as antivirus from "../../../services/antivirus.service";
import * as auditUtil from "../../common/audit.util";
import type { JwtPayload } from "../../auth/auth.types.js";
import type { ScanResult } from "../../../services/antivirus.service.js";

// AvatarMeta type (not exported from repository)
interface AvatarMeta {
  id: string;
  owner_id: string;
  target_type: string;
  target_id: string;
  storage_key: string;
  file_url: string;
  mime_type: string | null;
  media_type: string | null;
  bytes: number | null;
  created_at: string;
  updated_at: string | null;
}

// Mock dependencies
jest.mock("../users.avatar.repository");
jest.mock("../../../services/mediaStorage.service");
jest.mock("../../../services/antivirus.service");
jest.mock("../../common/audit.util");
jest.mock("sharp");

// Import sharp after mocking
import sharp from "sharp";

// Helper functions
function createMockJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: "user-123",
    role: "user",
    sid: "session-123",
    ...overrides,
  };
}

function createMockAvatarMeta(overrides: Partial<AvatarMeta> = {}): AvatarMeta {
  return {
    id: "media-123",
    owner_id: "user-123",
    target_type: "user_avatar",
    target_id: "user-123",
    storage_key: "avatars/user-123/avatar.png",
    file_url: "https://storage.example.com/avatars/user-123/avatar.png",
    mime_type: "image/png",
    media_type: null,
    bytes: 1024,
    created_at: new Date().toISOString(),
    updated_at: null,
    ...overrides,
  };
}

function createMockScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    isInfected: false,
    viruses: [],
    scannedAt: new Date(),
    ...overrides,
  };
}

describe("users.avatar.controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;
  let setMock: jest.Mock;

  // Mock sharp chain
  const mockToBuffer = jest.fn();
  const mockPng = jest.fn(() => ({ toBuffer: mockToBuffer }));
  const mockResize = jest.fn(() => ({ png: mockPng }));
  const mockRotate = jest.fn(() => ({ resize: mockResize }));
  const mockSharp = sharp as unknown as jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    sendMock = jest.fn();
    setMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock } as never);

    mockRequest = {
      user: createMockJwtPayload(),
      params: {},
      file: undefined,
      get: jest.fn().mockReturnValue(null), // For idempotency key header
      method: "POST",
      baseUrl: "/api/v1",
      route: { path: "/users/avatar" },
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
      set: setMock,
    };

    // Reset sharp mock chain
    mockSharp.mockReturnValue({ rotate: mockRotate });
    mockToBuffer.mockResolvedValue(Buffer.from("processed-image"));

    jest.clearAllMocks();
  });

  describe("uploadAvatarHandler", () => {
    it("should upload a valid PNG avatar successfully", async () => {
      const mockFile = {
        buffer: Buffer.from("fake-image"),
        originalname: "avatar.png",
        mimetype: "image/png",
        size: 1024 * 1024, // 1MB
      };
      mockRequest.file = mockFile as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(createMockScanResult());

      jest.mocked(mediaStorage.saveUserAvatarFile).mockResolvedValue({
        storageKey: "avatars/user-123/avatar.png",
        bytes: 2048,
      });

      jest.mocked(repository.saveUserAvatarMetadata).mockResolvedValue({
        previousKey: null,
        record: createMockAvatarMeta({
          id: "media-123",
          created_at: new Date("2024-01-01").toISOString(),
        }),
      });

      jest.mocked(auditUtil.insertAudit).mockResolvedValue(undefined);

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(antivirus.scanBuffer).toHaveBeenCalledWith(mockFile.buffer, mockFile.originalname);
      expect(mockSharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockRotate).toHaveBeenCalled();
      expect(mockResize).toHaveBeenCalledWith(256, 256, { fit: "cover" });
      expect(mockPng).toHaveBeenCalledWith({ quality: 80 });
      expect(mediaStorage.saveUserAvatarFile).toHaveBeenCalledWith(
        "user-123",
        expect.any(Buffer),
        "image/png",
      );
      expect(repository.saveUserAvatarMetadata).toHaveBeenCalledWith("user-123", {
        storageKey: "avatars/user-123/avatar.png",
        fileUrl: "/users/avatar/user-123",
        mimeType: "image/png",
        bytes: 2048,
      });
      expect(auditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "user_media",
        action: "avatar_upload",
        entityId: "media-123",
        metadata: { size: 2048, mime: "image/png" },
      });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        fileUrl: "/users/avatar/user-123",
        bytes: 2048,
        mimeType: "image/png",
        updatedAt: new Date("2024-01-01").toISOString(),
        preview: expect.stringMatching(/^data:image\/png;base64,/),
      });
    });

    it("should upload a valid JPEG avatar successfully", async () => {
      const mockFile = {
        buffer: Buffer.from("fake-jpeg"),
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        size: 2 * 1024 * 1024, // 2MB
      };
      mockRequest.file = mockFile as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(createMockScanResult());
      jest.mocked(mediaStorage.saveUserAvatarFile).mockResolvedValue({
        storageKey: "avatars/user-123/avatar.png",
        bytes: 3000,
      });
      jest.mocked(repository.saveUserAvatarMetadata).mockResolvedValue({
        previousKey: null,
        record: createMockAvatarMeta({
          id: "media-456",
          created_at: new Date().toISOString(),
        }),
      });

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should upload a valid WebP avatar successfully", async () => {
      const mockFile = {
        buffer: Buffer.from("fake-webp"),
        originalname: "image.webp",
        mimetype: "image/webp",
        size: 500 * 1024, // 500KB
      };
      mockRequest.file = mockFile as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(createMockScanResult());
      jest.mocked(mediaStorage.saveUserAvatarFile).mockResolvedValue({
        storageKey: "avatars/user-123/avatar.png",
        bytes: 1500,
      });
      jest.mocked(repository.saveUserAvatarMetadata).mockResolvedValue({
        previousKey: null,
        record: createMockAvatarMeta({
          id: "media-789",
          created_at: new Date().toISOString(),
        }),
      });

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should replace previous avatar when uploading new one", async () => {
      const mockFile = {
        buffer: Buffer.from("new-avatar"),
        originalname: "new.png",
        mimetype: "image/png",
        size: 1024,
      };
      mockRequest.file = mockFile as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(createMockScanResult());
      jest.mocked(mediaStorage.saveUserAvatarFile).mockResolvedValue({
        storageKey: "avatars/user-123/new-avatar.png",
        bytes: 2000,
      });
      jest.mocked(repository.saveUserAvatarMetadata).mockResolvedValue({
        previousKey: "avatars/user-123/old-avatar.png",
        record: createMockAvatarMeta({
          id: "media-new",
          created_at: new Date().toISOString(),
        }),
      });
      jest.mocked(mediaStorage.deleteStorageObject).mockResolvedValue(undefined);

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(mediaStorage.deleteStorageObject).toHaveBeenCalledWith(
        "avatars/user-123/old-avatar.png",
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should continue if deleting previous avatar fails", async () => {
      const mockFile = {
        buffer: Buffer.from("new-avatar"),
        originalname: "new.png",
        mimetype: "image/png",
        size: 1024,
      };
      mockRequest.file = mockFile as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(createMockScanResult());
      jest.mocked(mediaStorage.saveUserAvatarFile).mockResolvedValue({
        storageKey: "avatars/user-123/new-avatar.png",
        bytes: 2000,
      });
      jest.mocked(repository.saveUserAvatarMetadata).mockResolvedValue({
        previousKey: "avatars/user-123/old-avatar.png",
        record: createMockAvatarMeta({
          id: "media-new",
          created_at: new Date().toISOString(),
        }),
      });
      jest.mocked(mediaStorage.deleteStorageObject).mockRejectedValue(new Error("Delete failed"));

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      // Should not throw and still return success
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should return 400 when no file is provided", async () => {
      mockRequest.file = undefined;

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "UPLOAD_NO_FILE" });
    });

    it("should return 400 for unsupported MIME type (GIF)", async () => {
      mockRequest.file = {
        buffer: Buffer.from("fake-gif"),
        originalname: "animation.gif",
        mimetype: "image/gif",
        size: 1024,
      } as Express.Multer.File;

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "UPLOAD_UNSUPPORTED_TYPE" });
    });

    it("should return 400 for unsupported MIME type (SVG)", async () => {
      mockRequest.file = {
        buffer: Buffer.from("fake-svg"),
        originalname: "icon.svg",
        mimetype: "image/svg+xml",
        size: 1024,
      } as Express.Multer.File;

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "UPLOAD_UNSUPPORTED_TYPE" });
    });

    it("should return 400 when file size exceeds 5MB limit", async () => {
      mockRequest.file = {
        buffer: Buffer.from("huge-file"),
        originalname: "large.png",
        mimetype: "image/png",
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "UPLOAD_TOO_LARGE" });
    });

    it("should accept file at exactly 5MB limit", async () => {
      mockRequest.file = {
        buffer: Buffer.from("max-size-file"),
        originalname: "max.png",
        mimetype: "image/png",
        size: 5 * 1024 * 1024, // Exactly 5MB
      } as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(createMockScanResult());
      jest.mocked(mediaStorage.saveUserAvatarFile).mockResolvedValue({
        storageKey: "avatars/user-123/avatar.png",
        bytes: 2000,
      });
      jest.mocked(repository.saveUserAvatarMetadata).mockResolvedValue({
        previousKey: null,
        record: createMockAvatarMeta({
          id: "media-max",
          created_at: new Date().toISOString(),
        }),
      });

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should reject file when malware is detected", async () => {
      mockRequest.file = {
        buffer: Buffer.from("infected-file"),
        originalname: "virus.png",
        mimetype: "image/png",
        size: 1024,
      } as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(
        createMockScanResult({
          isInfected: true,
          viruses: ["EICAR-Test-File", "Win32.Trojan"],
        }),
      );

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(auditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "user_media",
        action: "avatar_upload_rejected",
        entityId: "user-123",
        metadata: {
          reason: "malware_detected",
          viruses: ["EICAR-Test-File", "Win32.Trojan"],
          filename: "virus.png",
          size: 1024,
        },
      });
      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "E.UPLOAD.MALWARE_DETECTED",
          message: "UPLOAD_MALWARE_DETECTED",
          details: {
            reason: "malware_detected",
          },
        },
      });
      expect(mediaStorage.saveUserAvatarFile).not.toHaveBeenCalled();
    });

    it("should reject file when single virus is detected", async () => {
      mockRequest.file = {
        buffer: Buffer.from("infected"),
        originalname: "bad.jpg",
        mimetype: "image/jpeg",
        size: 2048,
      } as Express.Multer.File;

      jest.mocked(antivirus.scanBuffer).mockResolvedValue(
        createMockScanResult({
          isInfected: true,
          viruses: ["Malware.Generic"],
        }),
      );

      await uploadAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "E.UPLOAD.MALWARE_DETECTED",
          }),
        }),
      );
    });
  });

  describe("getAvatarHandler", () => {
    it("should return avatar image with correct headers", async () => {
      mockRequest.params = { id: "user-456" };

      jest.mocked(repository.getUserAvatarMetadata).mockResolvedValue(
        createMockAvatarMeta({
          id: "media-123",
          storage_key: "avatars/user-456/avatar.png",
          mime_type: "image/png",
        }),
      );

      const mockImageBuffer = Buffer.from("image-data");
      jest.mocked(mediaStorage.readStorageObject).mockResolvedValue(mockImageBuffer);

      await getAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(repository.getUserAvatarMetadata).toHaveBeenCalledWith("user-456");
      expect(mediaStorage.readStorageObject).toHaveBeenCalledWith("avatars/user-456/avatar.png");
      expect(setMock).toHaveBeenCalledWith("Content-Type", "image/png");
      expect(setMock).toHaveBeenCalledWith("Cache-Control", "private, max-age=300");
      expect(sendMock).toHaveBeenCalledWith(mockImageBuffer);
    });

    it("should return avatar with JPEG mime type", async () => {
      mockRequest.params = { id: "user-789" };

      jest.mocked(repository.getUserAvatarMetadata).mockResolvedValue(
        createMockAvatarMeta({
          id: "media-456",
          storage_key: "avatars/user-789/avatar.jpg",
          mime_type: "image/jpeg",
        }),
      );

      const mockImageBuffer = Buffer.from("jpeg-data");
      jest.mocked(mediaStorage.readStorageObject).mockResolvedValue(mockImageBuffer);

      await getAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(setMock).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    });

    it("should default to image/png when mime_type is null", async () => {
      mockRequest.params = { id: "user-999" };

      jest.mocked(repository.getUserAvatarMetadata).mockResolvedValue(
        createMockAvatarMeta({
          id: "media-old",
          storage_key: "avatars/user-999/avatar.png",
          mime_type: null,
        }),
      );

      const mockImageBuffer = Buffer.from("old-image");
      jest.mocked(mediaStorage.readStorageObject).mockResolvedValue(mockImageBuffer);

      await getAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(setMock).toHaveBeenCalledWith("Content-Type", "image/png");
    });

    it("should return 404 when no metadata is found", async () => {
      mockRequest.params = { id: "nonexistent-user" };

      jest.mocked(repository.getUserAvatarMetadata).mockResolvedValue(null);

      await getAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(sendMock).toHaveBeenCalledWith("UPLOAD_NOT_FOUND");
      expect(mediaStorage.readStorageObject).not.toHaveBeenCalled();
    });

    it("should return 404 when storage read fails", async () => {
      mockRequest.params = { id: "user-404" };

      jest.mocked(repository.getUserAvatarMetadata).mockResolvedValue(
        createMockAvatarMeta({
          id: "media-missing",
          storage_key: "avatars/user-404/missing.png",
          mime_type: "image/png",
        }),
      );

      jest
        .mocked(mediaStorage.readStorageObject)
        .mockRejectedValue(new Error("File not found in storage"));

      await getAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(sendMock).toHaveBeenCalledWith("UPLOAD_NOT_FOUND");
    });
  });

  describe("deleteAvatarHandler", () => {
    it("should delete avatar metadata and file", async () => {
      mockRequest.user = createMockJwtPayload();

      jest.mocked(repository.deleteUserAvatarMetadata).mockResolvedValue(
        createMockAvatarMeta({
          id: "media-123",
          storage_key: "avatars/user-123/avatar.png",
        }),
      );

      jest.mocked(mediaStorage.deleteStorageObject).mockResolvedValue(undefined);

      await deleteAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(repository.deleteUserAvatarMetadata).toHaveBeenCalledWith("user-123");
      expect(mediaStorage.deleteStorageObject).toHaveBeenCalledWith("avatars/user-123/avatar.png");
      expect(auditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "user_media",
        action: "avatar_delete",
        entityId: "media-123",
      });
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it("should delete metadata when no storage_key exists", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "user-456" });

      // Test case where avatar exists but storage_key is empty (edge case)
      jest.mocked(repository.deleteUserAvatarMetadata).mockResolvedValue(
        createMockAvatarMeta({
          id: "media-456",
          storage_key: "", // Empty string instead of null
        }),
      );

      await deleteAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(mediaStorage.deleteStorageObject).not.toHaveBeenCalled();
      expect(auditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-456",
        entity: "user_media",
        action: "avatar_delete",
        entityId: "media-456",
      });
      expect(statusMock).toHaveBeenCalledWith(204);
    });

    it("should continue when no metadata exists to delete", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "user-789" });

      jest.mocked(repository.deleteUserAvatarMetadata).mockResolvedValue(null);

      await deleteAvatarHandler(mockRequest as Request, mockResponse as Response);

      expect(mediaStorage.deleteStorageObject).not.toHaveBeenCalled();
      expect(auditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-789",
        entity: "user_media",
        action: "avatar_delete",
        entityId: "user-789",
      });
      expect(statusMock).toHaveBeenCalledWith(204);
    });

    it("should continue when storage deletion fails", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "user-error" });

      jest.mocked(repository.deleteUserAvatarMetadata).mockResolvedValue(
        createMockAvatarMeta({
          id: "media-error",
          storage_key: "avatars/user-error/avatar.png",
        }),
      );

      jest
        .mocked(mediaStorage.deleteStorageObject)
        .mockRejectedValue(new Error("Storage delete failed"));

      await deleteAvatarHandler(mockRequest as Request, mockResponse as Response);

      // Should not throw and still complete successfully
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(auditUtil.insertAudit).toHaveBeenCalled();
    });
  });
});
