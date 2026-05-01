# Performance testing with Autocannon

This folder contains a baseline runner for API performance testing.

## 1. Start the API

Use your normal development server:

```bash
npm run dev
```

Or test the production build:

```bash
npm run build
npm start
```

## 2. Run public endpoint baseline

```bash
npm run perf:baseline
```

This tests:

- `GET /debug`
- `GET /api/v1/products?page=1&limit=25`
- `GET /api/v1/products?page=2&limit=25`
- `GET /api/v1/products?search=iphone&page=1&limit=25`
- `GET /api/v1/products?search=samsung&page=1&limit=25`

The protected users endpoint is skipped unless `AUTH_TOKEN` is provided.

## 3. Test protected endpoints

Login first and copy an admin access token. Then run:

```bash
AUTH_TOKEN="YOUR_ADMIN_ACCESS_TOKEN" npm run perf:baseline
```

## 4. Change load level

Default settings:

```txt
PERF_CONNECTIONS=50
PERF_DURATION=30
PERF_PIPELINING=1
PERF_BASE_URL=http://localhost:3000
```

Example heavier test:

```bash
PERF_CONNECTIONS=100 PERF_DURATION=60 npm run perf:baseline
```

Example different server URL:

```bash
PERF_BASE_URL=http://localhost:4000 npm run perf:baseline
```

## 5. What to watch

Focus on:

- Requests/sec
- Average latency
- p95 latency
- p99 latency
- Errors
- Timeouts
- Non-2xx responses

The slowest endpoint by p95 latency is printed at the end.
