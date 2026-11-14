import express from "express";
import { createLpaPrediction } from "../controllers/lpa-prediction.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { lpaPredictionRateLimit } from "../middlewares/lpa-prediction-rate-limit.middleware.js";

const predictionRouter = express.Router();

predictionRouter.post("/lpa", authMiddleware, lpaPredictionRateLimit, createLpaPrediction);

export default predictionRouter;
