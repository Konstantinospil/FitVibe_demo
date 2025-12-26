import * as translationsRepository from "../../../../apps/backend/src/modules/translations/translations.repository.js";

const builderQueue: any[] = [];

type MockBuilder = ReturnType<typeof createMockQueryBuilder>;

function createMockQueryBuilder(
  defaultValue: unknown = [],
  firstValue: unknown = null,
  returningValue: unknown = [],
): any {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(firstValue),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(returningValue),
    clone: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    clearOrder: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
  });

  return builder;
}

const mockDb = jest.fn((table: string) => {
  const builder = builderQueue.shift() ?? createMockQueryBuilder();
  return builder;
}) as jest.Mock & {
  fn: { now: jest.Mock };
  transaction: jest.Mock;
};

mockDb.fn = { now: jest.fn(() => "now") };
mockDb.transaction = jest.fn(async (callback: (trx: typeof mockDb) => Promise<unknown>) => {
  return callback(mockDb);
});

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: mockDb,
}));

describe("Translations Repository", () => {
  beforeEach(() => {
    builderQueue.length = 0;
    jest.clearAllMocks();
  });

  it("builds flat map for translations", async () => {
    builderQueue.push(
      createMockQueryBuilder(
        [
          { key_path: "auth.signIn", value: "Sign in" },
          { key_path: "auth.signOut", value: "Sign out" },
        ],
        null,
      ),
    );

    const result = await translationsRepository.getTranslations("en", "auth");

    expect(result).toEqual({
      "auth.signIn": "Sign in",
      "auth.signOut": "Sign out",
    });
  });

  it("builds nested translation object", async () => {
    builderQueue.push(
      createMockQueryBuilder(
        [
          { key_path: "errors.required", value: "Required" },
          { key_path: "errors.invalid.email", value: "Invalid" },
        ],
        null,
      ),
    );

    const result = await translationsRepository.getTranslationsNested("en", "common");

    expect(result).toEqual({
      errors: {
        required: "Required",
        invalid: {
          email: "Invalid",
        },
      },
    });
  });

  it("creates translation by updating existing active record", async () => {
    const activeRecord = {
      id: "t-1",
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Hello",
      deleted_at: null,
      created_at: "2024-06-10T10:00:00.000Z",
      updated_at: "2024-06-10T10:00:00.000Z",
      created_by: null,
      updated_by: null,
    };

    builderQueue.push(createMockQueryBuilder([], activeRecord));

    const updateSpy = jest
      .spyOn(translationsRepository, "updateTranslation")
      .mockResolvedValue(activeRecord);

    const result = await translationsRepository.createTranslation({
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Hello",
      updated_by: null,
      created_by: null,
    });

    expect(updateSpy).toHaveBeenCalledWith(
      "en",
      "common",
      "hello",
      { value: "Hello" },
      null,
      undefined,
    );
    expect(result).toEqual(activeRecord);

    updateSpy.mockRestore();
  });

  it("restores deleted translation when found", async () => {
    const deletedRecord = {
      id: "t-2",
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Old",
      deleted_at: "2024-06-10T09:00:00.000Z",
      created_at: "2024-06-10T09:00:00.000Z",
      updated_at: "2024-06-10T09:00:00.000Z",
      created_by: null,
      updated_by: null,
    };
    const restoredRecord = {
      ...deletedRecord,
      value: "Hello",
      deleted_at: null,
    };

    const activeCheck = createMockQueryBuilder([], null);
    const deletedCheck = createMockQueryBuilder([], deletedRecord);
    const updateBuilder = createMockQueryBuilder([], null, [restoredRecord]);

    builderQueue.push(activeCheck, deletedCheck, updateBuilder);

    const result = await translationsRepository.createTranslation({
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Hello",
      updated_by: "admin-1",
      created_by: "admin-1",
    });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "Hello",
        deleted_at: null,
        updated_by: "admin-1",
      }),
    );
    expect(result).toEqual(restoredRecord);
  });

  it("upserts by updating active translation", async () => {
    const activeRecord = {
      id: "t-3",
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Hello",
      deleted_at: null,
      created_at: "2024-06-10T10:00:00.000Z",
      updated_at: "2024-06-10T10:00:00.000Z",
      created_by: null,
      updated_by: null,
    };
    const updatedRecord = {
      ...activeRecord,
      value: "Hello updated",
    };

    const deletedCheck = createMockQueryBuilder([], null);
    const activeCheck = createMockQueryBuilder([], activeRecord);
    const updateBuilder = createMockQueryBuilder([], null, [updatedRecord]);

    builderQueue.push(deletedCheck, activeCheck, updateBuilder);

    const result = await translationsRepository.upsertTranslation({
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Hello updated",
      updated_by: "admin-1",
      created_by: "admin-1",
    });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "Hello updated",
        updated_by: "admin-1",
        deleted_at: null,
      }),
    );
    expect(result).toEqual(updatedRecord);
  });

  it("returns undefined when update target does not exist", async () => {
    const activeCheck = createMockQueryBuilder([], null);
    builderQueue.push(activeCheck);

    const result = await translationsRepository.updateTranslation(
      "en",
      "common",
      "missing",
      { value: "New" },
      "admin-1",
    );

    expect(result).toBeUndefined();
  });

  it("updates translation using provided transaction", async () => {
    const existing = {
      id: "t-4",
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Hello",
      deleted_at: null,
      created_at: "2024-06-10T10:00:00.000Z",
      updated_at: "2024-06-10T10:00:00.000Z",
      created_by: "admin-0",
      updated_by: null,
    };
    const newRecord = {
      id: "t-5",
      namespace: "common",
      key_path: "hello",
      language: "en",
      value: "Hello updated",
      deleted_at: null,
      created_at: "2024-06-10T10:00:00.000Z",
      updated_at: "2024-06-10T10:00:00.000Z",
      created_by: "admin-1",
      updated_by: "admin-1",
    };

    const existingBuilder = createMockQueryBuilder([], existing);
    const updateBuilder = createMockQueryBuilder();
    const insertBuilder = createMockQueryBuilder([], null, [newRecord]);
    const trxQueue: MockBuilder[] = [existingBuilder, updateBuilder, insertBuilder];
    const trx = jest.fn(() => trxQueue.shift());

    const result = await translationsRepository.updateTranslation(
      "en",
      "common",
      "hello",
      { value: "Hello updated" },
      "admin-1",
      trx as any,
    );

    expect(trx).toHaveBeenCalled();
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        updated_by: "admin-1",
        deleted_at: expect.any(String),
      }),
    );
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: "common",
        key_path: "hello",
        language: "en",
        value: "Hello updated",
        created_by: "admin-1",
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    );
    expect(result).toEqual(newRecord);
  });
});
