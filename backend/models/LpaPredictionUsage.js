import mongoose from "mongoose";

const lpaPredictionUsageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    firebaseUidHash: { type: String, required: true },
    windowStartedAt: { type: Date, required: true },
    requestCount: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true },
  },
  {
    collection: "lpa_prediction_usage",
    versionKey: false,
  }
);

lpaPredictionUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LpaPredictionUsage = mongoose.model("LpaPredictionUsage", lpaPredictionUsageSchema);

export default LpaPredictionUsage;
