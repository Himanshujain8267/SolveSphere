import admin from "../config/firebase.js";

/**
 * Authentication middleware
 * Verifies Firebase ID token from Authorization header
 * Attaches decoded user information to req.user
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Extract authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Missing Authorization header",
      });
    }

    // Extract Bearer token
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid Authorization header format. Expected: Bearer <token>",
      });
    }

    const idToken = parts[1];

    if (!admin.apps.length) {
      return res.status(503).json({
        success: false,
        message: "Firebase authentication is not configured on the server",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      let message = "Invalid or expired token";
      if (error.code === "auth/id-token-expired") {
        message = "ID token has expired";
      } else if (error.code === "auth/id-token-revoked") {
        message = "ID token has been revoked";
      }
      return res.status(401).json({
        success: false,
        message: message,
      });
    }

    // Attach verified user information to request
    req.user = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      phoneNumber: decodedToken.phone_number || null,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
      emailVerified: decodedToken.email_verified || false,
      phoneVerified: decodedToken.phone_number ? true : false,
      // Provider information
      provider: decodedToken.firebase?.identities 
        ? getProviderFromToken(decodedToken) 
        : "email",
      decodedToken: decodedToken, // Full token for reference if needed
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

/**
 * Helper function to determine provider from Firebase token
 */
function getProviderFromToken(decodedToken) {
  const identities = decodedToken.firebase.identities || {};

  if (identities["google.com"]) {
    return "google";
  } else if (identities["phone"]) {
    return "phone";
  } else if (identities["email"]) {
    return "email";
  }

  return "email"; // default
}

export default authMiddleware;
