import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const predictionScript = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../ML/src/08_predict_package.py"
);
const MAX_PROFILE_JSON_LENGTH = 10000;
const MAX_OUTPUT_LENGTH = 64 * 1024;
const PROCESS_TIMEOUT_MS = 30000;
const MAX_CONCURRENT_PREDICTIONS = 2;
let activePredictions = 0;

export class LpaPredictionServiceError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "LpaPredictionServiceError";
    this.code = code;
  }
}

const runPredictionProcess = (profileJson) => new Promise((resolvePromise, rejectPromise) => {
  const pythonExecutable = process.env.PYTHON_EXECUTABLE
    || (process.platform === "win32" ? "python" : "python3");
  let child;

  try {
    child = spawn(pythonExecutable, [predictionScript], {
      cwd: dirname(predictionScript),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    rejectPromise(new LpaPredictionServiceError(
      "Unable to start the package prediction process",
      "LPA_MODEL_UNAVAILABLE"
    ));
    return;
  }

  let stdout = "";
  let outputTooLarge = false;
  let timedOut = false;
  let settled = false;

  const settle = (handler, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    handler(value);
  };

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, PROCESS_TIMEOUT_MS);

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    if (stdout.length + chunk.length > MAX_OUTPUT_LENGTH) {
      outputTooLarge = true;
      child.kill();
      return;
    }
    stdout += chunk;
  });
  child.stderr.resume();
  child.on("error", () => {
    settle(rejectPromise, new LpaPredictionServiceError(
      "Unable to start the package prediction process",
      "LPA_MODEL_UNAVAILABLE"
    ));
  });
  child.on("close", (code) => {
    if (timedOut) {
      settle(rejectPromise, new LpaPredictionServiceError(
        "The package prediction process timed out",
        "LPA_MODEL_TIMEOUT"
      ));
      return;
    }
    if (outputTooLarge) {
      settle(rejectPromise, new LpaPredictionServiceError(
        "The package prediction process returned too much output",
        "LPA_MODEL_INVALID_OUTPUT"
      ));
      return;
    }
    if (code !== 0) {
      settle(rejectPromise, new LpaPredictionServiceError(
        "The package prediction process failed",
        "LPA_MODEL_UNAVAILABLE"
      ));
      return;
    }

    try {
      const result = JSON.parse(stdout);
      if (
        !Number.isFinite(result?.estimatedLpa)
        || result.source !== "synthetic_demo_model"
      ) {
        throw new Error("The package prediction model returned an invalid estimate");
      }
      settle(resolvePromise, result);
    } catch {
      settle(rejectPromise, new LpaPredictionServiceError(
        "The package prediction model returned invalid output",
        "LPA_MODEL_INVALID_OUTPUT"
      ));
    }
  });

  child.stdin.on("error", () => {
    child.kill();
  });
  child.stdin.end(profileJson);
});

export const predictPackageLpa = async (profile) => {
  const profileJson = JSON.stringify(profile);
  if (profileJson.length > MAX_PROFILE_JSON_LENGTH) {
    throw new LpaPredictionServiceError(
      "Student profile input is too large",
      "LPA_PROFILE_TOO_LARGE"
    );
  }
  if (activePredictions >= MAX_CONCURRENT_PREDICTIONS) {
    throw new LpaPredictionServiceError(
      "The package prediction service is at capacity",
      "LPA_MODEL_BUSY"
    );
  }

  activePredictions += 1;
  try {
    return await runPredictionProcess(profileJson);
  } finally {
    activePredictions -= 1;
  }
};
