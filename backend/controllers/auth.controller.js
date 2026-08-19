import User from "../models/User.js";

/**
 * Login Controller
 * Receives authenticated Firebase user from middleware
 * Creates or updates application user
 */
export const login = async (req, res) => {
  try {
    // Get authenticated user from middleware
    const { firebaseUid, email, phoneNumber, displayName, photoURL, provider, emailVerified } = req.user;

    // Validate required information
    if (!firebaseUid || (!email && !phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Firebase user information",
      });
    }

    // Find existing user by Firebase UID
    let user = await User.findOne({ firebaseUid });

    if (user) {
      // Update last login time
      user.lastLogin = new Date();

      // Update profile information if provided
      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (email) user.email = email;
      user.provider = provider;
      user.isEmailVerified = emailVerified;
      user.isPhoneVerified = Boolean(phoneNumber);

      await user.save();
    } else {
      // Create new user
      user = new User({
        firebaseUid,
        email,
        phoneNumber: phoneNumber || null,
        displayName: displayName || null,
        photoURL: photoURL || null,
        provider,
        isEmailVerified: emailVerified,
        isPhoneVerified: Boolean(phoneNumber),
        lastLogin: new Date(),
      });

      await user.save();
    }

    // Return user data
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          provider: user.provider,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get Current User Controller
 * Returns authenticated user information
 */
export const getCurrentUser = async (req, res) => {
  try {
    const { firebaseUid } = req.user;

    // Find user in application database
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in application database",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          provider: user.provider,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user information",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Logout Controller
 * Note: Frontend handles Firebase sign-out
 * Backend doesn't need to do anything special
 * Optional: Revoke tokens if token revocation is needed
 */
export const logout = async (req, res) => {
  try {
    // If token revocation is needed in future, implement here
    // For now, just acknowledge logout from client side

    return res.status(200).json({
      success: true,
      message: "Logged out successfully. Please sign out from Firebase on the client.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};
