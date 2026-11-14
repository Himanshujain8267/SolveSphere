import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const predictionScript = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../ML/src/08_predict_package.py"
);
const MAX_PROFILE_JSON_LENGTH = 10000;

export const predictPackageLpa = async (profile) => {
  const pythonExecutable = process.env.PYTHON_EXECUTABLE
    || (process.platform === "win32" ? "python" : "python3");
  const profileJson = JSON.stringify(profile);
  if (profileJson.length > MAX_PROFILE_JSON_LENGTH) {
    throw new Error("Student profile input is too large");
  }

  const { stdout } = await execFileAsync(
    pythonExecutable,
    [predictionScript, "--input-json", profileJson],
    {
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    }
  );

  let result;
  try {
    result = JSON.parse(stdout);
  } catch (error) {
    throw new Error("The package prediction model returned invalid JSON", { cause: error });
  }

  if (
    !Number.isFinite(result.estimatedLpa)
    || result.source !== "synthetic_demo_model"
  ) {
    throw new Error("The package prediction model returned an invalid estimate");
  }
  return result;
};
