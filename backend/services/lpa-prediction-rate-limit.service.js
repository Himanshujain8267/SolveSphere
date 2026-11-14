import { createHash } from "node:crypto";
import LpaPredictionUsage from "../models/LpaPredictionUsage.js";

export const LPA_PREDICTION_WINDOW_MS = 15 * 60 * 1000;
export const LPA_PREDICTION_MAX_REQUESTS = 5;

let ttlIndexPromise;

const ensureTtlIndex = async () => {
  if (!ttlIndexPromise) {
    ttlIndexPromise = LpaPredictionUsage.collection
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((error) => {
        ttlIndexPromise = null;
        throw error;
      });
  }

  await ttlIndexPromise;
};

const incrementUsage = async (id, insertFields) => {
  try {
    return await LpaPredictionUsage.findOneAndUpdate(
      { _id: id },
      {
        $setOnInsert: insertFields,
        $inc: { requestCount: 1 },
      },
      { new: true, upsert: true }
    ).lean();
  } catch (error) {
    if (error?.code !== 11000) throw error;

    return LpaPredictionUsage.findOneAndUpdate(
      { _id: id },
      { $inc: { requestCount: 1 } },
      { new: true }
    ).lean();
  }
};

export const consumeLpaPredictionQuota = async (firebaseUid, now = Date.now()) => {
  if (typeof firebaseUid !== "string" || !firebaseUid) {
    throw new TypeError("A verified Firebase user ID is required for LPA rate limiting");
  }

  await ensureTtlIndex();

  const windowStartedAtMs = Math.floor(now / LPA_PREDICTION_WINDOW_MS)
    * LPA_PREDICTION_WINDOW_MS;
  const firebaseUidHash = createHash("sha256").update(firebaseUid).digest("hex");
  const id = `${firebaseUidHash}:${windowStartedAtMs}`;
  const windowStartedAt = new Date(windowStartedAtMs);
  const expiresAt = new Date(windowStartedAtMs + 2 * LPA_PREDICTION_WINDOW_MS);
  const usage = await incrementUsage(id, {
    firebaseUidHash,
    windowStartedAt,
    expiresAt,
  });

  if (!usage) {
    throw new Error("Unable to record LPA prediction usage");
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStartedAtMs + LPA_PREDICTION_WINDOW_MS - now) / 1000)
  );

  return {
    allowed: usage.requestCount <= LPA_PREDICTION_MAX_REQUESTS,
    limit: LPA_PREDICTION_MAX_REQUESTS,
    remaining: Math.max(0, LPA_PREDICTION_MAX_REQUESTS - usage.requestCount),
    retryAfterSeconds,
  };
};
