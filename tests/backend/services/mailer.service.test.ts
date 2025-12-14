import { MailerService, mailerService } from "../../../apps/backend/src/services/mailer.service.js";
import { env } from "../../../apps/backend/src/config/env.js";
import { logger } from "../../../apps/backend/src/config/logger.js";
import nodemailer from "nodemailer";

// Mock dependencies
jest.mock("nodemailer");
jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    email: {
      enabled: true,
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "user@example.com",
        pass: "password",
      },
      from: {
        name: "FitVibe",
        email: "noreply@fitvibe.com",
      },
    },
  },
}));

jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockNodemailer = jest.mocked(nodemailer);
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("Mailer Service", () => {
  let mockTransporter: {
    sendMail: jest.Mock;
    verify: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    };

    mockNodemailer.createTransport.mockReturnValue(mockTransporter as never);
  });

  describe("Constructor", () => {
    it("should initialize transporter when email is enabled", () => {
      const service = new MailerService();

      expect(mockNodemailer.createTransport).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("[mailer] SMTP transporter initialized");
    });

    it("should not initialize transporter when email is disabled", () => {
      const originalEnabled = env.email.enabled;
      (env.email as { enabled: boolean }).enabled = false;

      try {
        const service = new MailerService();
        expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
      } finally {
        (env.email as { enabled: boolean }).enabled = originalEnabled;
      }
    });
  });

  describe("send", () => {
    it("should skip sending when email is disabled", async () => {
      const originalEnabled = env.email.enabled;
      (env.email as { enabled: boolean }).enabled = false;

      try {
        const service = new MailerService();
        await service.send({
          to: "test@example.com",
          subject: "Test",
          text: "Test message",
        });

        expect(mockLogger.debug).toHaveBeenCalledWith(
          { to: "test@example.com", subject: "Test" },
          "[mailer] Email disabled, skipping send",
        );
        expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      } finally {
        (env.email as { enabled: boolean }).enabled = originalEnabled;
      }
    });

    it("should throw error when transporter is not initialized", async () => {
      const service = new MailerService();
      // Manually set transporter to null to simulate initialization failure
      (service as { transporter: unknown }).transporter = null;

      await expect(
        service.send({
          to: "test@example.com",
          subject: "Test",
          text: "Test message",
        }),
      ).rejects.toThrow("EMAIL_SERVICE_UNAVAILABLE");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "[mailer] Transporter not initialized, cannot send email",
      );
    });

    it("should send email successfully", async () => {
      const service = new MailerService();
      mockTransporter.sendMail.mockResolvedValue({
        messageId: "test-message-id",
      });

      await service.send({
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test message",
        html: "<p>Test message</p>",
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "FitVibe <noreply@fitvibe.com>",
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test message",
        html: "<p>Test message</p>",
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          messageId: "test-message-id",
          to: "test@example.com",
          subject: "Test Subject",
        },
        "[mailer] Email sent successfully",
      );
    });

    it("should handle send error", async () => {
      const service = new MailerService();
      const error = new Error("SMTP error");
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.send({
          to: "test@example.com",
          subject: "Test",
          text: "Test message",
        }),
      ).rejects.toThrow("SMTP error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          err: error,
          to: "test@example.com",
          subject: "Test",
        },
        "[mailer] Failed to send email",
      );
    });

    it("should handle missing messageId in response", async () => {
      const service = new MailerService();
      mockTransporter.sendMail.mockResolvedValue({});

      await service.send({
        to: "test@example.com",
        subject: "Test",
        text: "Test message",
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          messageId: null,
          to: "test@example.com",
          subject: "Test",
        },
        "[mailer] Email sent successfully",
      );
    });
  });

  describe("verify", () => {
    it("should return false when transporter is not initialized", async () => {
      const service = new MailerService();
      (service as { transporter: unknown }).transporter = null;

      const result = await service.verify();

      expect(result).toBe(false);
      expect(mockTransporter.verify).not.toHaveBeenCalled();
    });

    it("should return true when verification succeeds", async () => {
      const service = new MailerService();
      mockTransporter.verify.mockResolvedValue(undefined);

      const result = await service.verify();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("[mailer] SMTP connection verified");
    });

    it("should return false when verification fails", async () => {
      const service = new MailerService();
      const error = new Error("Verification failed");
      mockTransporter.verify.mockRejectedValue(error);

      const result = await service.verify();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error },
        "[mailer] SMTP verification failed",
      );
    });
  });

  describe("mailerService singleton", () => {
    it("should export a singleton instance", () => {
      expect(mailerService).toBeInstanceOf(MailerService);
    });
  });
});
