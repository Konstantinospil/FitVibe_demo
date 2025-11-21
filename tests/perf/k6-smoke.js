import http from "k6/http";
import { check, group } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = (__ENV.API_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const healthDuration = new Trend("http_req_duration_health", true);
const metricsDuration = new Trend("http_req_duration_metrics", true);
const rootDuration = new Trend("http_req_duration_root", true);

export const options = {
  scenarios: {
    sustain: {
      executor: "constant-arrival-rate",
      rate: 500,
      timeUnit: "1s",
      duration: "1m",
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
    burst: {
      executor: "ramping-arrival-rate",
      startRate: 100,
      timeUnit: "1s",
      stages: [
        { target: 1000, duration: "30s" },
        { target: 0, duration: "10s" },
      ],
      preAllocatedVUs: 200,
      maxVUs: 600,
      startTime: "1m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
    http_req_duration_health: ["p(95)<300"],
    http_req_duration_metrics: ["p(95)<300"],
    http_req_duration_root: ["p(95)<300"],
  },
};

export default function () {
  group("health", () => {
    const response = http.get(`${BASE_URL}/health`);
    healthDuration.add(response.timings.duration);
    check(response, {
      "health responds 200": (res) => res.status === 200,
    });
  });

  group("metrics", () => {
    const response = http.get(`${BASE_URL}/metrics`);
    metricsDuration.add(response.timings.duration);
    check(response, {
      "metrics respond 200": (res) => res.status === 200,
    });
  });

  group("landing", () => {
    const response = http.get(`${BASE_URL}/`);
    rootDuration.add(response.timings.duration);
    check(response, {
      "landing responds 200": (res) => res.status === 200,
    });
  });
}
