import SolvedProblem from "../models/SolvedProblem.js";
import PreparationPlan from "../models/PreparationPlan.js";
import {
  generateTopicStudyPlan,
  getPreparationTopics,
} from "../services/preparation-plan.service.js";

const isValidProblemUrl = (platform, value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (platform === "LeetCode") {
      return ["leetcode.com", "www.leetcode.com"].includes(url.hostname)
        && url.pathname.startsWith("/problems/");
    }
    return ["codeforces.com", "www.codeforces.com"].includes(url.hostname)
      && url.pathname.startsWith("/problemset/problem/");
  } catch {
    return false;
  }
};

export const getTopics = async (req, res) => {
  try {
    const topics = await getPreparationTopics();
    return res.status(200).json({
      success: true,
      data: { platform: "Codeforces", topics },
    });
  } catch (error) {
    console.error("Get preparation topics error:", error);
    return res.status(502).json({
      success: false,
      message: "Unable to load available topics right now.",
      code: "PREPARATION_TOPICS_UNAVAILABLE",
    });
  }
};

export const createTopicPreparationPlan = async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
  if (!topic || topic.length > 120) {
    return res.status(400).json({
      success: false,
      message: "Choose a topic from the available list.",
      code: "INVALID_TOPIC",
    });
  }

  try {
    const activePlan = await PreparationPlan.findOne({
      firebaseUid: req.user.firebaseUid,
      planType: "topic",
    }).lean();
    if (activePlan) {
      return res.status(200).json({
        success: true,
        data: activePlan,
      });
    }

    const plan = await generateTopicStudyPlan(topic, 5);
    if (!plan.recommendations.length) {
      return res.status(404).json({
        success: false,
        message: `No Codeforces questions were found for "${topic}". Choose an available topic.`,
        code: "TOPIC_NOT_FOUND",
      });
    }

    await PreparationPlan.findOneAndUpdate(
      { firebaseUid: req.user.firebaseUid, planType: "topic" },
      {
        $set: {
          topic: plan.topic,
          recommendations: plan.recommendations,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Create topic preparation plan error:", error);
    return res.status(502).json({
      success: false,
      message: "Unable to generate topic questions right now.",
      code: "TOPIC_PLAN_UNAVAILABLE",
    });
  }
};

export const getActivePreparationPlans = async (req, res) => {
  try {
    const activePlans = await PreparationPlan.find({
      firebaseUid: req.user.firebaseUid,
    })
      .select("planType username currentRating ratingSource topic recommendations")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        levelPlan: activePlans.find(({ planType }) => planType === "level") || null,
        topicPlan: activePlans.find(({ planType }) => planType === "topic") || null,
      },
    });
  } catch (error) {
    console.error("Get active preparation plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to restore your active study plans.",
      code: "PREPARATION_PLANS_UNAVAILABLE",
    });
  }
};

export const getPreparationProgress = async (req, res) => {
  try {
    const solvedProblems = await SolvedProblem.find({
      firebaseUid: req.user.firebaseUid,
    })
      .select("problemId platform title url difficulty topic solvedAt")
      .sort({ solvedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        solvedProblemIds: solvedProblems.map(({ problemId }) => problemId),
        solvedProblems,
      },
    });
  } catch (error) {
    console.error("Get preparation progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load your saved question progress.",
      code: "PREPARATION_PROGRESS_UNAVAILABLE",
    });
  }
};

export const setQuestionSolved = async (req, res) => {
  const {
    problemId,
    platform,
    title,
    url,
    difficulty,
    topic = "",
    solved,
  } = req.body || {};

  if (
    typeof problemId !== "string"
    || !/^[A-Za-z0-9_-]{1,120}$/.test(problemId)
    || !["LeetCode", "Codeforces"].includes(platform)
    || typeof title !== "string"
    || !title.trim()
    || title.length > 300
    || typeof url !== "string"
    || !isValidProblemUrl(platform, url)
    || !Number.isFinite(difficulty)
    || difficulty < 0
    || difficulty > 10000
    || typeof topic !== "string"
    || topic.length > 120
    || typeof solved !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide valid question details and a solved boolean.",
      code: "INVALID_PROGRESS_UPDATE",
    });
  }

  const identity = {
    firebaseUid: req.user.firebaseUid,
    problemId,
  };

  try {
    if (!solved) {
      await SolvedProblem.deleteOne(identity);
      return res.status(200).json({
        success: true,
        data: { problemId, solved: false },
      });
    }

    const problemData = {
      platform,
      title: title.trim(),
      url,
      difficulty,
      topic: topic.trim(),
      solvedAt: new Date(),
    };
    let savedProblem;
    try {
      savedProblem = await SolvedProblem.findOneAndUpdate(
        identity,
        {
          $set: problemData,
          $setOnInsert: identity,
        },
        { new: true, upsert: true, runValidators: true }
      ).select("problemId solvedAt").lean();
    } catch (error) {
      if (error.code !== 11000) throw error;
      savedProblem = await SolvedProblem.findOneAndUpdate(
        identity,
        { $set: problemData },
        { new: true, runValidators: true }
      ).select("problemId solvedAt").lean();
    }

    const plansContainingQuestion = await PreparationPlan.find({
      firebaseUid: req.user.firebaseUid,
      "recommendations.problem_id": problemId,
    }).select("_id planType recommendations").lean();
    const allPlanProblemIds = [
      ...new Set(
        plansContainingQuestion.flatMap((plan) =>
          plan.recommendations.map(({ problem_id: id }) => id)
        )
      ),
    ];
    const solvedPlanProblemIds = new Set(
      await SolvedProblem.distinct("problemId", {
        firebaseUid: req.user.firebaseUid,
        problemId: { $in: allPlanProblemIds },
      })
    );
    const completedPlans = plansContainingQuestion.filter((plan) =>
      plan.recommendations.every(({ problem_id: id }) => solvedPlanProblemIds.has(id))
    );
    if (completedPlans.length) {
      await PreparationPlan.deleteMany({
        firebaseUid: req.user.firebaseUid,
        _id: { $in: completedPlans.map(({ _id }) => _id) },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        problemId: savedProblem.problemId,
        solved: true,
        solvedAt: savedProblem.solvedAt,
        completedPlanTypes: completedPlans.map(({ planType }) => planType),
      },
    });
  } catch (error) {
    console.error("Update preparation progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save this question's progress.",
      code: "PROGRESS_UPDATE_FAILED",
    });
  }
};
