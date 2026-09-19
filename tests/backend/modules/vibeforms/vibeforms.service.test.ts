import {
  getVibeformProfile,
  getVibeformPreferences,
  normalizeVibeLevel,
  updateVibeformPreferences,
} from "../../../../apps/backend/src/modules/vibeforms/vibeforms.service.js";
import * as measurementsRepository from "../../../../apps/backend/src/modules/measurements/measurements.repository.js";
import * as pointsRepository from "../../../../apps/backend/src/modules/points/points.repository.js";
import * as sessionsRepository from "../../../../apps/backend/src/modules/sessions/sessions.repository.js";
import * as repository from "../../../../apps/backend/src/modules/vibeforms/vibeforms.repository.js";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));
jest.mock("../../../../apps/backend/src/modules/vibeforms/vibeforms.repository.js");
jest.mock("../../../../apps/backend/src/modules/measurements/measurements.repository.js");
jest.mock("../../../../apps/backend/src/modules/points/points.repository.js");
jest.mock("../../../../apps/backend/src/modules/sessions/sessions.repository.js");

const mockedRepository = jest.mocked(repository);
const mockedMeasurementsRepository = jest.mocked(measurementsRepository);
const mockedPointsRepository = jest.mocked(pointsRepository);
const mockedSessionsRepository = jest.mocked(sessionsRepository);
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

describe("Vibeform profile service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRepository.findVibeformPreferences.mockResolvedValue(null);
  });

  it("normalizes persisted source data into the renderer contract", async () => {
    mockedMeasurementsRepository.getLatestBioValuesByKeys.mockResolvedValue({
      weight_kg: { key: "weight_kg", valueNumber: 81, measuredAt: "2026-09-18T00:00:00Z" },
      height_cm: { key: "height_cm", valueNumber: 180, measuredAt: "2026-09-01T00:00:00Z" },
    });
    mockedPointsRepository.getAllDomainVibeLevels.mockResolvedValue(
      new Map([
        ["intelligence", { vibe_level: 100 }],
        ["regeneration", { vibe_level: 680 }],
        ["agility", { vibe_level: 1260 }],
        ["explosivity", { vibe_level: 1840 }],
        ["endurance", { vibe_level: 2420 }],
        ["strength", { vibe_level: 3000 }],
      ]) as never,
    );
    mockedSessionsRepository.getRegionalTrainingLoad.mockResolvedValue({
      upper: 10,
      lower: 20,
      fullBody: 4,
    });
    const now = new Date("2026-09-19T18:00:00.000Z");

    await expect(getVibeformProfile(userId, now)).resolves.toEqual({
      preferences: {
        templateCode: "flow",
        templateVersion: 1,
        bodyProfile: "balanced",
        motionEnabled: true,
      },
      metrics: {
        intelligence: 0,
        regeneration: 0.2,
        agility: 0.4,
        explosivity: 0.6,
        endurance: 0.8,
        strength: 1,
        upperBodyStrength: 0.5,
        lowerBodyStrength: 11 / 12,
        bmi: 25,
        heightCm: 180,
      },
      calculationVersion: "1",
      calculatedAt: now.toISOString(),
    });
    expect(mockedSessionsRepository.getRegionalTrainingLoad).toHaveBeenCalledWith(userId, {
      from: new Date("2026-06-27T18:00:00.000Z"),
      to: now,
    });
  });

  it("uses initial Vibe levels and nullable body metrics when source rows are absent", async () => {
    mockedMeasurementsRepository.getLatestBioValuesByKeys.mockResolvedValue({});
    mockedPointsRepository.getAllDomainVibeLevels.mockResolvedValue(new Map());
    mockedSessionsRepository.getRegionalTrainingLoad.mockResolvedValue({
      upper: 0,
      lower: 0,
      fullBody: 0,
    });

    const profile = await getVibeformProfile(userId, new Date("2026-09-19T00:00:00.000Z"));

    expect(profile.metrics.bmi).toBeNull();
    expect(profile.metrics.heightCm).toBeNull();
    expect(profile.metrics.strength).toBeCloseTo(900 / 2900);
    expect(profile.metrics.upperBodyStrength).toBe(0);
  });

  it("clamps Vibe levels outside the supported rating range", () => {
    expect(normalizeVibeLevel(-100)).toBe(0);
    expect(normalizeVibeLevel(3100)).toBe(1);
  });
});
