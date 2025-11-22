/**
 * Unit tests for mailer service
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import nodemailer from "nodemailer";
import { MailerService, mailerService } from "../mailer.service.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

// Mock dependencies
jest.mock("../../config/env.js", () => ({
  env: {
    email: {
      enabled: true,
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "test@example.com",
        pass: "password123",
      },
      from: {
        name: "FitVibe",
        email: "noreply@fitvibe.com",
      },
    },
  },
}));

jest.mock("../../config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
    verify: jest.fn(),
  })),
}));

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

    jest.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as never);
  });

  describe("MailerService constructor", () => {
    it("should initialize transporter when email is enabled", () => {
      jest.mocked(env).email.enabled = true;
      new MailerService();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: env.email.smtp.host,
        port: env.email.smtp.port,
        secure: env.email.smtp.secure,
        auth: {
          user: env.email.smtp.user,
          pass: env.email.smtp.pass,
        },
      });
    });

    it("should not initialize transporter when email is disabled", () => {
      jest.mocked(env).email.enabled = false;
      new MailerService();

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  describe("send", () => {
    it("should send email successfully", async () => {
      jest.mocked(env).email.enabled = true;
      const service = new MailerService();

      mockTransporter.sendMail.mockResolvedValue({
        messageId: "test-message-id",
      });

      const message = {
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
        text: "Test content",
      };

      await service.send(message);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: `${env.email.from.name} <${env.email.from.email}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: "test-message-id",
          to: message.to,
          subject: message.subject,
        }),
        "[mailer] Email sent successfully",
      );
    });

    it("should skip sending when email is disabled", async () => {
      jest.mocked(env).email.enabled = false;
      const service = new MailerService();

      const message = {
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      await service.send(message);

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          to: message.to,
          subject: message.subject,
        }),
        "[mailer] Email disabled, skipping send",
      );
    });

    it("should throw error if transporter not initialized", async () => {
      jest.mocked(env).email.enabled = true;
      const service = new MailerService();
      // @ts-expect-error - Force transporter to null for testing
      service.transporter = null;

      const message = {
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      await expect(service.send(message)).rejects.toThrow("EMAIL_SERVICE_UNAVAILABLE");

      expect(logger.error).toHaveBeenCalledWith(
        "[mailer] Transporter not initialized, cannot send email",
      );
    });

    it("should handle sendMail errors", async () => {
      jest.mocked(env).email.enabled = true;
      const service = new MailerService();

      const error = new Error("SMTP connection failed");
      mockTransporter.sendMail.mockRejectedValue(error);

      const message = {
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      await expect(service.send(message)).rejects.toThrow("SMTP connection failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: error,
          to: message.to,
          subject: message.subject,
        }),
        "[mailer] Failed to send email",
      );
    });

    it("should handle missing messageId in response", async () => {
      jest.mocked(env).email.enabled = true;
      const service = new MailerService();

      mockTransporter.sendMail.mockResolvedValue({});

      const message = {
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      await service.send(message);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: null,
          to: message.to,
          subject: message.subject,
        }),
        "[mailer] Email sent successfully",
      );
    });
  });

  describe("verify", () => {
    it("should verify SMTP connection successfully", async () => {
      jest.mocked(env).email.enabled = true;
      const service = new MailerService();

      mockTransporter.verify.mockResolvedValue(true);

      const result = await service.verify();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[mailer] SMTP connection verified");
    });

    it("should return false if transporter not initialized", async () => {
      jest.mocked(env).email.enabled = true;
      const service = new MailerService();
      // @ts-expect-error - Force transporter to null for testing
      service.transporter = null;

      const result = await service.verify();

      expect(result).toBe(false);
      expect(mockTransporter.verify).not.toHaveBeenCalled();
    });

    it("should return false if verification fails", async () => {
      jest.mocked(env).email.enabled = true;
      const service = new MailerService();

      const error = new Error("Connection failed");
      mockTransporter.verify.mockRejectedValue(error);

      const result = await service.verify();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        { err: error },
        "[mailer] SMTP verification failed",
      );
    });
  });

  describe("singleton instance", () => {
    it("should export singleton instance", () => {
      expect(mailerService).toBeInstanceOf(MailerService);
    });
  });
});
