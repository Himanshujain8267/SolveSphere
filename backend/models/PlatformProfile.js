import mongoose from "mongoose";

const platformsSchema = new mongoose.Schema(
  {
    leetcode: { type: String, default: null, trim: true },
    geeksforgeeks: { type: String, default: null, trim: true },
    codeforces: { type: String, default: null, trim: true },
    github: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const userInfoSchema = new mongoose.Schema(
  {
    email: { type: String, default: null, lowercase: true, trim: true },
    displayName: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const platformProfileSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    userInfo: { type: userInfoSchema, default: () => ({}) },
    platforms: { type: platformsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const PlatformProfile = mongoose.model("PlatformProfile", platformProfileSchema);

export default PlatformProfile;