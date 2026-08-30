import * as contactRepository from "../../../../apps/backend/src/modules/contact/contact.repository.js";

const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = []) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
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

describe("Contact Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  it("creates and maps a contact message", async () => {
    const row = {
      id: "msg-1",
      user_id: null,
      email: "user@example.com",
      topic: "Topic",
      message: "Message",
      created_at: "2024-06-10T10:00:00.000Z",
      read_at: null,
      read_by_user_id: null,
      responded_at: null,
      response: null,
    };

    const dbModule = await import("../../../../apps/backend/src/db/connection.js");
    const dbFn = dbModule.db as jest.Mock;
    dbFn("contact_messages");
    queryBuilders.contact_messages.returning.mockResolvedValue([row]);

    const result = await contactRepository.createContactMessage({
      userId: null,
      email: "user@example.com",
      topic: "Topic",
      message: "Message",
    });

    expect(result).toEqual({
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
  });

  it("filters list queries for unread and open messages", async () => {
    const dbModule = await import("../../../../apps/backend/src/db/connection.js");
    const dbFn = dbModule.db as jest.Mock;
    dbFn("contact_messages");

    await contactRepository.listContactMessages({
      limit: 150,
      offset: 10,
      unreadOnly: true,
      openOnly: true,
    });

    expect(queryBuilders.contact_messages.limit).toHaveBeenCalledWith(100);
    expect(queryBuilders.contact_messages.offset).toHaveBeenCalledWith(10);
    expect(queryBuilders.contact_messages.whereNull).toHaveBeenCalledWith("read_at");
    expect(queryBuilders.contact_messages.whereNull).toHaveBeenCalledWith("responded_at");
  });

  it("trims response before saving", async () => {
    const row = {
      id: "msg-2",
      user_id: null,
      email: "user@example.com",
      topic: "Topic",
      message: "Message",
      created_at: "2024-06-10T10:00:00.000Z",
      read_at: null,
      read_by_user_id: null,
      responded_at: "2024-06-10T10:00:00.000Z",
      response: "Trimmed",
    };

    const dbModule = await import("../../../../apps/backend/src/db/connection.js");
    const dbFn = dbModule.db as jest.Mock;
    dbFn("contact_messages");
    queryBuilders.contact_messages.returning.mockResolvedValue([row]);

    await contactRepository.saveContactMessageResponse("msg-2", "user-1", "  Trimmed ");

    expect(queryBuilders.contact_messages.update).toHaveBeenCalledWith(
      expect.objectContaining({ response: "Trimmed" }),
    );
  });
});
