import { consumeLpaPredictionQuota } from "../services/lpa-prediction-rate-limit.service.js";

export const lpaPredictionRateLimit = async (req, res, next) => {
  res.set("Cache-Control", "no-store");

  try {
    const quota = await consumeLpaPredictionQuota(req.user.firebaseUid);
    res.set("RateLimit-Limit", String(quota.limit));
    res.set("RateLimit-Remaining", String(quota.remaining));
    res.set("RateLimit-Reset", String(quota.retryAfterSeconds));

    if (!quota.allowed) {
      res.set("Retry-After", String(quota.retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: "You have reached the LPA estimate limit. Try again after the rate limit resets.",
        code: "LPA_RATE_LIMITED",
        retryAfterSeconds: quota.retryAfterSeconds,
      });
    }

    return next();
  } catch (error) {
    console.error("LPA prediction rate limit check failed:", error);
    return res.status(503).json({
      success: false,
      message: "The estimator is temporarily unavailable. Please try again shortly.",
      code: "LPA_RATE_LIMIT_UNAVAILABLE",
    });
  }
};
