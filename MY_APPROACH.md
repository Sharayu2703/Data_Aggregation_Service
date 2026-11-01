# MY_APPROACH.md — initial product approach

> **Important before submission:** The assessment asks for this section to be written by the candidate without AI. This file is a structured starter, not a claim that these are your unaided personal thoughts. Read the project, rewrite this in your own words, and remove this note before submitting.

## Product goal
Restore confidence in the free experience by making rates available, showing exactly how fresh they are, and explaining degraded states instead of displaying a generic failure.

## My proposed approach
1. Start with the highest-value journey: choose a base currency and quickly see a useful set of common exchange rates.
2. Use two independent, no-key public data sources. Fetch them in parallel with timeouts so one slow or unavailable provider does not block the other.
3. Cache successful results in memory for fast reads and persist the latest successful snapshot in MongoDB. Serve a recent cached response immediately when possible, and serve an explicitly labelled stale database snapshot if all providers fail, including after a backend restart.
4. Never silently present an old value as live. Show the observation date, last successful fetch time, source, and a freshness state in the UI.
5. Keep the first version deliberately small: one rates endpoint, one responsive screen, input validation, provider fallbacks, MongoDB persistence, and deployment configuration.

## Success signals
- Fewer failed rate requests and fewer support reports about unavailable/stale rates.
- Users can tell whether a value is fresh, delayed, or stale.
- The experience remains useful during a provider outage.

## Scope boundary
This is an informational tracker, not an execution or settlement quote. Rates are indicative and can differ from a bank, card network, or transfer provider.
