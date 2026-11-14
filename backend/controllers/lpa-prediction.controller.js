import { predictPackageLpa } from "../services/lpa-prediction.service.js";

const requiredFields = {
  age: { min: 16, max: 60, integer: true },
  cgpa: { min: 0, max: 10 },
  projects: { min: 0, max: 1000, integer: true },
  internships: { min: 0, max: 100, integer: true },
  skills_count: { min: 0, max: 500, integer: true },
};

const optionalFields = {
  leetcode_solved: { min: 0, max: 200000, integer: true },
  leetcode_rating: { min: 0, max: 10000 },
  leetcode_contest_rating: { min: 0, max: 10000 },
  codeforces_rating: { min: 0, max: 10000 },
  codeforces_solved: { min: 0, max: 200000, integer: true },
  codechef_rating: { min: 0, max: 10000 },
  codechef_solved: { min: 0, max: 200000, integer: true },
  github_repos: { min: 0, max: 100000, integer: true },
  github_contributions: { min: 0, max: 1000000, integer: true },
  github_stars: { min: 0, max: 1000000, integer: true },
};

const validateNumericFields = (profile, fields) => Object.entries(fields).flatMap(
  ([field, constraints]) => {
    const value = profile[field];
    if (value === undefined || value === null) return [];
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || value < constraints.min
      || value > constraints.max
      || (constraints.integer && !Number.isInteger(value))
    ) {
      return [field];
    }
    return [];
  }
);

export const createLpaPrediction = async (req, res) => {
  const profile = req.body;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return res.status(400).json({
      success: false,
      message: "Provide your student profile as a JSON object.",
      code: "INVALID_STUDENT_PROFILE",
    });
  }

  const allowedFields = new Set([
    ...Object.keys(requiredFields),
    ...Object.keys(optionalFields),
    "gender",
    "branch",
  ]);
  const unknownFields = Object.keys(profile).filter((field) => !allowedFields.has(field));
  const missingFields = Object.keys(requiredFields).filter(
    (field) => profile[field] === undefined || profile[field] === null
  );
  const invalidFields = [
    ...validateNumericFields(profile, requiredFields),
    ...validateNumericFields(profile, optionalFields),
  ];

  if (
    unknownFields.length
    || missingFields.length
    || invalidFields.length
    || !["Male", "Female"].includes(profile.gender)
    || !["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"].includes(profile.branch)
  ) {
    return res.status(400).json({
      success: false,
      message: "Check required values and use the accepted student profile ranges.",
      code: "INVALID_STUDENT_PROFILE",
      data: {
        fields: [...new Set([
          ...unknownFields,
          ...missingFields,
          ...invalidFields,
          ...(!["Male", "Female"].includes(profile.gender) ? ["gender"] : []),
          ...(!["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"].includes(profile.branch)
            ? ["branch"]
            : []),
        ])],
      },
    });
  }

  const normalizedProfile = Object.fromEntries(
    [...Object.keys(requiredFields), "gender", "branch", ...Object.keys(optionalFields)]
      .map((field) => [field, profile[field] ?? null])
  );

  try {
    const estimate = await predictPackageLpa(normalizedProfile);
    return res.status(200).json({
      success: true,
      data: {
        ...estimate,
        unit: "lakhs per annum",
        disclaimer: "Demo estimate only: the model was trained on synthetic sample data and is not a real-world salary guarantee.",
      },
    });
  } catch (error) {
    console.error("Create LPA prediction error:", error);
    if (error?.code === "LPA_MODEL_BUSY") {
      res.set("Retry-After", "10");
      return res.status(503).json({
        success: false,
        message: "The estimator is handling its current workload. Please try again shortly.",
        code: "LPA_MODEL_BUSY",
      });
    }

    return res.status(503).json({
      success: false,
      message: "The estimator is temporarily unavailable. Please try again later.",
      code: error?.code || "LPA_MODEL_UNAVAILABLE",
    });
  }
};
