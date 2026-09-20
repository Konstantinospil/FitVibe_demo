import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: Object.assign(jest.fn(), { raw: jest.fn() }),
}));

import { db } from "../../../../apps/backend/src/db/connection.js";
import { getLatestBioValuesByKeys } from "../../../../apps/backend/src/modules/measurements/measurements.repository.js";

const mockRaw = (db as unknown as { raw: jest.Mock }).raw;

describe("getLatestBioValuesByKeys", () => {
  beforeEach(() => mockRaw.mockReset());

  it("returns the latest active values keyed by biological attribute", async () => {
    mockRaw.mockResolvedValue({
      rows: [
        { key: "height_cm", value_number: "180.0000", measured_at: "2026-09-01T00:00:00Z" },
        { key: "weight_kg", value_number: "95.5000", measured_at: "2026-09-18T00:00:00Z" },
      ],
    });

    await expect(
      getLatestBioValuesByKeys("user-1", ["weight_kg", "height_cm"] as const),
    ).resolves.toEqual({
      height_cm: {
        key: "height_cm",
        valueNumber: 180,
        measuredAt: "2026-09-01T00:00:00Z",
      },
      weight_kg: {
        key: "weight_kg",
        valueNumber: 95.5,
        measuredAt: "2026-09-18T00:00:00Z",
      },
    });
    expect(mockRaw).toHaveBeenCalledWith(expect.stringContaining("DISTINCT ON (a.key)"), [
      "user-1",
      ["weight_kg", "height_cm"],
    ]);
  });

  it("does not query the database when no keys are requested", async () => {
    await expect(getLatestBioValuesByKeys("user-1", [])).resolves.toEqual({});
    expect(mockRaw).not.toHaveBeenCalled();
  });
});
