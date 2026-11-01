import test from "node:test";
import assert from "node:assert/strict";
import { createRatesService } from "../src/ratesService.js";

test("chooses newest observation date and returns normalized rate payload", async () => {
  const service = createRatesService({
    now: () => Date.parse("2026-11-01T00:00:00Z"),
    providerFetcher: async () => [
      { ok: true, name: "Frankfurter", value: { name: "Frankfurter", date: "2026-10-30", rates: { INR: 88 } } },
      { ok: true, name: "Open ER API", value: { name: "Open ER API", date: "2026-10-31", rates: { INR: 89 } } }
    ]
  });
  const result = await service.getRates("USD", ["INR"]);
  assert.equal(result.asOf, "2026-10-31");
  assert.equal(result.rates.INR, 89);
  assert.equal(result.status, "fresh");
});

test("serves explicitly stale cached data when providers fail", async () => {
  let call = 0;
  let clock = Date.parse("2026-11-01T00:00:00Z");
  const service = createRatesService({
    now: () => clock,
    cacheTtlMs: 1000,
    staleMaxAgeMs: 86400000,
    providerFetcher: async () => {
      call += 1;
      return call === 1
        ? [{ ok: true, name: "Frankfurter", value: { name: "Frankfurter", date: "2026-11-01", rates: { INR: 88 } } }]
        : [{ ok: false, name: "Frankfurter", error: "offline" }, { ok: false, name: "Open ER API", error: "offline" }];
    }
  });
  await service.getRates("USD", ["INR"]);
  clock += 600000;
  const result = await service.getRates("USD", ["INR"]);
  assert.equal(result.status, "stale");
  assert.equal(result.rates.INR, 88);
});

test("throws if no provider or cache is available", async () => {
  const service = createRatesService({
    providerFetcher: async () => [{ ok: false, name: "Frankfurter", error: "offline" }]
  });
  await assert.rejects(() => service.getRates("USD", ["INR"]), /unavailable/);
});

test("persists successful rates and restores them from the database store", async () => {
  const records = new Map();
  const store = {
    async get(key) { return records.get(key) || null; },
    async set(key, entry) { records.set(key, entry); }
  };
  let calls = 0;
  const first = createRatesService({
    store,
    now: () => Date.parse("2026-11-01T00:00:00Z"),
    providerFetcher: async () => {
      calls += 1;
      return [{ ok: true, name: "Frankfurter", value: { name: "Frankfurter", date: "2026-11-01", rates: { INR: 88 } } }];
    }
  });
  await first.getRates("USD", ["INR"]);
  assert.equal(records.size, 1);

  const second = createRatesService({
    store,
    now: () => Date.parse("2026-11-01T00:01:00Z"),
    providerFetcher: async () => { throw new Error("should use persisted cache"); }
  });
  const restored = await second.getRates("USD", ["INR"]);
  assert.equal(restored.rates.INR, 88);
  assert.equal(restored.cache, "hit");
  assert.equal(calls, 1);
});

test("uses Mongo-persisted data as stale fallback after providers fail", async () => {
  const records = new Map();
  const store = {
    async get(key) { return records.get(key) || null; },
    async set(key, entry) { records.set(key, entry); }
  };
  const initial = createRatesService({
    store,
    now: () => Date.parse("2026-11-01T00:00:00Z"),
    providerFetcher: async () => [{ ok: true, name: "Frankfurter", value: { name: "Frankfurter", date: "2026-11-01", rates: { INR: 88 } } }]
  });
  await initial.getRates("USD", ["INR"]);

  const restarted = createRatesService({
    store,
    cacheTtlMs: 1000,
    staleMaxAgeMs: 86400000,
    now: () => Date.parse("2026-11-01T00:10:00Z"),
    providerFetcher: async () => [{ ok: false, name: "Frankfurter", error: "offline" }]
  });
  const result = await restarted.getRates("USD", ["INR"]);
  assert.equal(result.status, "stale");
  assert.equal(result.rates.INR, 88);
});
