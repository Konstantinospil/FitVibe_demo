import app from "../../../apps/backend/src/app.js";
import { invokeExpress } from "../test-helpers/express-request";

describe("Q-15 security headers", () => {
  it("applies strict HTTP response headers on health endpoint", async () => {
    const response = await invokeExpress(app, { method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["strict-transport-security"]).toContain("max-age=15552000");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });
});
