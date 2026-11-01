import "dotenv/config";
import express from "express";
import cors from "cors";
import { createRatesService, DEFAULT_SYMBOLS } from "./ratesService.js";
import { connectDatabase, createMongoRateStore } from "./rateCacheModel.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  }
}));
app.use(express.json());

const mongoStore = createMongoRateStore();
const service = createRatesService({
  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 300000),
  staleMaxAgeMs: Number(process.env.STALE_MAX_AGE_MS || 86400000),
  timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 4000),
  store: mongoStore
});

function validCurrency(value) {
  return /^[A-Z]{3}$/.test(value);
}

app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "ratewise-api",
  database: process.env.MONGODB_URI ? "configured" : "not-configured"
}));

app.get("/api/rates", async (req, res) => {
  const base = String(req.query.base || "USD").toUpperCase();
  const symbolsRaw = req.query.symbols == null
    ? DEFAULT_SYMBOLS.join(",")
    : String(req.query.symbols);
  const symbols = [...new Set(symbolsRaw.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean))];

  if (!validCurrency(base)) {
    return res.status(400).json({ error: "Invalid base currency. Use a three-letter currency code." });
  }
  if (symbols.length === 0 || symbols.length > 30 || symbols.some((symbol) => !validCurrency(symbol))) {
    return res.status(400).json({ error: "Provide 1–30 comma-separated three-letter currency codes." });
  }
  if (symbols.includes(base)) {
    return res.status(400).json({ error: "Base currency cannot also be included in symbols." });
  }

  try {
    const result = await service.getRates(base, symbols);
    return res.json(result);
  } catch (error) {
    return res.status(503).json({
      error: "Exchange rates are temporarily unavailable. Please try again shortly.",
      details: error.message,
      providers: error.providers || []
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error.message === "Origin not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  console.error("Unhandled request error:", error);
  return res.status(500).json({ error: "Unexpected server error." });
});

async function start() {
  try {
    await connectDatabase(process.env.MONGODB_URI);
  } catch (error) {
    console.error("MongoDB connection failed; continuing with in-memory cache:", error.message);
  }
  app.listen(port, () => console.log(`Ratewise API listening on port ${port}`));
}

start();
