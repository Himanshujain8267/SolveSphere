import PlatformProfile from "../models/PlatformProfile.js";
import PreparationPlan from "../models/PreparationPlan.js";
import {
  PlatformValidationError,
  supportedPlatforms,
  validatePlatformHandle,
} from "../services/platform-validation.service.js";
import {
  getLeetCodeContestRating,
  getPlatformDashboard as collectPlatformDashboard,
} from "../services/platform-dashboard.service.js";
import { generateLeetCodeStudyPlan } from "../services/preparation-plan.service.js";

const getUserInfo = (user) => ({
  email: user.email || null,
  displayName: user.displayName || null,
});

export const getPlatformProfile = async (req, res) => {
  try {
    const profile = await PlatformProfile.findOne({ firebaseUid: req.user.firebaseUid });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "No platform IDs have been saved for this user",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: { firebaseUid: profile.firebaseUid, ...profile.userInfo.toObject() },
        platforms: profile.platforms.toObject(),
      },
    });
  } catch (error) {
    console.error("Get platform profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve platform IDs",
    });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const profile = await PlatformProfile.findOne({ firebaseUid: req.user.firebaseUid });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Save your platform IDs before loading the dashboard",
      });
    }

    const platforms = await collectPlatformDashboard(profile.platforms.toObject());
    return res.status(200).json({
      success: true,
      data: {
        user: { firebaseUid: profile.firebaseUid, ...profile.userInfo.toObject() },
        updatedAt: profile.updatedAt,
        platforms,
      },
    });
  } catch (error) {
    console.error("Get platform dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve platform dashboard data",
    });
  }
};

export const createPreparationPlan = async (req, res) => {
  const fallbackDifficulty = req.body?.fallbackDifficulty;
  const fallbackRatings = { Easy: 1000, Medium: 1500, Hard: 2000 };

  if (
    fallbackDifficulty !== undefined
    && !Object.hasOwn(fallbackRatings, fallbackDifficulty)
  ) {
    return res.status(400).json({
      success: false,
      message: "Choose Easy, Medium, or Hard as your fallback difficulty",
      code: "INVALID_FALLBACK_DIFFICULTY",
    });
  }

  try {
    const activePlan = await PreparationPlan.findOne({
      firebaseUid: req.user.firebaseUid,
      planType: "level",
    }).lean();
    if (activePlan) {
      return res.status(200).json({
        success: true,
        data: activePlan,
      });
    }

    const profile = await PlatformProfile.findOne({ firebaseUid: req.user.firebaseUid });
    const username = profile?.platforms?.leetcode;
    if (!username) {
      return res.status(409).json({
        success: false,
        message: "Connect a LeetCode username before generating your study plan.",
        code: "LEETCODE_NOT_CONNECTED",
      });
    }

    let contestRating = null;
    try {
      contestRating = await getLeetCodeContestRating(username);
    } catch (error) {
      console.warn("LeetCode contest rating unavailable for preparation plan:", error.message);
    }

    const hasContestRating = Number.isFinite(contestRating);
    if (!hasContestRating && !fallbackDifficulty) {
      return res.status(409).json({
        success: false,
        message: "We couldn't retrieve a LeetCode contest rating. Choose a starting difficulty to continue.",
        code: "LEVEL_REQUIRED",
        data: { username },
      });
    }

    const rating = hasContestRating
      ? Math.round(contestRating)
      : fallbackRatings[fallbackDifficulty];
    const recommendations = await generateLeetCodeStudyPlan(rating, 5);
    const planData = {
      username,
      currentRating: rating,
      ratingSource: hasContestRating ? "contest_rating" : "self_assessment",
      recommendations,
    };
    await PreparationPlan.findOneAndUpdate(
      { firebaseUid: req.user.firebaseUid, planType: "level" },
      { $set: planData },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      data: planData,
    });
  } catch (error) {
    console.error("Create preparation plan error:", error);
    return res.status(502).json({
      success: false,
      message: "Unable to generate your LeetCode plan right now. Check the backend's Python setup and try again.",
      code: "PREPARATION_PLAN_UNAVAILABLE",
    });
  }
};

export const savePlatformProfile = async (req, res) => {
  const submittedPlatforms = req.body?.platforms;

  if (!submittedPlatforms || typeof submittedPlatforms !== "object" || Array.isArray(submittedPlatforms)) {
    return res.status(400).json({
      success: false,
      message: "Provide platform IDs in a platforms object",
    });
  }

  const submittedKeys = Object.keys(submittedPlatforms);
  if (!submittedKeys.length) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one platform ID",
    });
  }

  const unsupportedPlatforms = submittedKeys.filter((platform) => !supportedPlatforms.includes(platform));
  if (unsupportedPlatforms.length) {
    return res.status(400).json({
      success: false,
      message: `Unsupported platforms: ${unsupportedPlatforms.join(", ")}`,
    });
  }

  try {
    const validatedPlatforms = {};
    await Promise.all(
      submittedKeys.map(async (platform) => {
        const handle = submittedPlatforms[platform];
        validatedPlatforms[platform] = handle === null
          ? null
          : await validatePlatformHandle(platform, handle);
      })
    );

    const updates = {
      "userInfo.email": req.user.email || null,
      "userInfo.displayName": req.user.displayName || null,
    };
    for (const [platform, handle] of Object.entries(validatedPlatforms)) {
      updates[`platforms.${platform}`] = handle;
    }

    const profile = await PlatformProfile.findOneAndUpdate(
      { firebaseUid: req.user.firebaseUid },
      { $set: updates },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Platform IDs saved",
      data: {
        user: { firebaseUid: profile.firebaseUid, ...profile.userInfo.toObject() },
        platforms: profile.platforms.toObject(),
      },
    });
  } catch (error) {
    if (error instanceof PlatformValidationError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    console.error("Save platform profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save platform IDs",
    });
  }
};