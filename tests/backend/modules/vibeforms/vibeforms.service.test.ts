import {
  getVibeformPreferences,
  updateVibeformPreferences,
} from "../../../../apps/backend/src/modules/vibeforms/vibeforms.service.js";
import * as repository from "../../../../apps/backend/src/modules/vibeforms/vibeforms.repository.js";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));
jest.mock("../../../../apps/backend/src/modules/vibeforms/vibeforms.repository.js");

const mockedRepository = jest.mocked(repository);
const userId = "c4f6d130-9696-4cb3-8d3e-f8f619ab804d";

describe("Vibeform preference service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns documented defaults when the user has no stored choice", async () => {
    mockedRepository.findVibeformPreferences.mockResolvedValue(null);

    await expect(getVibeformPreferences(userId)).resolves.toEqual({
      templateCode: "flow",
      templateVersion: 1,
      bodyProfile: "balanced",
      motionEnabled: true,
    });
  });

  it("merges a partial update and pins the registered template version", async () => {
    mockedRepository.findVibeformPreferences.mockResolvedValue({
      user_id: userId,
      template_code: "flow",
      template_version: 1,
      body_profile: "balanced",
      motion_enabled: true,
      created_at: "2026-09-19T00:00:00.000Z",
      updated_at: "2026-09-19T00:00:00.000Z",
    });
    mockedRepository.upsertVibeformPreferences.mockImplementation(async (id, preferences) => ({
      user_id: id,
      template_code: preferences.templateCode,
      template_version: preferences.templateVersion,
      body_profile: preferences.bodyProfile,
      motion_enabled: preferences.motionEnabled,
      created_at: "2026-09-19T00:00:00.000Z",
      updated_at: "2026-09-19T00:01:00.000Z",
    }));

    await expect(
      updateVibeformPreferences(userId, {
        bodyProfile: "hip-dominant",
        motionEnabled: false,
      }),
    ).resolves.toEqual({
      templateCode: "flow",
      templateVersion: 1,
      bodyProfile: "hip-dominant",
      motionEnabled: false,
    });

    expect(mockedRepository.upsertVibeformPreferences).toHaveBeenCalledWith(userId, {
      templateCode: "flow",
      templateVersion: 1,
      bodyProfile: "hip-dominant",
      motionEnabled: false,
    });
  });
});
