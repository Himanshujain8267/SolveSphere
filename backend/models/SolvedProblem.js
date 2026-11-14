import mongoose from "mongoose";

const solvedProblemSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true },
    problemId: { type: String, required: true },
    platform: { type: String, enum: ["LeetCode", "Codeforces"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    url: { type: String, required: true, trim: true },
    difficulty: { type: Number, required: true, min: 0, max: 10000 },
    topic: { type: String, default: "", trim: true, maxlength: 120 },
    solvedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

solvedProblemSchema.index({ firebaseUid: 1, problemId: 1 }, { unique: true });

const SolvedProblem = mongoose.model("SolvedProblem", solvedProblemSchema);

export default SolvedProblem;
