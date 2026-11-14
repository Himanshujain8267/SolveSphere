import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true, maxlength: 120 },
    problem_id: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    platform: { type: String, enum: ["LeetCode", "Codeforces"], required: true },
    url: { type: String, required: true, trim: true },
    difficulty: { type: Number, required: true, min: 0, max: 10000 },
    tags: { type: String, default: "", trim: true, maxlength: 1000 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const preparationPlanSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true },
    planType: { type: String, enum: ["level", "topic"], required: true },
    username: { type: String, default: null, trim: true },
    currentRating: { type: Number, default: null, min: 0, max: 10000 },
    ratingSource: { type: String, enum: ["contest_rating", "self_assessment"], default: null },
    topic: { type: String, default: null, trim: true, maxlength: 120 },
    recommendations: {
      type: [recommendationSchema],
      required: true,
      validate: {
        validator: (recommendations) => recommendations.length > 0,
        message: "A preparation plan must contain at least one question",
      },
    },
  },
  { timestamps: true }
);

preparationPlanSchema.index({ firebaseUid: 1, planType: 1 }, { unique: true });

const PreparationPlan = mongoose.model("PreparationPlan", preparationPlanSchema);

export default PreparationPlan;
