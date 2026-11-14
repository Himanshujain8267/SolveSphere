import {
  getLeetCodeProfile,
  LeetCodeApiError,
} from "./leetcode.service.js";

const REQUEST_TIMEOUT_MS = 10000;

export class PlatformValidationError extends Error {
  constructor(message, statusCode = 400, code = "INVALID_PLATFORM_ID") {
    super(message);
    this.name = "PlatformValidationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new PlatformValidationError(
        "Platform validation timed out",
        504,
        "UPSTREAM_TIMEOUT"
      );
    }

    throw new PlatformValidationError(
      "Unable to reach platform validation service",
      502,
      "UPSTREAM_FAILURE"
    );
  } finally {
    clearTimeout(timeout);
  }
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    throw new PlatformValidationError(
      "Platform validation service returned an invalid response",
      502,
      "UPSTREAM_FAILURE"
    );
  }
};

const validateLeetCode = async (handle) => {
  try {
    await getLeetCodeProfile(handle);
  } catch (error) {
    if (error instanceof LeetCodeApiError && error.statusCode === 404) {
      throw new PlatformValidationError("LeetCode user was not found");
    }
    if (error instanceof LeetCodeApiError) {
      throw new PlatformValidationError(error.message, error.statusCode, error.code);
    }
    throw error;
  }
};

const validateGeeksForGeeks = async (handle) => {
  const response = await fetchWithTimeout(
    `https://www.geeksforgeeks.org/user/${encodeURIComponent(handle)}/`,
    { headers: { Accept: "text/html", "User-Agent": "SolveSphere/1.0" } }
  );

  if (response.status === 404) {
    throw new PlatformValidationError("GeeksforGeeks user was not found");
  }
  if (!response.ok) {
    throw new PlatformValidationError(
      "GeeksforGeeks could not validate this user right now",
      502,
      "UPSTREAM_FAILURE"
    );
  }

  const html = (await response.text()).toLowerCase();
  if (html.includes("404 not found") || html.includes("page not found")) {
    throw new PlatformValidationError("GeeksforGeeks user was not found");
  }
};

const validateCodeforces = async (handle) => {
  const response = await fetchWithTimeout(
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
    { headers: { Accept: "application/json" } }
  );
  const body = await readJson(response);

  if (body.status === "OK" && body.result?.length > 0) return;
  if (/not found/i.test(body.comment || "")) {
    throw new PlatformValidationError("Codeforces user was not found");
  }

  throw new PlatformValidationError(
    "Codeforces could not validate this user right now",
    502,
    "UPSTREAM_FAILURE"
  );
};

const validateGitHub = async (handle) => {
  const response = await fetchWithTimeout(
    `https://api.github.com/users/${encodeURIComponent(handle)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "SolveSphere",
      },
    }
  );

  if (response.status === 404) {
    throw new PlatformValidationError("GitHub user was not found");
  }
  if (response.status === 403 || !response.ok) {
    throw new PlatformValidationError(
      "GitHub could not validate this user right now",
      502,
      "UPSTREAM_FAILURE"
    );
  }

  const body = await readJson(response);
  if (body.login?.toLowerCase() !== handle.toLowerCase()) {
    throw new PlatformValidationError("GitHub user was not found");
  }
};

const validators = {
  leetcode: validateLeetCode,
  geeksforgeeks: validateGeeksForGeeks,
  codeforces: validateCodeforces,
  github: validateGitHub,
};

export const supportedPlatforms = Object.keys(validators);

export const validatePlatformHandle = async (platform, value) => {
  if (!supportedPlatforms.includes(platform)) {
    throw new PlatformValidationError(`Unsupported platform: ${platform}`);
  }
  if (typeof value !== "string") {
    throw new PlatformValidationError(`${platform} ID must be a username string`);
  }

  const handle = value.trim();
  if (!handle || handle.length > 100 || /[\\/\u0000-\u001f]/.test(handle)) {
    throw new PlatformValidationError(`Invalid ${platform} username`);
  }
  if (platform === "github" && !/^[A-Za-z0-9-]{1,39}$/.test(handle)) {
    throw new PlatformValidationError("Invalid GitHub username");
  }

  await validators[platform](handle);
  return handle;
};