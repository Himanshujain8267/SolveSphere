"""
04_feature_engineering.py
--------------------------
Step 4 — Create new features from raw columns.

New features created:
  total_problems_solved    — sum across LeetCode + CF + CodeChef
  platforms_connected      — how many rating platforms the student has
  highest_rating           — max of all contest ratings
  average_rating           — mean of all contest ratings
  coding_activity_score    — GitHub contributions + submissions proxy
  cp_score                 — competitive programming composite
  profile_completeness     — fraction of optional fields filled (0–1)

Run: python src/04_feature_engineering.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd

from config import (
    CLEANED_DATA_PATH,
    FEATURES_DATA_PATH,
    PROCESSED_DIR,
)

# ──────────────────────────────────────────────
# Load
# ──────────────────────────────────────────────

print("\n" + "=" * 60)
print("  STEP 4 — FEATURE ENGINEERING")
print("=" * 60)

df = pd.read_csv(CLEANED_DATA_PATH)
print(f"\nLoaded: {df.shape[0]} rows × {df.shape[1]} cols")
initial_cols = set(df.columns)


# ──────────────────────────────────────────────
# Helper: safe column presence
# ──────────────────────────────────────────────

def cols_present(*names):
    return [c for c in names if c in df.columns]


# ──────────────────────────────────────────────
# 1. Total problems solved across all platforms
# ──────────────────────────────────────────────

solved_cols = cols_present(
    "leetcode_solved",
    "codeforces_solved",
    "codechef_solved",
)

if solved_cols:
    df["total_problems_solved"] = (
        df[solved_cols].fillna(0).sum(axis=1)
    )
    print(f"\n[1] total_problems_solved  (from: {solved_cols})")


# ──────────────────────────────────────────────
# 2. Platforms connected (has a rating on that platform)
# ──────────────────────────────────────────────

rating_cols = cols_present(
    "leetcode_rating",
    "codeforces_rating",
    "codechef_rating",
)

if rating_cols:
    df["platforms_connected"] = df[rating_cols].notna().sum(axis=1)
    print(f"[2] platforms_connected    (from: {rating_cols})")


# ──────────────────────────────────────────────
# 3. Highest and average contest rating
# ──────────────────────────────────────────────

if rating_cols:
    df["highest_rating"] = df[rating_cols].max(axis=1)
    df["average_rating"] = df[rating_cols].mean(axis=1)
    print(f"[3] highest_rating / average_rating")


# ──────────────────────────────────────────────
# 4. Coding activity score
#    GitHub contributions + (solved count as proxy for submissions)
# ──────────────────────────────────────────────

activity_cols = cols_present(
    "github_contributions",
    "total_problems_solved",
)

if activity_cols:
    df["coding_activity_score"] = (
        df[activity_cols].fillna(0).sum(axis=1)
    )
    print(f"[4] coding_activity_score  (from: {activity_cols})")


# ──────────────────────────────────────────────
# 5. Competitive programming composite score
#    Weighted average of ratings, normalized to 0–1
#    Weights: CF 40%, LeetCode 35%, CodeChef 25%
#    (CF is harder to get high rating → more weight)
# ──────────────────────────────────────────────

MAX_CF  = 3500.0
MAX_LC  = 3000.0
MAX_CC  = 3000.0

WEIGHTS = {
    "codeforces_rating": (MAX_CF, 0.40),
    "leetcode_rating"  : (MAX_LC, 0.35),
    "codechef_rating"  : (MAX_CC, 0.25),
}

weighted_sum  = pd.Series(0.0, index=df.index)
total_weight  = pd.Series(0.0, index=df.index)

for col, (max_val, weight) in WEIGHTS.items():
    if col in df.columns:
        normed = df[col].fillna(0) / max_val
        has_val = df[col].notna().astype(float)
        weighted_sum  += normed * weight * has_val
        total_weight  += weight * has_val

df["cp_score"] = np.where(
    total_weight > 0,
    weighted_sum / total_weight,
    0.0
)

print(f"[5] cp_score  (weighted CF/LC/CC composite, 0–1)")


# ──────────────────────────────────────────────
# 6. Profile completeness
#    Fraction of optional platform fields that are filled
# ──────────────────────────────────────────────

optional_fields = cols_present(
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
)

if optional_fields:
    df["profile_completeness"] = (
        df[optional_fields].notna().sum(axis=1) / len(optional_fields)
    ).round(3)
    print(f"[6] profile_completeness  ({len(optional_fields)} fields)")


# ──────────────────────────────────────────────
# Summary of new features
# ──────────────────────────────────────────────

new_cols = sorted(set(df.columns) - initial_cols)
print(f"\n📋 New features created: {len(new_cols)}")
for col in new_cols:
    print(f"   {col:<35}  mean={df[col].mean():.3f}  nulls={df[col].isnull().sum()}")


# ──────────────────────────────────────────────
# Save
# ──────────────────────────────────────────────

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
df.to_csv(FEATURES_DATA_PATH, index=False)

print(f"\n✅ Feature-engineered dataset saved to: {FEATURES_DATA_PATH}")
print(f"   Final shape: {df.shape[0]} rows × {df.shape[1]} cols\n")
