import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Firebase authentication identity
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // User profile information
    email: {
      type: String,
      required: false,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    displayName: {
      type: String,
      default: null,
    },
    photoURL: {
      type: String,
      default: null,
    },
    // Authentication provider (google, phone, email)
    provider: {
      type: String,
      enum: ["google", "phone", "email"],
      default: "email",
    },
    // User status
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Metadata
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

const User = mongoose.model("User", userSchema);

export default User;
