const queryBuilder = {
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  onConflict: jest.fn().mockReturnThis(),
  merge: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};
const mockDb = jest.fn(() => queryBuilder);

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: mockDb,
}));

import {
  findVibeformPreferences,
  upsertVibeformPreferences,
} from "../../../../apps/backend/src/modules/vibeforms/vibeforms.repository.js";

const userId = "c4f6d130-9696-4cb3-8d3e-f8f619ab804d";

describe("Vibeform preference repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads only from user_vibeform_preferences", async () => {
    queryBuilder.first.mockResolvedValue(null);

    await expect(findVibeformPreferences(userId)).resolves.toBeNull();

    expect(mockDb).toHaveBeenCalledWith("user_vibeform_preferences");
    expect(queryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
  });

  it("scopes every preference read to the requested user", async () => {
    queryBuilder.first.mockResolvedValue(null);

    await findVibeformPreferences("user-a");
    await findVibeformPreferences("user-b");

    expect(queryBuilder.where).toHaveBeenNthCalledWith(1, { user_id: "user-a" });
    expect(queryBuilder.where).toHaveBeenNthCalledWith(2, { user_id: "user-b" });
  });

  it("upserts a complete preference record by user", async () => {
    const row = {
      user_id: userId,
      template_code: "flow",
      template_version: 1,
      body_profile: "balanced",
      motion_enabled: true,
      created_at: "2026-09-19T00:00:00.000Z",
      updated_at: "2026-09-19T00:00:00.000Z",
    };
    queryBuilder.returning.mockResolvedValue([row]);

    await expect(
      upsertVibeformPreferences(userId, {
        templateCode: "flow",
        templateVersion: 1,
        bodyProfile: "balanced",
        motionEnabled: true,
      }),
    ).resolves.toEqual(row);

    expect(mockDb).toHaveBeenCalledWith("user_vibeform_preferences");
    expect(queryBuilder.onConflict).toHaveBeenCalledWith("user_id");
    expect(queryBuilder.merge).toHaveBeenCalledWith(
      expect.objectContaining({
        template_code: "flow",
        template_version: 1,
        body_profile: "balanced",
        motion_enabled: true,
      }),
    );
  });
});
