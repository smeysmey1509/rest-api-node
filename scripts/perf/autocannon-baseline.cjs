const http = require("node:http");
const https = require("node:https");
const autocannon = require("autocannon");

const BASE_URL = process.env.PERF_BASE_URL || "http://localhost:3000";
const CONNECTIONS = Number(process.env.PERF_CONNECTIONS || 50);
const DURATION = Number(process.env.PERF_DURATION || 30);
const PIPELINING = Number(process.env.PERF_PIPELINING || 1);
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";

const defaultHeaders = {
  accept: "application/json",
};

const authHeaders = AUTH_TOKEN
  ? {
      ...defaultHeaders,
      authorization: `Bearer ${AUTH_TOKEN}`,
    }
  : defaultHeaders;

const endpoints = [
  {
    name: "debug public endpoint",
    path: "/debug",
    method: "GET",
    headers: defaultHeaders,
  },
  {
    name: "products page 1",
    path: "/api/v1/products?page=1&limit=25",
    method: "GET",
    headers: defaultHeaders,
  },
  {
    name: "products page 2",
    path: "/api/v1/products?page=2&limit=25",
    method: "GET",
    headers: defaultHeaders,
  },
  {
    name: "products search iphone",
    path: "/api/v1/products?search=iphone&page=1&limit=25",
    method: "GET",
    headers: defaultHeaders,
  },
  {
    name: "products search samsung",
    path: "/api/v1/products?search=samsung&page=1&limit=25",
    method: "GET",
    headers: defaultHeaders,
  },
  {
    name: "users page 1 protected",
    path: "/api/v1/users?page=1&limit=25",
    method: "GET",
    headers: authHeaders,
    requiresAuth: true,
  },
];

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, { timeout: 5_000 }, (res) => {
      res.resume();
      res.on("end", () => {
        resolve({ statusCode: res.statusCode });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Preflight request timed out for ${url}`));
    });

    req.on("error", reject);
  });
}

async function preflight() {
  const url = `${BASE_URL}/debug`;

  try {
    const result = await requestOnce(url);
    console.log(`Preflight OK: ${url} returned HTTP ${result.statusCode}`);
  } catch (error) {
    console.error("\nAutocannon cannot reach your API server.");
    console.error(`Tried: ${url}`);
    console.error(`Error: ${error.code || error.message}`);
    console.error("\nFix:");
    console.error("1. Open another terminal");
    console.error("2. Run: npm run dev");
    console.error("3. Confirm: curl http://localhost:3000/debug");
    console.error("4. If your API uses another port, run: PERF_BASE_URL=http://localhost:<PORT> npm run perf:baseline");
    process.exit(1);
  }
}

function getLatencyP95(result) {
  return result.latency.p95 ?? result.latency.p97_5 ?? result.latency.average ?? 0;
}

function runAutocannon(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;

  return new Promise((resolve, reject) => {
    console.log("\n============================================================");
    console.log(`Testing: ${endpoint.name}`);
    console.log(`URL:     ${url}`);
    console.log(`Config:  connections=${CONNECTIONS}, duration=${DURATION}s, pipelining=${PIPELINING}`);

    if (endpoint.requiresAuth && !AUTH_TOKEN) {
      console.log("Skipped: set AUTH_TOKEN to test protected endpoint.");
      resolve(null);
      return;
    }

    const instance = autocannon(
      {
        url,
        method: endpoint.method,
        connections: CONNECTIONS,
        duration: DURATION,
        pipelining: PIPELINING,
        headers: endpoint.headers,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        const summary = {
          endpoint: endpoint.name,
          url,
          requestsPerSecond: result.requests.average,
          latencyAvgMs: result.latency.average,
          latencyP95Ms: getLatencyP95(result),
          latencyP99Ms: result.latency.p99 ?? 0,
          errors: result.errors,
          timeouts: result.timeouts,
          non2xx: result.non2xx,
        };

        if (summary.requestsPerSecond === 0 || summary.errors > 0) {
          console.log("Warning: this endpoint produced errors. Check server logs and verify the URL manually with curl.");
        }

        console.table(summary);
        resolve(summary);
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main() {
  console.log("Autocannon baseline started");
  console.log(`Base URL: ${BASE_URL}`);

  await preflight();

  const results = [];

  for (const endpoint of endpoints) {
    const result = await runAutocannon(endpoint);
    if (result) results.push(result);
  }

  console.log("\n======================= BASELINE SUMMARY =======================");
  console.table(results);

  const validResults = results.filter((result) => result.requestsPerSecond > 0 && result.errors === 0);
  const slowest = [...validResults].sort((a, b) => b.latencyP95Ms - a.latencyP95Ms)[0];
  if (slowest) {
    console.log(`Slowest endpoint by p95 latency: ${slowest.endpoint} (${slowest.latencyP95Ms}ms)`);
  } else {
    console.log("No valid baseline results. Fix server connectivity/errors first.");
  }
}

main().catch((error) => {
  console.error("Autocannon baseline failed:", error);
  process.exit(1);
});
