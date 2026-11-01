const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest";
const OPEN_ER_URL = "https://open.er-api.com/v6/latest";

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeRates(rawRates, requestedSymbols) {
  const rates = {};
  for (const symbol of requestedSymbols) {
    const value = Number(rawRates?.[symbol]);
    if (Number.isFinite(value) && value > 0) rates[symbol] = value;
  }
  return rates;
}

export async function fetchFrankfurter(base, symbols, timeoutMs) {
  const url = new URL(FRANKFURTER_URL);
  url.searchParams.set("base", base);
  url.searchParams.set("symbols", symbols.join(","));
  const data = await fetchJson(url, timeoutMs);
  if (!data?.date || !data?.rates) throw new Error("Unexpected Frankfurter response");
  return {
    name: "Frankfurter",
    date: data.date,
    rates: normalizeRates(data.rates, symbols)
  };
}

export async function fetchOpenEr(base, symbols, timeoutMs) {
  const data = await fetchJson(`${OPEN_ER_URL}/${encodeURIComponent(base)}`, timeoutMs);
  if (data?.result !== "success" || !data?.time_last_update_utc || !data?.rates) {
    throw new Error(data?.["error-type"] || "Unexpected Open ER API response");
  }
  const date = Number.isFinite(Number(data.time_last_update_unix))
    ? new Date(Number(data.time_last_update_unix) * 1000).toISOString().slice(0, 10)
    : new Date(data.time_last_update_utc).toISOString().slice(0, 10);
  return {
    name: "Open ER API",
    date,
    rates: normalizeRates(data.rates, symbols)
  };
}

export async function fetchProviders(base, symbols, timeoutMs) {
  const tasks = [
    ["Frankfurter", () => fetchFrankfurter(base, symbols, timeoutMs)],
    ["Open ER API", () => fetchOpenEr(base, symbols, timeoutMs)]
  ];
  const settled = await Promise.all(tasks.map(async ([name, fn]) => {
    try {
      return { ok: true, value: await fn(), name };
    } catch (error) {
      return { ok: false, name, error: error?.name === "AbortError" ? "Request timed out" : error.message };
    }
  }));
  return settled;
}
