import {
  getLeetCodeContest,
  getLeetCodeProfile,
  getLeetCodeSolved,
} from "./leetcode.service.js";

const REQUEST_TIMEOUT_MS = 12000;

const asNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const requestJson = async (url, platform, headers = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", ...headers },
    });

    if (!response.ok) {
      throw new Error(`${platform} stats service returned HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`${platform} stats request timed out`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`${platform} stats service returned invalid data`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const getLeetCodeStats = async (username) => {
  const [profileResponse, solvedResponse, contestResponse] = await Promise.all([
    getLeetCodeProfile(username),
    getLeetCodeSolved(username),
    getLeetCodeContest(username).catch(() => null),
  ]);
  const profile = profileResponse?.data || profileResponse || {};
  const solved = solvedResponse?.data || solvedResponse || {};
  const contest = contestResponse?.data?.userContestRanking
    || contestResponse?.userContestRanking
    || contestResponse?.data
    || contestResponse
    || {};
  const contestParticipation = contestResponse?.data?.contestParticipation
    || contestResponse?.contestParticipation
    || [];
  const ratingHistory = contestParticipation
    .map((participation) => ({
      contestName: participation?.contest?.title || participation?.contestName || "Contest",
      startTime: asNumber(participation?.contest?.startTime),
      rating: asNumber(participation?.rating),
    }))
    .filter(({ rating }) => rating !== null)
    .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))
    .slice(-12);
  const easySolved = asNumber(solved.easySolved, solved.easy, solved.easySolvedCount);
  const mediumSolved = asNumber(solved.mediumSolved, solved.medium, solved.mediumSolvedCount);
  const hardSolved = asNumber(solved.hardSolved, solved.hard, solved.hardSolvedCount);
  const solvedTotal = asNumber(solved.solvedProblem, solved.totalSolved, solved.totalSolvedCount);
  const difficultyTotal = [easySolved, mediumSolved, hardSolved].every(Number.isFinite)
    ? easySolved + mediumSolved + hardSolved
    : null;

  return {
    stats: {
      solved: solvedTotal ?? difficultyTotal,
      easySolved,
      mediumSolved,
      hardSolved,
      ranking: asNumber(profile.ranking, profile.profile?.ranking),
      contestRating: asNumber(
        contest.contestRating,
        contest.rating,
        contestResponse?.contestRating,
        profile.contestRating
      ),
      contestGlobalRanking: asNumber(
        contest.contestGlobalRanking,
        contest.globalRanking,
        contestResponse?.contestGlobalRanking
      ),
      ratingHistory,
    },
  };
};

export const getLeetCodeContestRating = async (username) => {
  const response = await getLeetCodeContest(username);
  const contest = response?.data?.userContestRanking
    || response?.userContestRanking
    || response?.data
    || response
    || {};

  return asNumber(
    contest.contestRating,
    contest.rating,
    response?.contestRating
  );
};

const getGeeksForGeeksStats = async (username) => {
  // GFG does not provide a stable public stats API; this public community endpoint is best-effort.
  const payload = await requestJson(
    `https://geeks-for-geeks-api.vercel.app/${encodeURIComponent(username)}`,
    "GeeksforGeeks"
  );
  if (payload?.success === false) {
    throw new Error(payload.message || "GeeksforGeeks stats are unavailable");
  }

  const info = payload.info || payload.data?.info || payload.data || payload;
  const solvedStats = payload.solvedStats || payload.data?.solvedStats || info.solvedStats || {};
  const getCategoryCount = (category) => {
    const entry = Object.entries(solvedStats).find(([key]) => key.toLowerCase() === category.toLowerCase())?.[1];
    if (typeof entry === "number" || typeof entry === "string") return asNumber(entry);
    return asNumber(entry?.count, entry?.solved, entry?.total, entry?.problemsSolved);
  };
  const solved = asNumber(
    info.totalProblemsSolved,
    info.total_problems_solved,
    info.problemsSolved,
    payload.totalProblemsSolved,
    payload.total_problems_solved
  );

  return {
    stats: {
      solved,
      schoolSolved: getCategoryCount("school"),
      basicSolved: getCategoryCount("basic"),
      easySolved: getCategoryCount("easy"),
      mediumSolved: getCategoryCount("medium"),
      hardSolved: getCategoryCount("hard"),
      codingScore: asNumber(info.codingScore, info.coding_score, payload.codingScore),
      currentStreak: asNumber(info.currentStreak, info.current_streak, payload.currentStreak),
      maxStreak: asNumber(info.maxStreak, info.max_streak, payload.maxStreak),
    },
  };
};

const getCodeforcesStats = async (username) => {
  const encodedUsername = encodeURIComponent(username);
  const [userInfo, submissions, ratingHistoryResponse] = await Promise.all([
    requestJson(
      `https://codeforces.com/api/user.info?handles=${encodedUsername}`,
      "Codeforces"
    ),
    requestJson(
      `https://codeforces.com/api/user.status?handle=${encodedUsername}`,
      "Codeforces"
    ),
    requestJson(
      `https://codeforces.com/api/user.rating?handle=${encodedUsername}`,
      "Codeforces"
    ).catch(() => null),
  ]);

  const user = userInfo.status === "OK" ? userInfo.result?.[0] : null;
  if (!user) {
    throw new Error(userInfo.comment || "Codeforces profile was not found");
  }
  if (submissions.status !== "OK") {
    throw new Error(submissions.comment || "Codeforces submissions are unavailable");
  }

  const acceptedProblems = new Set();
  const contests = new Set();
  for (const submission of submissions.result || []) {
    if (submission.contestId !== undefined) contests.add(submission.contestId);
    if (submission.verdict === "OK" && submission.problem) {
      acceptedProblems.add(`${submission.problem.contestId ?? submission.contestId}:${submission.problem.index ?? submission.problem.name}`);
    }
  }
  const ratingHistory = ratingHistoryResponse?.status === "OK"
    ? (ratingHistoryResponse.result || []).slice(-12).map((contest) => ({
      contestName: contest.contestName,
      rating: asNumber(contest.newRating),
      ratingChange: asNumber(contest.newRating) - (asNumber(contest.oldRating) ?? 0),
    })).filter((contest) => contest.rating !== null)
    : [];

  return {
    stats: {
      solved: acceptedProblems.size,
      rating: asNumber(user.rating),
      maxRating: asNumber(user.maxRating),
      rank: user.rank || null,
      contests: contests.size,
      ratingHistory,
    },
  };
};

const getGitHubStats = async (username) => {
  const user = await requestJson(
    `https://api.github.com/users/${encodeURIComponent(username)}`,
    "GitHub",
    { "User-Agent": "SolveSphere", "X-GitHub-Api-Version": "2022-11-28" }
  );

  return {
    stats: {
      publicRepos: asNumber(user.public_repos),
      followers: asNumber(user.followers),
      following: asNumber(user.following),
      publicGists: asNumber(user.public_gists),
    },
  };
};

const providers = {
  leetcode: getLeetCodeStats,
  geeksforgeeks: getGeeksForGeeksStats,
  codeforces: getCodeforcesStats,
  github: getGitHubStats,
};

export const getPlatformDashboard = async (savedPlatforms = {}) => {
  const results = await Promise.all(
    Object.entries(providers).map(async ([platform, getStats]) => {
      const username = savedPlatforms[platform] || null;
      if (!username) {
        return [platform, { connected: false, username: null, stats: null, error: null }];
      }

      try {
        const result = await getStats(username);
        return [platform, { connected: true, username, ...result, error: null }];
      } catch (error) {
        return [platform, {
          connected: true,
          username,
          stats: null,
          error: error.message || `${platform} stats are temporarily unavailable`,
        }];
      }
    })
  );

  return Object.fromEntries(results);
};
