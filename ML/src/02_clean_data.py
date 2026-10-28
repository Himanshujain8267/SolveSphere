"""
02_clean_data.py
----------------
Step 2 — Clean the raw dataset.

Actions performed:
  1. Remove exact duplicate rows
  2. Standardize column names
  3. Convert columns to correct dtypes
  4. Fix impossible / out-of-range values  →  set to NaN
  5. Print a missing-value report
  6. Save cleaned CSV to data/processed/cleaned_students.csv

Run: python src/02_clean_data.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd

from config import (
    RAW_DATA_PATH,
    CLEANED_DATA_PATH,
    PROCESSED_DIR,
)

# ──────────────────────────────────────────────
# Load
# ──────────────────────────────────────────────

print("\n" + "=" * 60)
print("  STEP 2 — DATA CLEANING")
print("=" * 60)

df = pd.read_csv(RAW_DATA_PATH)
print(f"\nLoaded  : {len(df)} rows × {df.shape[1]} cols")


# ──────────────────────────────────────────────
# 1. Remove duplicate rows
# ──────────────────────────────────────────────

before = len(df)
df = df.drop_duplicates()
removed = before - len(df)
print(f"\n[1] Duplicates removed : {removed}")


# ──────────────────────────────────────────────
# 2. Standardize column names
# ──────────────────────────────────────────────

df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(r"\s+", "_", regex=True)
    .str.replace(r"[^a-z0-9_]", "", regex=True)
)
print(f"[2] Column names standardized")


# ──────────────────────────────────────────────
# 3. Convert to correct dtypes
# ──────────────────────────────────────────────

NUMERIC_COLS = [
    "age",
    "cgpa",
    "projects",
    "internships",
    "skills_count",
    "leetcode_solved",
    "leetcode_rating",
    "leetcode_contest_rating",
    "codeforces_rating",
    "codeforces_solved",
    "codechef_rating",
    "codechef_solved",
    "github_repos",
    "github_contributions",
    "github_stars",
    "placed",
    "package_lpa",
]

for col in NUMERIC_COLS:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

print(f"[3] Numeric dtypes enforced")


# ──────────────────────────────────────────────
# 4. Fix impossible / out-of-range values
# ──────────────────────────────────────────────

# Helper: count replacements
def nullify_out_of_range(col, lo=None, hi=None, label=""):
    if col not in df.columns:
        return
    mask = pd.Series([False] * len(df), index=df.index)
    if lo is not None:
        mask |= df[col] < lo
    if hi is not None:
        mask |= df[col] > hi
    count = mask.sum()
    df.loc[mask, col] = np.nan
    if count:
        print(f"     {label or col}: {count} impossible value(s) → NaN")

nullify_out_of_range("cgpa",                   lo=0.0,  hi=10.0,  label="cgpa")
nullify_out_of_range("age",                    lo=16,   hi=60,    label="age")
nullify_out_of_range("projects",               lo=0,             label="projects")
nullify_out_of_range("internships",            lo=0,             label="internships")
nullify_out_of_range("skills_count",           lo=0,             label="skills_count")
nullify_out_of_range("leetcode_solved",        lo=0,             label="leetcode_solved")
nullify_out_of_range("leetcode_rating",        lo=0,             label="leetcode_rating")
nullify_out_of_range("leetcode_contest_rating",lo=0,             label="leetcode_contest_rating")
nullify_out_of_range("codeforces_rating",      lo=0,             label="codeforces_rating")
nullify_out_of_range("codeforces_solved",      lo=0,             label="codeforces_solved")
nullify_out_of_range("codechef_rating",        lo=0,             label="codechef_rating")
nullify_out_of_range("codechef_solved",        lo=0,             label="codechef_solved")
nullify_out_of_range("github_repos",           lo=0,             label="github_repos")
nullify_out_of_range("github_contributions",   lo=0,             label="github_contributions")
nullify_out_of_range("github_stars",           lo=0,             label="github_stars")
nullify_out_of_range("placed",                 lo=0,    hi=1,    label="placed")
nullify_out_of_range("package_lpa",            lo=0,    hi=200,  label="package_lpa")

print(f"[4] Range validation done")


# ──────────────────────────────────────────────
# 5. Consistency check: package_lpa only for placed == 1
# ──────────────────────────────────────────────

if {"placed", "package_lpa"}.issubset(df.columns):
    # If placed == 0 but package is filled → nullify package
    inconsistent = (df["placed"] == 0) & (df["package_lpa"].notna())
    if inconsistent.sum():
        print(f"\n[5] {inconsistent.sum()} rows had package but placed=0 → package set to NaN")
        df.loc[inconsistent, "package_lpa"] = np.nan
    else:
        print(f"[5] Placement-package consistency ✓")


# ──────────────────────────────────────────────
# 6. Missing value report
# ──────────────────────────────────────────────

missing = df.isnull().sum()
missing_pct = (missing / len(df) * 100).round(2)

print("\n📋 Missing values after cleaning:")
report = pd.DataFrame({"count": missing, "%": missing_pct})
report = report[report["count"] > 0].sort_values("%", ascending=False)

if report.empty:
    print("   None")
else:
    print(report.to_string())


# ──────────────────────────────────────────────
# 7. Save
# ──────────────────────────────────────────────

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
df.to_csv(CLEANED_DATA_PATH, index=False)

print(f"\n✅ Cleaned dataset saved to: {CLEANED_DATA_PATH}")
print(f"   Final shape: {df.shape[0]} rows × {df.shape[1]} cols\n")
