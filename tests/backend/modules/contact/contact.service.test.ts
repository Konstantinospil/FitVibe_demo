import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import * as contactService from "../../../../apps/backend/src/modules/contact/contact.service.js";
import * as contactRepository from "../../../../apps/backend/src/modules/contact/contact.repository.js";

jest.mock("../../../../apps/backend/src/modules/contact/contact.repository.js");

const mockRepository = jest.mocked(contactRepository);

describe("Contact Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitContactMessage", () => {
    it("rejects invalid email", async () => {
      await expect(
        contactService.submitContactMessage({
          userId: null,
          email: "invalid-email",
          topic: "Help",
          message: "Test",
        }),
      ).rejects.toBeInstanceOf(HttpError);

      expect(mockRepository.createContactMessage).not.toHaveBeenCalled();
    });

    it("sanitizes input before persisting", async () => {
      mockRepository.createContactMessage.mockResolvedValue({
        id: "msg-1",
        userId: null,
        email: "user@example.com",
        topic: "Topic",
        message: "Message",
        createdAt: "2024-06-10T10:00:00.000Z",
        readAt: null,
        readByUserId: null,
        respondedAt: null,
        response: null,
      });

      await contactService.submitContactMessage({
        userId: null,
        email: "  user@example.com ",
        topic: "  Topic  ",
        message: "  Message  ",
      });

      expect(mockRepository.createContactMessage).toHaveBeenCalledWith({
        userId: null,
        email: "user@example.com",
        topic: "Topic",
        message: "Message",
      });
    });
  });

  describe("getContactMessage", () => {
    it("throws when message is missing", async () => {
      mockRepository.getContactMessageById.mockResolvedValue(undefined);

      await expect(contactService.getContactMessage("missing")).rejects.toBeInstanceOf(HttpError);
    });
  });

  describe("saveMessageResponse", () => {
    it("requires response text", async () => {
      await expect(contactService.saveMessageResponse("id", "user", "")).rejects.toBeInstanceOf(
        HttpError,
      );

      expect(mockRepository.saveContactMessageResponse).not.toHaveBeenCalled();
    });
  });
});
