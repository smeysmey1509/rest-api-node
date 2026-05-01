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
          latencyP95Ms: result.latency.p95,
          latencyP99Ms: result.latency.p99,
          errors: result.errors,
          timeouts: result.timeouts,
          non2xx: result.non2xx,
        };

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

  const results = [];

  for (const endpoint of endpoints) {
    const result = await runAutocannon(endpoint);
    if (result) results.push(result);
  }

  console.log("\n======================= BASELINE SUMMARY =======================");
  console.table(results);

  const slowest = [...results].sort((a, b) => b.latencyP95Ms - a.latencyP95Ms)[0];
  if (slowest) {
    console.log(`Slowest endpoint by p95 latency: ${slowest.endpoint} (${slowest.latencyP95Ms}ms)`);
  }
}

main().catch((error) => {
  console.error("Autocannon baseline failed:", error);
  process.exit(1);
});
