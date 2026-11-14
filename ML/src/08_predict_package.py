"""
Generate a demo package estimate from the saved placement-regression artifacts.

Run from the repository root:
    python ML/src/08_predict_package.py --input-json "{...}"
"""

import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import numpy as np
import pandas as pd

from config import MODEL_PATH, PREPROCESSOR_PATH

OPTIONAL_PROFILE_FIELDS = [
    "leetcode_rating",
    "leetcode_solved",
    "leetcode_contest_rating",
    "codeforces_rating",
    "codeforces_solved",
    "codechef_rating",
    "codechef_solved",
    "github_repos",
    "github_contributions",
    "github_stars",
]

RATING_WEIGHTS = {
    "codeforces_rating": (3500.0, 0.40),
    "leetcode_rating": (3000.0, 0.35),
    "codechef_rating": (3000.0, 0.25),
}


def build_feature_row(profile):
    """Build raw and engineered features using the training pipeline formulas."""
    row = {
        "age": profile["age"],
        "gender": profile["gender"],
        "branch": profile["branch"],
        "cgpa": profile["cgpa"],
        "projects": profile["projects"],
        "internships": profile["internships"],
        "skills_count": profile["skills_count"],
        **{field: profile.get(field) for field in OPTIONAL_PROFILE_FIELDS},
    }

    solved_fields = ["leetcode_solved", "codeforces_solved", "codechef_solved"]
    row["total_problems_solved"] = sum(
        row[field] or 0 for field in solved_fields
    )

    ratings = [row[field] for field in RATING_WEIGHTS if row[field] is not None]
    row["platforms_connected"] = len(ratings)
    row["highest_rating"] = max(ratings) if ratings else np.nan
    row["average_rating"] = float(np.mean(ratings)) if ratings else np.nan
    row["coding_activity_score"] = (
        (row["github_contributions"] or 0) + row["total_problems_solved"]
    )

    weighted_sum = 0.0
    total_weight = 0.0
    for field, (maximum, weight) in RATING_WEIGHTS.items():
        value = row[field]
        if value is not None:
            weighted_sum += (value / maximum) * weight
            total_weight += weight
    row["cp_score"] = weighted_sum / total_weight if total_weight else 0.0
    row["profile_completeness"] = sum(
        row[field] is not None for field in OPTIONAL_PROFILE_FIELDS
    ) / len(OPTIONAL_PROFILE_FIELDS)

    return pd.DataFrame([row])


def main():
    parser = argparse.ArgumentParser(description="Estimate a demo package in LPA")
    parser.add_argument("--input-json", required=True, help="Student profile JSON")
    args = parser.parse_args()

    try:
        profile = json.loads(args.input_json)
        if not isinstance(profile, dict):
            raise ValueError("Student profile must be a JSON object")

        model = joblib.load(MODEL_PATH)
        preprocessor = joblib.load(PREPROCESSOR_PATH)
        feature_row = build_feature_row(profile)
        expected_features = list(preprocessor.feature_names_in_)
        feature_row = feature_row.reindex(columns=expected_features)
        transformed = preprocessor.transform(feature_row)
        prediction = float(model.predict(transformed)[0])
        if not math.isfinite(prediction):
            raise ValueError("The package model returned a non-finite estimate")

        print(json.dumps({
            "estimatedLpa": round(prediction, 2),
            "currency": "INR",
            "source": "synthetic_demo_model",
        }))
    except Exception as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
