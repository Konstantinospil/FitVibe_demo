import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: Object.assign(jest.fn(), { raw: jest.fn() }),
}));

import { db } from "../../../../apps/backend/src/db/connection.js";
import { listRegionalStrengthStimuli } from "../../../../apps/backend/src/modules/sessions/sessions.repository.js";

const mockRaw = (db as unknown as { raw: jest.Mock }).raw;

describe("listRegionalStrengthStimuli", () => {
  beforeEach(() => mockRaw.mockReset());

  it("maps completed strength work to regional stimuli", async () => {
    mockRaw.mockResolvedValue({
      rows: [
        {
          region: "upper",
          completed_at: new Date("2026-09-18T00:00:00.000Z"),
          set_count: "4",
          average_rpe: "8.5",
        },
        {
          region: "fullBody",
          completed_at: "2026-09-10T00:00:00.000Z",
          set_count: "1",
          average_rpe: null,
        },
      ],
    });
    const window = {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-09-19T23:59:59.999Z",
    };

    await expect(listRegionalStrengthStimuli("user-1", window)).resolves.toEqual([
      {
        region: "upper",
        completedAt: "2026-09-18T00:00:00.000Z",
        setCount: 4,
        averageRpe: 8.5,
      },
      {
        region: "fullBody",
        completedAt: "2026-09-10T00:00:00.000Z",
        setCount: 1,
        averageRpe: null,
      },
    ]);
    expect(mockRaw).toHaveBeenCalledWith(expect.stringContaining("s.status = 'completed'"), [
      "user-1",
      window.from,
      window.to,
    ]);
    expect(mockRaw.mock.calls[0]?.[0]).toEqual(expect.stringContaining("s.deleted_at IS NULL"));
    expect(mockRaw.mock.calls[0]?.[0]).toEqual(expect.stringContaining("e.type_code = 'strength'"));
    expect(mockRaw.mock.calls[0]?.[0]).toEqual(expect.stringContaining("exercise_sets"));
    expect(mockRaw.mock.calls[0]?.[0]).toEqual(expect.stringContaining("'full_body'"));
  });

  it("returns no stimuli when there are no matching exercises", async () => {
    mockRaw.mockResolvedValue({ rows: [] });

    await expect(
      listRegionalStrengthStimuli("user-1", { from: new Date(0), to: new Date(1) }),
    ).resolves.toEqual([]);
  });
});
