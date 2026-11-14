const DEFAULT_BASE_URL = "https://alfa-leetcode-api.onrender.com";
const REQUEST_TIMEOUT_MS = 10000;

export class LeetCodeApiError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "LeetCodeApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const getBaseUrl = () =>
  (process.env.LEETCODE_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

const request = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (body?.data?.matchedUser === null) {
      throw new LeetCodeApiError("LeetCode user not found", 404, "USER_NOT_FOUND");
    }

    if (response.status === 404) {
      throw new LeetCodeApiError("LeetCode user not found", 404, "USER_NOT_FOUND");
    }

    if (response.status === 429) {
      throw new LeetCodeApiError(
        "LeetCode API rate limit exceeded",
        429,
        "RATE_LIMITED",
      );
    }

    if (!response.ok) {
      throw new LeetCodeApiError(
        "LeetCode API request failed",
        502,
        "UPSTREAM_FAILURE",
      );
    }

    return body;
  } catch (error) {
    if (error instanceof LeetCodeApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new LeetCodeApiError(
        "LeetCode API request timed out",
        504,
        "UPSTREAM_TIMEOUT",
      );
    }

    throw new LeetCodeApiError(
      "Unable to reach LeetCode API",
      502,
      "UPSTREAM_FAILURE",
    );
  } finally {
    clearTimeout(timeout);
  }
};

export const getLeetCodeProfile = async (username) =>
  request(`/${encodeURIComponent(username)}/profile`);

export const getLeetCodeSolved = async (username) =>
  request(`/${encodeURIComponent(username)}/solved`);

export const getLeetCodeContest = async (username) =>
  request(`/${encodeURIComponent(username)}/contest`);