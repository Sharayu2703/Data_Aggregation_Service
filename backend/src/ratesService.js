import { fetchProviders } from "./providers.js";

const DEFAULT_SYMBOLS = ["EUR", "GBP", "INR", "JPY", "CAD", "AUD", "CHF", "CNY"];

function dateAgeHours(dateString, now = Date.now()) {
  const parsed = Date.parse(`${dateString}T00:00:00Z`);
  return Number.isFinite(parsed) ? Math.max(0, (now - parsed) / 3600000) : Infinity;
}

function buildRates(successes, symbols) {
  const sorted = [...successes].sort((a, b) => b.date.localeCompare(a.date));
  const preferred = sorted[0];
  const rates = {};
  const warnings = [];
  const sameDate = successes.filter((item) => item.date === preferred.date);

  for (const symbol of symbols) {
    const values = sameDate
      .map((item) => item.rates[symbol])
      .filter((value) => Number.isFinite(value) && value > 0);

    if (values.length === 0) {
      const fallbackValue = preferred.rates[symbol] ??
        sorted.find((item) => Number.isFinite(item.rates[symbol]))?.rates[symbol];
      if (Number.isFinite(fallbackValue)) rates[symbol] = fallbackValue;
      continue;
    }

    if (values.length > 1) {
      const low = Math.min(...values);
      const high = Math.max(...values);
      const relativeSpread = (high - low) / ((high + low) / 2);
      if (relativeSpread <= 0.01) {
        rates[symbol] = values.reduce((sum, value) => sum + value, 0) / values.length;
      } else {
        rates[symbol] = preferred.rates[symbol] ?? values[0];
        warnings.push(`Sources differ by more than 1% for ${symbol}; preferred source value shown.`);
      }
    } else {
      rates[symbol] = values[0];
    }
  }
  return { rates, preferred, warnings: [...new Set(warnings)] };
}

export function createRatesService({
  providerFetcher = fetchProviders,
  cacheTtlMs = 300000,
  staleMaxAgeMs = 86400000,
  timeoutMs = 4000,
  now = () => Date.now(),
  store = null
} = {}) {
  const cache = new Map();
  const inFlight = new Map();

  async function getRates(base, symbols) {
    const key = `${base}:${[...symbols].sort().join(",")}`;
    const currentTime = now();
    let cached = cache.get(key);

    if (!cached && store) {
      try {
        cached = await store.get(key);
        if (cached) cache.set(key, cached);
      } catch (error) {
        console.warn("MongoDB cache read failed:", error.message);
      }
    }

    if (cached && currentTime - cached.cachedAt < cacheTtlMs) {
      return { ...cached.payload, cache: "hit" };
    }

    if (inFlight.has(key)) return inFlight.get(key);

    const request = (async () => {
      const providerResults = await providerFetcher(base, symbols, timeoutMs);
      const successes = providerResults.filter((item) => item.ok).map((item) => item.value);

      if (successes.length > 0) {
        const { rates, preferred, warnings } = buildRates(successes, symbols);
        if (Object.keys(rates).length === 0) throw new Error("Providers returned no requested rates");
        const fetchedAt = new Date(now()).toISOString();
        const ageHours = dateAgeHours(preferred.date, now());
        const payload = {
          base,
          asOf: preferred.date,
          fetchedAt,
          status: ageHours > 24 ? "delayed" : "fresh",
          source: successes.length > 1 ? `${successes.map((item) => item.name).join(" + ")}` : preferred.name,
          rates,
          providers: providerResults.map((item) => item.ok
            ? { name: item.name, ok: true, asOf: item.value.date }
            : { name: item.name, ok: false, error: item.error }),
          warnings
        };
        const entry = { payload, cachedAt: now() };
        cache.set(key, entry);
        if (store) {
          try {
            await store.set(key, entry);
          } catch (error) {
            console.warn("MongoDB cache write failed:", error.message);
          }
        }
        return { ...payload, cache: "miss" };
      }

      if (cached && now() - cached.cachedAt <= staleMaxAgeMs) {
        return {
          ...cached.payload,
          status: "stale",
          cache: "stale",
          staleAgeMs: now() - cached.cachedAt,
          warnings: [...cached.payload.warnings, "Live providers are unavailable. Showing the last successful cached rates."],
          providers: providerResults.map((item) => ({ name: item.name, ok: false, error: item.error }))
        };
      }

      const error = new Error("All rate providers are unavailable and no usable cached data exists.");
      error.providers = providerResults.map((item) => ({ name: item.name, ok: false, error: item.error }));
      throw error;
    })();

    inFlight.set(key, request);
    try {
      return await request;
    } finally {
      inFlight.delete(key);
    }
  }

  return { getRates, cache, DEFAULT_SYMBOLS };
}

export { DEFAULT_SYMBOLS };
