import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import test from "node:test";
import predictionRouter from "../routes/prediction.routes.js";
import { createLpaPrediction } from "../controllers/lpa-prediction.controller.js";
import { createCorsOptions } from "../config/cors.js";
import LpaPredictionUsage from "../models/LpaPredictionUsage.js";
import {
  consumeLpaPredictionQuota,
  LPA_PREDICTION_MAX_REQUESTS,
  LPA_PREDICTION_WINDOW_MS,
} from "../services/lpa-prediction-rate-limit.service.js";

test("production CORS requires and restricts configured frontend origins", () => {
  assert.throws(
    () => createCorsOptions({ NODE_ENV: "production" }),
    /CORS_ORIGINS must contain the deployed frontend origin/
  );

  const { origin } = createCorsOptions({
    NODE_ENV: "production",
    CORS_ORIGINS: " https://solvesphere-web.onrender.com ",
  });
  const allowed = [];
  const blocked = [];
  origin("https://solvesphere-web.onrender.com", (error, permitted) => {
    allowed.push({ error, permitted });
  });
  origin("https://attacker.example", (error, permitted) => {
    blocked.push({ error, permitted });
  });

  assert.equal(allowed[0].error, null);
  assert.equal(allowed[0].permitted, true);
  assert.equal(blocked[0].error, null);
  assert.equal(blocked[0].permitted, false);
});

test("LPA endpoint rejects requests without Firebase authentication", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/predictions", predictionRouter);
  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/predictions/lpa`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.success, false);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("LPA quota allows five requests per user and resets in the next window", async () => {
  const originalCreateIndex = LpaPredictionUsage.collection.createIndex;
  const originalFindOneAndUpdate = LpaPredictionUsage.findOneAndUpdate;
  const counts = new Map();
  const userIds = new Set();
  const userId = "test-firebase-user";
  const now = Date.UTC(2026, 10, 14, 12, 0, 0);

  LpaPredictionUsage.collection.createIndex = async () => "expiresAt_1";
  LpaPredictionUsage.findOneAndUpdate = (filter, update) => ({
    lean: async () => {
      userIds.add(filter._id);
      assert.equal(update.$inc.requestCount, 1);
      const requestCount = (counts.get(filter._id) || 0) + 1;
      counts.set(filter._id, requestCount);
      return { requestCount };
    },
  });

  try {
    const requests = [];
    for (let index = 0; index < LPA_PREDICTION_MAX_REQUESTS + 1; index += 1) {
      requests.push(await consumeLpaPredictionQuota(userId, now));
    }

    assert.equal(requests.filter(({ allowed }) => allowed).length, LPA_PREDICTION_MAX_REQUESTS);
    assert.equal(requests.at(-1).allowed, false);
    assert.equal(requests.at(-1).remaining, 0);
    assert.equal(requests.at(-1).retryAfterSeconds, 15 * 60);
    assert.equal(userIds.size, 1);
    assert.equal(userIds.has(userId), false);

    const nextWindow = await consumeLpaPredictionQuota(
      userId,
      now + LPA_PREDICTION_WINDOW_MS
    );
    assert.equal(nextWindow.allowed, true);
    assert.equal(nextWindow.remaining, LPA_PREDICTION_MAX_REQUESTS - 1);
    assert.equal(userIds.size, 2);
  } finally {
    LpaPredictionUsage.collection.createIndex = originalCreateIndex;
    LpaPredictionUsage.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("LPA controller rejects invalid student profile values before inference", async () => {
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await createLpaPrediction({ body: { age: 61 } }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "INVALID_STUDENT_PROFILE");
});
