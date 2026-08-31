import {
  criteriaMet,
  type BadgeCriteriaContext,
} from "../../../../apps/backend/src/modules/points/badge-criteria.js";

function baseCtx(overrides: Partial<BadgeCriteriaContext> = {}): BadgeCriteriaContext {
  return {
    userId: "user-1",
    completedSessions: 1,
    typeCodeSessionCounts: new Map(),
    distinctTypeCodesByWindow: new Map(),
    completedDates: new Set(),
    completedAt: new Date("2026-08-31T12:00:00.000Z"),
    runDistanceMeters: 0,
    rideDistanceMeters: 0,
    rowDistanceMeters: 0,
    sessionsInCalendarDay: 1,
    startHourUtc: 12,
    visibility: "private",
    personalRecordCount: 0,
    followerCount: 0,
    ...overrides,
  };
}

describe("badge criteria interpreter", () => {
  it("rejects empty criteria and catalog-only requires", () => {
    expect(criteriaMet({}, baseCtx())).toBe(false);
    expect(criteriaMet({ requires: "coaching" }, baseCtx())).toBe(false);
    expect(
      criteriaMet(
        { requires: "admin_ops", completed_sessions: 1 },
        baseCtx({ completedSessions: 10 }),
      ),
    ).toBe(false);
  });

  it("awards first session and first vibe from type_code counts", () => {
    const ctx = baseCtx({
      completedSessions: 1,
      typeCodeSessionCounts: new Map([["strength", 1]]),
    });
    expect(criteriaMet({ completed_sessions: 1 }, ctx)).toBe(true);
    expect(criteriaMet({ type_code: "strength", completed_sessions: 1 }, ctx)).toBe(true);
    expect(criteriaMet({ type_code: "agility", completed_sessions: 1 }, ctx)).toBe(false);
  });

  it("requires four distinct vibes in the window for cross_trainer", () => {
    const ctx = baseCtx({
      distinctTypeCodesByWindow: new Map([
        [7, new Set(["strength", "agility", "endurance", "explosivity"])],
      ]),
    });
    expect(criteriaMet({ distinct_type_codes: 4, window_days: 7 }, ctx)).toBe(true);
    expect(criteriaMet({ distinct_type_codes: 5, window_days: 7 }, ctx)).toBe(false);
  });

  it("requires all six vibes for all_the_tales", () => {
    const allSix = new Set([
      "strength",
      "agility",
      "endurance",
      "explosivity",
      "intelligence",
      "regeneration",
    ]);
    const ctx = baseCtx({
      distinctTypeCodesByWindow: new Map([[28, allSix]]),
    });
    expect(criteriaMet({ all_type_codes: true, window_days: 28 }, ctx)).toBe(true);
    expect(
      criteriaMet(
        { all_type_codes: true, window_days: 28 },
        baseCtx({
          distinctTypeCodesByWindow: new Map([
            [28, new Set(["strength", "agility", "endurance", "explosivity"])],
          ]),
        }),
      ),
    ).toBe(false);
  });

  it("checks distance, calendar-day volume, time of day, visibility, PRs, and follows", () => {
    expect(criteriaMet({ run_distance_m: 10000 }, baseCtx({ runDistanceMeters: 10000 }))).toBe(
      true,
    );
    expect(criteriaMet({ row_distance_m: 5000 }, baseCtx({ rowDistanceMeters: 4999 }))).toBe(false);
    expect(
      criteriaMet({ sessions_in_calendar_day: 2 }, baseCtx({ sessionsInCalendarDay: 2 })),
    ).toBe(true);
    expect(criteriaMet({ start_hour_lte: 6 }, baseCtx({ startHourUtc: 5 }))).toBe(true);
    expect(criteriaMet({ start_hour_gte: 21 }, baseCtx({ startHourUtc: 22 }))).toBe(true);
    expect(
      criteriaMet({ visibility: ["public", "followers"] }, baseCtx({ visibility: "public" })),
    ).toBe(true);
    expect(
      criteriaMet({ visibility: ["public", "followers"] }, baseCtx({ visibility: "private" })),
    ).toBe(false);
    expect(criteriaMet({ personal_records: 1 }, baseCtx({ personalRecordCount: 1 }))).toBe(true);
    expect(criteriaMet({ follower_count: 1 }, baseCtx({ followerCount: 1 }))).toBe(true);
  });
});
