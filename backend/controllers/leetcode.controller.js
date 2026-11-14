import {
  getLeetCodeProfile,
  LeetCodeApiError,
} from "../services/leetcode.service.js";

const validateUsername = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const username = value.trim();
  if (!username || username.length > 100 || /[\\/\u0000-\u001f]/.test(username)) {
    return null;
  }

  return username;
};

export const getProfile = async (req, res) => {
  const username = validateUsername(req.params.username);

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "A valid LeetCode username is required",
    });
  }

  try {
    const data = await getLeetCodeProfile(username);

    return res.status(200).json({
      success: true,
      platform: "leetcode",
      username,
      data,
    });
  } catch (error) {
    if (error instanceof LeetCodeApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("LeetCode profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve LeetCode profile",
    });
  }
};