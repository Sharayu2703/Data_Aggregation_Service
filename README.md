# Ratewise — Real-Time Data Aggregation Service

A small, deployable currency reference-rate tracker built with React + Express + MongoDB. It calls two public APIs, persists successful rate snapshots in MongoDB, uses a short in-memory cache for speed, and degrades gracefully when upstreams fail.

> Rates are indicative reference rates, not executable quotes. Public providers may publish delayed data; this app does not claim tick-level real-time pricing.

## Initial thought process
The first priority is user trust, not the largest number of features. A generic “Unable to fetch rates” message hides whether the provider is down or the data is merely delayed. I chose two independent public sources, concurrent requests, a short cache, and an explicitly labelled stale fallback. The screen puts the observation date and source next to the rates. I kept the first release to one endpoint and one responsive page so the core experience can be shipped and evaluated quickly.

## Features
- One backend data endpoint: `GET /api/rates?base=USD&symbols=EUR,GBP,INR`
- Real upstream requests to Frankfurter and Open ER API (no mocked rates).
- Parallel provider calls with timeout and per-provider error isolation.
- Five-minute in-memory cache plus MongoDB persistence; up-to-24-hour stale fallback survives backend restarts.
- Date-aware provider selection and same-date conflict handling.
- Responsive React UI with base selection, search, refresh, freshness states, and source attribution.
- Health endpoint for deployment checks (`GET /health`).

## Requirements
- Node.js 20+
- npm 9+
- MongoDB Atlas database (or local MongoDB) for persistent rate snapshots

## Run locally

### 1. Backend
```bash
cd backend
cp .env.example .env
# Add your MongoDB connection string to MONGODB_URI in .env
npm install
npm run dev
```
Backend listens on `http://localhost:4000`.

### 2. Frontend
In another terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` and proxies `/api` to the backend in development.

## Verify
```bash
curl "http://localhost:4000/api/rates?base=USD&symbols=EUR,GBP,INR"
curl "http://localhost:4000/health"
```
The rates endpoint returns metadata such as `status`, `asOf`, `fetchedAt`, `source`, `providers`, and `warnings` along with `rates`.

## MongoDB setup

1. Create a free MongoDB Atlas cluster (or use a local MongoDB server).
2. In Atlas, create a database user and allow your development IP address in Network Access.
3. Copy the Node.js connection string and place it in `backend/.env` as `MONGODB_URI`.
4. Replace the username, password, and cluster placeholder. Do not commit `.env` or expose the URI in frontend code.
5. Restart the backend. The server logs `MongoDB connected` when the connection succeeds.

### Stored collection

Mongoose creates a `ratecaches` collection using the `RateCache` model. Each document stores:
- `key`: unique base-currency + sorted-symbols cache key
- `base` and `symbols`: requested currency pair set
- `payload`: normalized rates, provider provenance, observation date, and freshness metadata
- `cachedAt`: last successful fetch timestamp

The API checks the in-memory cache first, then MongoDB. Successful provider responses update both caches. If providers fail, the backend can restore a recent MongoDB snapshot and return it with `status: "stale"`. MongoDB is not used as a source of new exchange rates; it stores previously fetched provider results.

If `MONGODB_URI` is absent or MongoDB is unreachable, the service logs a warning and continues with in-memory caching. Persistent fallback is unavailable until MongoDB reconnects.

## API contract

`GET /api/rates`

| Query | Default | Rules |
|---|---|---|
| `base` | `USD` | Three-letter ISO-style currency code |
| `symbols` | `EUR,GBP,INR,JPY,CAD,AUD,CHF,CNY` | Comma-separated codes; max 30 |

Success response (shape):
```json
{
  "base": "USD",
  "asOf": "2026-10-30",
  "fetchedAt": "2026-11-01T03:55:00.000Z",
  "status": "fresh",
  "source": "Frankfurter + Open ER API",
  "rates": { "EUR": 0.86, "INR": 88.1 },
  "providers": [
    { "name": "Frankfurter", "ok": true, "asOf": "2026-10-30" },
    { "name": "Open ER API", "ok": true, "asOf": "2026-10-30" }
  ],
  "warnings": []
}
```
Dates and values above are illustrative response shape only; actual values always come from the live providers.

Status values:
- `fresh`: observation date is today or yesterday.
- `delayed`: observation date is older than 24 hours.
- `stale`: upstreams failed and cached data is being served.

If there is no cached response and all providers fail, the endpoint returns HTTP 503 with an explanatory JSON error. Invalid query parameters return HTTP 400.

## Deploy

### Backend — Render
1. Push this repository to GitHub.
2. Create a Render **Web Service** from the repo.
3. Set **Root Directory** to `backend`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add `NODE_ENV=production`, `MONGODB_URI` (your Atlas connection string), and `CORS_ORIGIN` (your deployed frontend origin).
7. After deployment, copy the Render URL.

A `backend/render.yaml` is included as an optional Blueprint config.

### Frontend — Vercel
1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com` (replace with your actual Render URL).
6. Deploy.

For a different frontend host, set the same `VITE_API_BASE_URL` environment variable to the backend origin. Configure `CORS_ORIGIN` on the backend to your deployed frontend origin (or comma-separated origins).

**Deployment note:** I cannot deploy into your hosting accounts or create a public URL without access to those accounts. The included configuration is ready for you to deploy; add the resulting URLs to your submission.

## Environment variables

Backend (`backend/.env`):
- `PORT` — default `4000`
- `CORS_ORIGIN` — comma-separated allowed origins; default `http://localhost:5173`
- `CACHE_TTL_MS` — default `300000` (5 min)
- `STALE_MAX_AGE_MS` — default `86400000` (24 h)
- `PROVIDER_TIMEOUT_MS` — default `4000`
- `MONGODB_URI` — MongoDB connection string; required for persistent cache

Frontend (`frontend/.env`):
- `VITE_API_BASE_URL` — optional backend origin; omit locally to use Vite proxy.

## Project structure
```text
.
├── MY_APPROACH.md
├── decisions.md
├── README.md
├── backend/
│   ├── src/
│   │   ├── providers.js
│   │   ├── rateCacheModel.js
│   │   ├── ratesService.js
│   │   └── server.js
│   ├── test/
│   │   └── ratesService.test.js
│   ├── package.json
│   ├── .env.example
│   └── render.yaml
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── styles.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── .env.example
```

## Important production caveats
- The in-memory cache is per process; MongoDB persists the last successful snapshot across restarts. For multi-instance deployments, use Redis for a shared low-latency cache and keep MongoDB for durable snapshots.
- Public API terms, availability, and publication cadence can change. Verify provider terms before commercial use.
- This is not a financial advice or transaction-pricing product.
