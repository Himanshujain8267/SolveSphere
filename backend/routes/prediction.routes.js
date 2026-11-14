import express from "express";
import { createLpaPrediction } from "../controllers/lpa-prediction.controller.js";

const predictionRouter = express.Router();

predictionRouter.post("/lpa", createLpaPrediction);

export default predictionRouter;
