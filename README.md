# Ratewise – Real-Time Data Aggregation Service

Ratewise is a currency exchange rate tracking application built as part of a full-stack development assessment.

The main purpose of this project is to provide users with reasonably fresh exchange rates and a better experience when public exchange rate APIs are slow or temporarily unavailable.

Instead of depending on only one API response, the backend uses provider integration, caching, and fallback logic to improve reliability.

## 1. Initial Thought Process

When I read the problem statement, I understood that the main problem was user trust.

Free users may see old exchange rates or errors when public APIs are unavailable. This can make them stop using the application.

I decided to focus on three important things:

- Fetching exchange rates from real public APIs.
- Keeping previously fetched data available through caching.
- Showing users when the data was last updated.

I wanted to build a simple application that remains useful even when an external provider has a temporary issue.

## 2. Features

- Select a base currency.
- View multiple currency exchange rates.
- Fetch data through real public API providers.
- Backend currency input validation.
- Provider-based rate fetching.
- Rate normalization.
- Five-minute default cache TTL.
- Stale cached data fallback when providers fail.
- MongoDB persistent caching.
- Data freshness information in the frontend.
- Health check endpoint.
- Graceful handling of provider failures.
- Vercel deployment.

## 3. Technology Stack

| Part | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Backend | Node.js |
| API framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Deployment | Vercel |

## 4. Project Structure

```text
forex-trust-service/
│
├── backend/
│   ├── src/
│   │   ├── providers.js
│   │   ├── rateCacheModel.js
│   │   ├── ratesService.js
│   │   └── server.js
│   │
│   ├── test/
│   ├── .env.example
│   ├── package.json
│   └── render.yaml
│
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── decisions.md
├── MY_APPROACH.md
├── README.md
└── vercel.json
```

## 5. How the Application Works

1. The user selects a base currency in the frontend.
2. The frontend sends a request to the backend.
3. The backend validates the currency codes.
4. The rates service checks the available data and providers.
5. Successful provider data is normalized and cached.
6. MongoDB stores the cached rate information.
7. If the providers fail, the service tries to use previously cached data within the allowed stale-data period.
8. The backend returns the result to the frontend.
9. The frontend displays the exchange rates and their freshness information.

## 6. API Endpoints

### Get Exchange Rates

**Endpoint:**

```http
GET /api/rates
```

**Example request:**

```http
GET /api/rates?base=USD&symbols=INR,EUR,GBP
```

**Query parameters:**

| Parameter | Description |
|---|---|
| base | Base currency code |
| symbols | Comma-separated target currency codes |

The backend accepts one to thirty valid currency symbols. The base currency cannot also be included in the symbols.

### Health Check

```http
GET /health
```

This endpoint returns the backend service status and indicates whether MongoDB is configured.

## 7. Caching Strategy

The application uses caching to reduce repeated requests to external providers.

Current configuration:

- Cache TTL: 5 minutes by default.
- Maximum stale-data age: 24 hours by default.
- Provider timeout: 4 seconds by default.

When a provider fails, the backend can return previously cached data if it is still within the allowed stale-data period.

If no usable data is available, the backend returns an error response instead of pretending that fresh rates are available.

## 8. Run the Project Locally

### Requirements

- Node.js 20 or above.
- npm.
- MongoDB connection (optional, but recommended for persistent caching).

### Step 1: Clone the repository

```bash
git clone https://github.com/Sharayu2703/Data_Aggregation_Service
cd forex-trust-service
```

Replace the repository URL with the actual GitHub repository URL.

### Step 2: Install backend dependencies

```bash
npm install --prefix backend
```

### Step 3: Configure backend environment

Create a `.env` file inside the `backend` folder using `.env.example` as a reference.

Add the required provider configuration and database connection details according to the example environment file.

Common configuration variables include:

```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173
CACHE_TTL_MS=300000
STALE_MAX_AGE_MS=86400000
PROVIDER_TIMEOUT_MS=4000
```

Use the actual provider variables documented in `backend/.env.example`. Do not commit secret API keys or `.env` files to GitHub.

### Step 4: Start the backend

```bash
npm run dev --prefix backend
```

The backend runs locally on:

```text
http://localhost:4000
```

### Step 5: Install frontend dependencies

Open another terminal in the project root and run:

```bash
npm install --prefix frontend
```

### Step 6: Start the frontend

```bash
npm run dev --prefix frontend
```

The frontend runs locally on:

```text
http://localhost:5173
```

The Vite development server proxies API requests to the backend.

## 9. Run Tests

To run backend tests:

```bash
npm test --prefix backend
```

The backend tests cover:

- Selecting the newest observation date.
- Returning stale cached data when providers fail.
- Handling cases where no provider or cache is available.
- Saving and restoring data through the database store.
- Using MongoDB-persisted data as a stale fallback.

## 10. Production Build

To create a frontend production build:

```bash
npm run build --prefix frontend
```

## 11. Deployment

The application is deployed using Vercel.

The root `vercel.json` configures the frontend and backend as services in one Vercel project.

The routing is configured so that:

- `/api/*` requests go to the backend.
- `/health` requests go to the backend.
- Other application routes go to the frontend.

Required environment variables should be configured in the Vercel project settings. Never upload secrets to the repository.

## 12. Limitations

This is a time-limited assessment project.

The following features are not implemented:

- Paid subscription system.
- Premium API integration.
- User authentication.
- Historical rate charts.
- Advanced monitoring and analytics.

These features can be added in future versions.

## 13. Future Improvements

- Add historical rate tracking.
- Add provider performance monitoring.
- Improve API failure alerts.
- Add more public data providers.
- Add a premium API strategy for high-intent users.
- Improve the user dashboard.

## 14. Conclusion

Ratewise was built with a focus on reliability, caching, and user trust.

The main idea is simple: when fresh data is temporarily unavailable, the application should try to provide usable cached data and clearly communicate its freshness instead of immediately showing an error.

This project helped me understand how external APIs, backend services, caching, databases, and frontend applications work together in a real-world scenario.