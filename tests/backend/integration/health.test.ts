import app from "../../../apps/backend/src/app.js";
import { invokeExpress } from "../test-helpers/express-request";

describe("GET /health", () => {
  it("returns a healthy status payload", async () => {
    const response = await invokeExpress(app, { method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json).toMatchObject({
      status: "ok",
    });
    expect(typeof (response.json as { timestamp?: unknown }).timestamp).toBe("string");
  });
});
