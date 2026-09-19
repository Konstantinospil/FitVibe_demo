import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: Object.assign(jest.fn(), { raw: jest.fn() }),
}));

import { db } from "../../../../apps/backend/src/db/connection.js";
import { getRegionalTrainingLoad } from "../../../../apps/backend/src/modules/sessions/sessions.repository.js";

const mockRaw = (db as unknown as { raw: jest.Mock }).raw;

describe("getRegionalTrainingLoad", () => {
  beforeEach(() => mockRaw.mockReset());

  it("maps completed exercise occurrence counts to regional load", async () => {
    mockRaw.mockResolvedValue({ rows: [{ upper: "7", lower: "5", full_body: "2" }] });
    const window = {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-09-19T23:59:59.999Z",
    };

    await expect(getRegionalTrainingLoad("user-1", window)).resolves.toEqual({
      upper: 7,
      lower: 5,
      fullBody: 2,
    });
    expect(mockRaw).toHaveBeenCalledWith(expect.stringContaining("s.status = 'completed'"), [
      "user-1",
      window.from,
      window.to,
    ]);
    expect(mockRaw.mock.calls[0]?.[0]).toEqual(expect.stringContaining("s.deleted_at IS NULL"));
    expect(mockRaw.mock.calls[0]?.[0]).toEqual(expect.stringContaining("'full_body'"));
  });

  it("returns zero load when there are no matching exercises", async () => {
    mockRaw.mockResolvedValue({ rows: [] });

    await expect(
      getRegionalTrainingLoad("user-1", { from: new Date(0), to: new Date(1) }),
    ).resolves.toEqual({ upper: 0, lower: 0, fullBody: 0 });
  });
});
