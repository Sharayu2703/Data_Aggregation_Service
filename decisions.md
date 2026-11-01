# Technical Decisions – Ratewise

## 1. Which APIs did I choose and why?

I used public exchange rate API providers for the free-tier exchange rate data.

I kept the provider logic separate in `backend/src/providers.js`. This makes it easier to manage different providers and update them without changing the complete application.

I chose public APIs because the assessment requires real exchange rate data and the free tier should not depend on expensive premium API calls.

## 2. What is my fallback strategy?

I did not want the application to completely fail when an external API becomes unavailable.

My approach is:

1. Try to get exchange rates from the available providers.
2. Normalize the response into a common format.
3. Store successful results in the cache.
4. If providers fail, check whether previously cached data is available.
5. Return cached data when it is within the allowed stale-data period.
6. If no usable data is available, return a proper error response.

This is useful because temporary provider failures do not always need to become application failures.

## 3. How do I handle conflicting data from different sources?

Different providers may return different values or observation dates.

I normalize provider responses before using them in the application. The service also considers the observation date and selects the newest available observation when preparing the normalized rate payload.

This helps avoid using an older observation when a newer one is available.

I understand that different providers may still have small differences because of their data sources and update schedules.

## 4. What does the user see when things fail or data is stale?

I wanted the user to have a clear experience instead of seeing a blank screen.

When fresh data is available, the application displays the exchange rates and freshness information.

When cached data is used, the application can communicate its update time and freshness status through the frontend.

If neither a provider response nor usable cached data is available, the backend returns a service-unavailable response with an error message.

## 5. Did I do anything to improve data freshness?

Yes. I implemented caching with a default TTL of 5 minutes.

This reduces unnecessary repeated API calls and allows recently fetched data to be reused.

I also implemented stale-if-error handling. The maximum stale-data age is configured to 24 hours.

This means that when providers fail, the application can still use previously stored data within that limit.

## 6. Why did I use MongoDB?

I used MongoDB for persistent rate caching.

An in-memory cache can be lost when the backend restarts. MongoDB helps preserve previously fetched rate data so that it can be reused later.

I also kept the application capable of running without MongoDB, using the in-memory fallback behavior when a database connection is not available.

## 7. Why did I choose this technology stack?

- **React:** For building the user interface.
- **Vite:** For frontend development and production builds.
- **Node.js:** For backend development.
- **Express:** For creating the API endpoint.
- **MongoDB:** For persistent cache storage.
- **Mongoose:** For database operations.
- **Vercel:** For deploying the frontend and backend in one project.

I chose this stack because it is suitable for a small full-stack application and I could build and deploy it within the given time.

## 8. What did I cut to ship today?

Because of the time limit, I did not implement everything that a complete fintech application would need.

I left out:

- Paid subscription and payment integration.
- Premium API integration.
- Historical exchange rate charts.
- User login and account management.
- Advanced provider monitoring.
- Detailed analytics dashboard.

I focused on the main requirement: providing exchange rates reliably using public APIs.

## 9. What would I add with more time?

If I had more time, I would add:

- Provider health monitoring.
- Historical exchange rate charts.
- Better cache monitoring.
- More public API providers.
- Automated alerts when providers fail.
- A premium API strategy for high-intent users.
- More detailed performance and reliability metrics.

## 10. Final Thought

My main decision throughout this project was to focus on reliability and user trust.

I believe that showing reasonably fresh data with clear freshness information is better than showing an error whenever an external API has a temporary issue.

The project is a basic implementation of this idea, and it can be extended further into a more complete currency tracking service.