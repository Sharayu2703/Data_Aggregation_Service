# My Approach – Ratewise

## 1. Understanding the Problem

After reading the problem statement, I understood that the main issue is not just fetching exchange rates. The bigger issue is user trust.

Free users depend on public APIs for exchange rates. Sometimes these APIs respond slowly, return old data, or become unavailable. If users continuously see errors or outdated rates, they may stop using the application.

So, I decided to focus on making the free user experience more reliable instead of only focusing on getting the latest rate.

## 2. My Main Goal

My main goal was to build a simple exchange rate application where:

- Users can select a base currency.
- Users can view rates for multiple currencies.
- Data comes from real public APIs.
- The application should not stop working when one API fails.
- Cached data should be available as a fallback.
- Users should be able to understand when the data was last updated.

## 3. How I Planned to Solve It

I divided the project into three main parts.

**Frontend:**

I planned to use React because it makes it easier to create an interactive UI. The user should be able to change the base currency and view the updated exchange rates without refreshing the complete page.

**Backend:**

I planned to use Node.js and Express to create the exchange rate API. The backend would communicate with external providers, validate currency inputs, and prepare a common response for the frontend.

**Database and Caching:**

I decided to use MongoDB to store previously fetched rates. This would help the application reuse cached data instead of depending on an external API for every request.

## 4. Handling API Failures

One important thing I considered was what happens when an API is not available.

Instead of returning an error immediately, the backend should try its available providers and use cached data when a provider request fails.

I also wanted to keep a limit on how old the cached data can be. Showing very old rates without informing the user would be misleading.

## 5. What I Prioritized

Since the task had a limited time, I focused on the most important features first:

1. Working frontend and backend.
2. Integration with real public exchange rate APIs.
3. Currency validation.
4. Rate caching.
5. Fallback when providers fail.
6. MongoDB persistence.
7. Data freshness information.
8. Deployment.

I did not spend time building a complete paid subscription system because it was not required for this assessment.

## 6. Expected Result

I wanted to build something that is useful even when external services are not working perfectly.

My main thinking was that showing reasonably fresh cached data with clear information is better than showing an error every time a public API has a temporary problem.