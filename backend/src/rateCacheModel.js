import mongoose from "mongoose";

const rateCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  base: { type: String, required: true, uppercase: true },
  symbols: { type: [String], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  cachedAt: { type: Date, required: true, index: true }
}, { timestamps: true, minimize: false });

export const RateCache = mongoose.models.RateCache || mongoose.model("RateCache", rateCacheSchema);

export async function connectDatabase(uri) {
  if (!uri) {
    console.warn("MONGODB_URI is not set. Running with in-memory cache only.");
    return false;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected");
  return true;
}

export function createMongoRateStore() {
  return {
    async get(key) {
      if (mongoose.connection.readyState !== 1) return null;
      const document = await RateCache.findOne({ key }).lean();
      if (!document) return null;
      return { payload: document.payload, cachedAt: new Date(document.cachedAt).getTime() };
    },
    async set(key, entry) {
      if (mongoose.connection.readyState !== 1) return;
      const [base, ...symbolParts] = key.split(":");
      await RateCache.updateOne(
        { key },
        { $set: {
          base,
          symbols: symbolParts.join(":").split(",").filter(Boolean),
          payload: entry.payload,
          cachedAt: new Date(entry.cachedAt)
        } },
        { upsert: true, runValidators: true }
      );
    }
  };
}
