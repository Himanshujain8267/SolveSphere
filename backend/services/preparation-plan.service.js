import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const recommendationDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../ML/recommendation"
);
const recommendationScript = resolve(recommendationDirectory, "02_recommend.py");
const MAX_PLAN_SIZE = 10;

const runRecommender = async (args) => {
  const pythonExecutable = process.env.PYTHON_EXECUTABLE
    || (process.platform === "win32" ? "python" : "python3");
  const { stdout } = await execFileAsync(
    pythonExecutable,
    [recommendationScript, ...args, "--json"],
    {
      cwd: recommendationDirectory,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    }
  );

  let result;
  try {
    result = JSON.parse(stdout);
  } catch (error) {
    throw new Error("The recommendation engine returned invalid JSON", { cause: error });
  }

  return result;
};

const validatePlanSize = (count) => {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PLAN_SIZE) {
    throw new Error(`Study plan size must be between 1 and ${MAX_PLAN_SIZE}`);
  }
};

export const generateLeetCodeStudyPlan = async (rating, count = 5) => {
  if (!Number.isInteger(rating) || rating < 0 || rating > 10000) {
    throw new Error("A valid LeetCode contest rating is required");
  }
  validatePlanSize(count);

  const result = await runRecommender([
    "--rating", String(rating),
    "--platform", "LeetCode",
    "--count", String(count),
  ]);
  if (!Array.isArray(result.recommendations)) {
    throw new Error("The recommendation engine returned an invalid study plan");
  }
  return result.recommendations;
};

export const getPreparationTopics = async () => {
  const result = await runRecommender([
    "--platform", "Codeforces",
    "--list-topics",
  ]);

  if (!Array.isArray(result.topics) || result.topics.some((topic) => typeof topic !== "string")) {
    throw new Error("The recommendation engine returned an invalid topic list");
  }
  return result.topics;
};

export const generateTopicStudyPlan = async (topic, count = 5) => {
  if (typeof topic !== "string" || !topic.trim() || topic.trim().length > 120) {
    throw new Error("A valid topic is required");
  }
  validatePlanSize(count);

  const result = await runRecommender([
    "--platform", "Codeforces",
    "--topic", topic.trim(),
    "--count", String(count),
  ]);

  if (!Array.isArray(result.recommendations)) {
    throw new Error("The recommendation engine returned an invalid topic plan");
  }
  return result;
};
