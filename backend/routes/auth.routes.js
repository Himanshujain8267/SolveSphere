import express from "express";
import { login, getCurrentUser, logout } from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const authRouter = express.Router();

/**
 * POST /api/auth/login
 * Public route (token verification happens in middleware)
 * Requires: Authorization: Bearer <Firebase_ID_TOKEN>
 * Creates/updates application user and returns user data
 */
authRouter.post("/login", authMiddleware, login);

/**
 * GET /api/auth/me
 * Protected route
 * Returns current authenticated user information
 */
authRouter.get("/me", authMiddleware, getCurrentUser);

/**
 * POST /api/auth/logout
 * Protected route
 * Logs out the user (client-side Firebase sign-out still needed)
 */
authRouter.post("/logout", authMiddleware, logout);



export default authRouter