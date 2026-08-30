import type { Page, Route } from "@playwright/test";

const NOW_ISO = "2025-10-01T12:00:00.000Z";

const fulfillJson = (route: Route, data: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });

const DEFAULT_SYSTEM_CONFIG = {
  readOnlyMode: false,
  maintenanceMode: false,
  maintenanceMessage: null,
  features: {
    socialFeed: true,
    coachDashboard: false,
    insights: true,
  },
  timestamp: NOW_ISO,
};

const DEFAULT_USER = {
  id: "user-123",
  username: "ava",
  displayName: "Ava Stone",
  primaryEmail: "ava@example.com",
  role: "user",
  email: "ava@example.com",
  roleCode: "user",
  status: "active",
  profile: {
    alias: "ava-stone",
    bio: "Training for balance, strength, and joy.",
    weight: 72.5,
    weightUnit: "kg",
    fitnessLevel: "intermediate",
    trainingFrequency: "3_4_per_week",
  },
  avatar: {
    url: "https://example.com/avatar.png",
    mimeType: "image/png",
    bytes: 20480,
    updatedAt: NOW_ISO,
  },
  locale: "en",
  preferredLang: "en",
  defaultVisibility: "followers",
  units: "metric",
};

type UserAttributeValueType = "number" | "text" | "date";

type MockAttributeInput = {
  key: string;
  label: string;
  valueType: UserAttributeValueType;
  valueNumber?: number;
  valueText?: string;
  valueDate?: string;
  unit?: string | null;
};

const buildAttribute = ({
  key,
  label,
  valueType,
  valueNumber,
  valueText,
  valueDate,
  unit = null,
}: MockAttributeInput) => {
  const id = `attr-${key}`;
  return {
    id,
    key,
    label,
    unit,
    valueType,
    minValue: null,
    maxValue: null,
    minLength: null,
    maxLength: null,
    minDate: null,
    maxDate: null,
    createdAt: NOW_ISO,
    latestValue: {
      attributeId: id,
      valueNumber: valueType === "number" ? (valueNumber ?? null) : null,
      valueText: valueType === "text" ? (valueText ?? null) : null,
      valueDate: valueType === "date" ? (valueDate ?? null) : null,
      createdAt: NOW_ISO,
    },
  };
};

const DEFAULT_ATTRIBUTES = [
  buildAttribute({
    key: "display_name",
    label: "Display name",
    valueType: "text",
    valueText: "Ava Stone",
  }),
  buildAttribute({ key: "full_name", label: "Full name", valueType: "text", valueText: "Ava A." }),
  buildAttribute({
    key: "date_of_birth",
    label: "Date of birth",
    valueType: "date",
    valueDate: "1992-08-16",
  }),
  buildAttribute({
    key: "motto",
    label: "Motto",
    valueType: "text",
    valueText: "Consistency beats intensity.",
  }),
  buildAttribute({
    key: "biography",
    label: "Biography",
    valueType: "text",
    valueText: "Coach, climber, and strength enthusiast.",
  }),
  buildAttribute({
    key: "weight_kg",
    label: "Weight",
    unit: "kg",
    valueType: "number",
    valueNumber: 72.5,
  }),
  buildAttribute({
    key: "body_fat_pct",
    label: "Body fat",
    unit: "%",
    valueType: "number",
    valueNumber: 14.2,
  }),
  buildAttribute({
    key: "bone_weight_kg",
    label: "Bone weight",
    unit: "kg",
    valueType: "number",
    valueNumber: 3.1,
  }),
  buildAttribute({
    key: "body_water_pct",
    label: "Body water",
    unit: "%",
    valueType: "number",
    valueNumber: 55.3,
  }),
  buildAttribute({
    key: "height_cm",
    label: "Height",
    unit: "cm",
    valueType: "number",
    valueNumber: 178,
  }),
  buildAttribute({
    key: "chest_circumference_cm",
    label: "Chest",
    unit: "cm",
    valueType: "number",
    valueNumber: 101,
  }),
  buildAttribute({
    key: "waist_circumference_cm",
    label: "Waist",
    unit: "cm",
    valueType: "number",
    valueNumber: 82,
  }),
  buildAttribute({
    key: "hip_circumference_cm",
    label: "Hip",
    unit: "cm",
    valueType: "number",
    valueNumber: 97,
  }),
  buildAttribute({
    key: "bicep_circumference_cm",
    label: "Bicep",
    unit: "cm",
    valueType: "number",
    valueNumber: 36,
  }),
  buildAttribute({
    key: "thigh_circumference_cm",
    label: "Thigh",
    unit: "cm",
    valueType: "number",
    valueNumber: 58,
  }),
  buildAttribute({
    key: "calf_circumference_cm",
    label: "Calf",
    unit: "cm",
    valueType: "number",
    valueNumber: 38,
  }),
  buildAttribute({
    key: "vo2_max",
    label: "VO2 max",
    unit: "ml/kg/min",
    valueType: "number",
    valueNumber: 49,
  }),
  buildAttribute({
    key: "ftp_watts",
    label: "FTP",
    unit: "W",
    valueType: "number",
    valueNumber: 215,
  }),
  buildAttribute({
    key: "run_12min_m",
    label: "12 min run",
    unit: "m",
    valueType: "number",
    valueNumber: 2850,
  }),
  buildAttribute({
    key: "dash_100m_sec",
    label: "100m dash",
    unit: "sec",
    valueType: "number",
    valueNumber: 14.1,
  }),
  buildAttribute({
    key: "pushups_1min",
    label: "Pushups",
    unit: "reps",
    valueType: "number",
    valueNumber: 42,
  }),
  buildAttribute({
    key: "chest_press_1rm_kg",
    label: "Chest press 1RM",
    unit: "kg",
    valueType: "number",
    valueNumber: 92,
  }),
  buildAttribute({
    key: "squat_1rm_kg",
    label: "Squat 1RM",
    unit: "kg",
    valueType: "number",
    valueNumber: 150,
  }),
  buildAttribute({
    key: "deadlift_1rm_kg",
    label: "Deadlift 1RM",
    unit: "kg",
    valueType: "number",
    valueNumber: 170,
  }),
  buildAttribute({
    key: "shoulder_press_1rm_kg",
    label: "Shoulder press 1RM",
    unit: "kg",
    valueType: "number",
    valueNumber: 60,
  }),
  buildAttribute({
    key: "vertical_jump_cm",
    label: "Vertical jump",
    unit: "cm",
    valueType: "number",
    valueNumber: 48,
  }),
  buildAttribute({
    key: "horizontal_jump_cm",
    label: "Horizontal jump",
    unit: "cm",
    valueType: "number",
    valueNumber: 210,
  }),
  buildAttribute({
    key: "sit_and_reach_cm",
    label: "Sit & reach",
    unit: "cm",
    valueType: "number",
    valueNumber: 32,
  }),
];

export async function mockSystemConfig(
  page: Page,
  overrides?: Partial<typeof DEFAULT_SYSTEM_CONFIG>,
) {
  await page.route("**/api/v1/system/config", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    const merged = {
      ...DEFAULT_SYSTEM_CONFIG,
      ...overrides,
      features: {
        ...DEFAULT_SYSTEM_CONFIG.features,
        ...(overrides?.features ?? {}),
      },
    };
    return fulfillJson(route, merged);
  });
}

export async function mockCurrentUser(page: Page, overrides?: Partial<typeof DEFAULT_USER>) {
  await page.route("**/api/v1/users/me", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return fulfillJson(route, { ...DEFAULT_USER, ...overrides });
  });
}

export async function mockUserAttributes(
  page: Page,
  overrides?: { attributes?: typeof DEFAULT_ATTRIBUTES },
) {
  await page.route("**/api/v1/users/me/attributes", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return fulfillJson(route, { attributes: overrides?.attributes ?? DEFAULT_ATTRIBUTES });
  });

  await page.route(/\/api\/v1\/users\/me\/attributes\/[^/]+$/, async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    const attributeId = route.request().url().split("/").pop() ?? "attr-unknown";
    return fulfillJson(route, {
      latestValue: {
        attributeId,
        valueNumber: null,
        valueText: null,
        valueDate: null,
        createdAt: NOW_ISO,
      },
    });
  });
}

export async function mockAuthSessions(page: Page) {
  await page.route("**/api/v1/auth/sessions", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return fulfillJson(route, {
      sessions: [
        {
          id: "session-current",
          userAgent: "Chrome on macOS",
          ip: "10.0.0.12",
          createdAt: "2025-09-20T09:12:00.000Z",
          expiresAt: "2025-12-20T09:12:00.000Z",
          revokedAt: null,
          isCurrent: true,
        },
        {
          id: "session-other",
          userAgent: "Safari on iPhone",
          ip: "10.0.0.24",
          createdAt: "2025-09-08T18:25:00.000Z",
          expiresAt: "2025-12-08T18:25:00.000Z",
          revokedAt: null,
          isCurrent: false,
        },
      ],
    });
  });
}

export async function mock2FAStatus(page: Page, enabled = false) {
  await page.route("**/api/v1/auth/2fa/status", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return fulfillJson(route, { enabled });
  });
}

export async function mockCookieConsent(page: Page) {
  await page.route("**/api/v1/consent/cookie-status", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return fulfillJson(route, {
      success: true,
      data: {
        hasConsent: true,
        consent: {
          essential: true,
          preferences: true,
          analytics: false,
          marketing: false,
          version: "2025-01",
          updatedAt: NOW_ISO,
        },
      },
    });
  });

  await page.route("**/api/v1/consent/cookie-preferences", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    return fulfillJson(route, {
      success: true,
      data: {
        essential: true,
        preferences: true,
        analytics: false,
        marketing: false,
        version: "2025-01",
        updatedAt: NOW_ISO,
      },
    });
  });
}

export async function mockFeed(page: Page) {
  await page.route("**/api/v1/feed**", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return fulfillJson(route, {
      items: [
        {
          id: "feed-1",
          visibility: "public",
          createdAt: "2025-09-30T08:15:00.000Z",
          isLiked: false,
          likesCount: 18,
          session: {
            id: "session-201",
            title: "Tempo Run",
            notes: "Felt sharp and steady across every interval.",
            exerciseCount: 6,
            totalVolume: 24500,
          },
          user: {
            displayName: "Maya Rivers",
            username: "maya",
          },
        },
        {
          id: "feed-2",
          visibility: "followers",
          createdAt: "2025-09-28T16:42:00.000Z",
          isLiked: true,
          likesCount: 42,
          session: {
            id: "session-202",
            title: "Upper Strength",
            notes: "Push and pull focus with clean tempo.",
            exerciseCount: 8,
            totalVolume: 33200,
          },
          user: {
            displayName: "Noah Lee",
            username: "noah",
          },
        },
      ],
    });
  });
}

export async function mockSession(page: Page, sessionId = "session-123") {
  const session = {
    id: sessionId,
    title: "Leg Day Circuit",
    status: "planned",
    started_at: null,
    exercises: [
      {
        exercise_id: "Back Squat",
        order_index: 0,
        notes: "Focus on tempo.",
        sets: [
          { order_index: 0, reps: 6, weight_kg: 90, rpe: 7, notes: null },
          { order_index: 1, reps: 6, weight_kg: 95, rpe: 8, notes: null },
        ],
        planned: { sets: 2, reps: 6, load: 95, rpe: 8, rest: "90 sec" },
      },
      {
        exercise_id: "Romanian Deadlift",
        order_index: 1,
        notes: null,
        sets: [
          { order_index: 0, reps: 8, weight_kg: 70, rpe: 7, notes: null },
          { order_index: 1, reps: 8, weight_kg: 75, rpe: 8, notes: null },
        ],
        planned: { sets: 2, reps: 8, load: 75, rpe: 8, rest: "90 sec" },
      },
    ],
  };

  await page.route(new RegExp(`/api/v1/sessions/${sessionId}$`), async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return fulfillJson(route, session);
    }
    if (method === "PATCH") {
      return fulfillJson(route, { ...session, status: "in_progress", started_at: NOW_ISO });
    }
    return route.fallback();
  });
}
