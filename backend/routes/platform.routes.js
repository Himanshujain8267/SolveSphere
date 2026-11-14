import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { getProfile } from "../controllers/leetcode.controller.js";
import {
	createPreparationPlan,
	getDashboard,
	getPlatformProfile,
	savePlatformProfile,
} from "../controllers/platform-profile.controller.js";
import {
	createTopicPreparationPlan,
	getActivePreparationPlans,
	getPreparationProgress,
	getTopics,
	setQuestionSolved,
} from "../controllers/preparation.controller.js";

const platformRouter = express.Router();

platformRouter.get("/leetcode/:username", authMiddleware, getProfile);
platformRouter.get("/dashboard", authMiddleware, getDashboard);
platformRouter.get("/profile", authMiddleware, getPlatformProfile);
platformRouter.patch("/profile", authMiddleware, savePlatformProfile);
platformRouter.post("/preparation-plan", authMiddleware, createPreparationPlan);
platformRouter.get("/preparation-topics", authMiddleware, getTopics);
platformRouter.post("/preparation-plan/topic", authMiddleware, createTopicPreparationPlan);
platformRouter.get("/preparation-plans", authMiddleware, getActivePreparationPlans);
platformRouter.get("/preparation-progress", authMiddleware, getPreparationProgress);
platformRouter.put("/preparation-progress", authMiddleware, setQuestionSolved);

export default platformRouter;