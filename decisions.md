# Product and engineering decisions

## 1. APIs chosen
- **Frankfurter API** (`api.frankfurter.dev`): no API key, simple currency-pair rates, and publishes reference rates associated with the European Central Bank. It is the preferred source when its observation date is newest.
- **Open ER API** (`open.er-api.com`): a second independent, no-key public source. It provides a broad base-currency response and acts as a fallback/cross-check.

Both are public-data sources, not guaranteed real-time market feeds. Their publication cadence can be slower than Google or a trading venue. The UI says “reference rate” and displays the provider observation date so we do not imply tick-level live pricing.

## 2. MongoDB persistence and fallback
- Mongoose stores the latest successful normalized response in MongoDB, keyed by base currency and sorted requested symbols.
- Each document includes rates, provider names/status, observation date, fetched timestamp, and cache timestamp.
- Reads use in-memory cache first, then MongoDB. Successful upstream results refresh both stores.
- When upstream providers fail, a snapshot no older than 24 hours can be served as `stale`, including after a backend restart.
- MongoDB is persistence, not a third rate provider; the app never treats a stored snapshot as a new live quote.
- If MongoDB is not configured or unavailable, the app degrades to in-memory caching and logs the condition.

## 3. Fallback strategy
1. Request both providers concurrently with a 4-second timeout.
2. Normalize responses into a common `{ base, date, rates }` shape.
3. Prefer the provider with the newest observation date. If only one succeeds, use it.
4. If neither succeeds, return the most recent cached success with `stale` status and HTTP 200. If there has never been a success, return a clear 503 response.
5. Cache successful responses for five minutes and retain them for up to 24 hours for outage fallback. The cache is in-process for this single-instance assessment build; production deployment should use Redis or another shared cache.

## 4. Conflicting data
Provider values are not blindly averaged. The source with the newest observation date wins. If dates match, compare overlapping rates; when the relative difference is at most 1%, use the arithmetic mean to reduce small provider-specific noise. If the difference exceeds 1%, retain the preferred provider's value and expose a conflict warning/source note. This avoids inventing a blended rate from materially different observations.

## 5. What users see
- **Fresh:** green/positive freshness label and observation date.
- **Delayed:** amber label when the observation date is older than 24 hours.
- **Stale fallback:** explicit warning that the latest successful cached response is being shown, including its age.
- **No cached data and providers down:** a helpful error state with retry guidance; the service does not crash or return fabricated values.
- A persistent note explains that rates are indicative reference rates, not executable quotes.

## 6. Staleness improvements
- Five-minute server cache avoids unnecessary provider calls while keeping the service responsive.
- Parallel provider requests reduce dependency on a single upstream.
- Stale-while-error fallback preserves utility during provider outages.
- The UI displays both the rate observation date and the local time it was fetched by this service.
- The endpoint allows selecting base and symbols, so clients do not need to download every available pair.

## 7. Premium API budget
No premium API is called in this implementation. The constraints say free users must use public APIs, and the premium API is not specified. Spending the approved budget without a defined provider, SLA, or high-intent signal would be premature. With product analytics and a premium API contract, I would reserve premium calls for explicit high-intent moments (for example, repeated refreshes on a watched pair) with a hard daily $5 / 5,000-call budget and deduplication.

## 8. What was cut to ship
- Authentication, subscriptions, billing, paid-tier routing, user watchlists, alerts, and historical charts.
- Redis/distributed cache and scheduled background refresh.
- WebSocket streaming and tick-level quotes.
- FX conversion calculator and locale-specific number formatting beyond browser formatting.
- Automated browser/E2E suite and production observability integration.

## 9. What I would add next
1. Redis shared cache and a scheduled refresh worker with provider health metrics.
2. Contract tests for provider payload changes and E2E tests for degraded states.
3. Pair-level monitoring, request tracing, and alerting on provider freshness/error rates.
4. Analytics to measure conversion and support-ticket impact with a controlled experiment.
5. Paid plan integration with an authenticated premium provider and explicit entitlement checks.

## Other product considerations
Trust is the feature: freshness and provenance are part of the data, not decorative UI. The service intentionally avoids the word “real-time.” A reference rate can differ from the rate offered by a bank or money-transfer service due to spreads, fees, and timing.
