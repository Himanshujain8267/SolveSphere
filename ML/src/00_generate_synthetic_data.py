"""
00_generate_synthetic_data.py
------------------------------
Generates a realistic synthetic student dataset to test the full pipeline
before real labeled data is available.

HOW IT WORKS
------------
1. A hidden "talent" score is sampled for each student.
2. All features (CGPA, ratings, solved count, etc.) are generated
   as correlated functions of that talent score + noise.
3. Placement probability and package are also driven by talent + noise.

This gives realistic inter-feature correlations so EDA and feature
importance outputs make sense even on synthetic data.

OUTPUT
------
data/raw/students_raw.csv   (n=500 by default)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd

from config import RAW_DATA_PATH, RANDOM_STATE

# ──────────────────────────────────────────────
# Settings
# ──────────────────────────────────────────────

N_STUDENTS   = 500
RNG          = np.random.default_rng(RANDOM_STATE)
BRANCHES     = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"]
BRANCH_WEIGHTS = [0.35, 0.20, 0.20, 0.10, 0.10, 0.05]


# ──────────────────────────────────────────────
# Helper: clip + round
# ──────────────────────────────────────────────

def clamp(arr, lo, hi):
    return np.clip(arr, lo, hi)


# ──────────────────────────────────────────────
# Step 1 — Latent talent score  (0 to 1)
# ──────────────────────────────────────────────

talent = RNG.beta(a=2.5, b=2.5, size=N_STUDENTS)   # centered ~0.5, mild spread

# ──────────────────────────────────────────────
# Step 2 — Demographics
# ──────────────────────────────────────────────

age    = RNG.integers(19, 24, size=N_STUDENTS)
gender = RNG.choice(["Male", "Female"], size=N_STUDENTS, p=[0.62, 0.38])
branch = RNG.choice(BRANCHES, size=N_STUDENTS, p=BRANCH_WEIGHTS)


# ──────────────────────────────────────────────
# Step 3 — Academic features
# ──────────────────────────────────────────────

cgpa = clamp(
    5.0 + talent * 5.0 + RNG.normal(0, 0.4, N_STUDENTS),
    5.0, 10.0
).round(2)

projects = clamp(
    np.round(talent * 7 + RNG.normal(0, 1, N_STUDENTS)),
    0, 10
).astype(int)

internships = clamp(
    np.round(talent * 3 + RNG.normal(0, 0.5, N_STUDENTS)),
    0, 4
).astype(int)

skills_count = clamp(
    np.round(talent * 15 + RNG.normal(0, 2, N_STUDENTS)),
    1, 20
).astype(int)


# ──────────────────────────────────────────────
# Step 4 — LeetCode
# ──────────────────────────────────────────────

# ~15% of students have no LeetCode account
has_leetcode = RNG.random(N_STUDENTS) > 0.15

leetcode_solved = clamp(
    np.where(
        has_leetcode,
        np.round(talent * 700 + RNG.normal(0, 80, N_STUDENTS)),
        0
    ),
    0, 900
).astype(int)

leetcode_rating = np.where(
    has_leetcode,
    clamp(
        1200 + talent * 1300 + RNG.normal(0, 120, N_STUDENTS),
        1000, 3000
    ).round(0),
    np.nan
)

leetcode_contest_rating = np.where(
    has_leetcode,
    clamp(
        1100 + talent * 1400 + RNG.normal(0, 150, N_STUDENTS),
        1000, 3200
    ).round(0),
    np.nan
)


# ──────────────────────────────────────────────
# Step 5 — Codeforces
# ──────────────────────────────────────────────

# ~40% have no Codeforces account
has_cf = RNG.random(N_STUDENTS) > 0.40

codeforces_rating = np.where(
    has_cf,
    clamp(
        800 + talent * 1800 + RNG.normal(0, 180, N_STUDENTS),
        800, 3500
    ).round(0),
    np.nan
)

codeforces_solved = np.where(
    has_cf,
    clamp(
        np.round(talent * 500 + RNG.normal(0, 60, N_STUDENTS)),
        0, 600
    ),
    0
).astype(int)


# ──────────────────────────────────────────────
# Step 6 — CodeChef
# ──────────────────────────────────────────────

# ~35% have no CodeChef account
has_cc = RNG.random(N_STUDENTS) > 0.35

codechef_rating = np.where(
    has_cc,
    clamp(
        1000 + talent * 1500 + RNG.normal(0, 160, N_STUDENTS),
        1000, 3000
    ).round(0),
    np.nan
)

codechef_solved = np.where(
    has_cc,
    clamp(
        np.round(talent * 300 + RNG.normal(0, 40, N_STUDENTS)),
        0, 400
    ),
    0
).astype(int)


# ──────────────────────────────────────────────
# Step 7 — GitHub
# ──────────────────────────────────────────────

# ~10% have no GitHub
has_github = RNG.random(N_STUDENTS) > 0.10

github_repos = np.where(
    has_github,
    clamp(
        np.round(talent * 40 + RNG.normal(0, 5, N_STUDENTS)),
        1, 60
    ),
    0
).astype(int)

github_contributions = np.where(
    has_github,
    clamp(
        np.round(talent * 900 + RNG.normal(0, 100, N_STUDENTS)),
        0, 1500
    ),
    0
).astype(int)

github_stars = np.where(
    has_github,
    clamp(
        np.round(talent * 200 + RNG.normal(0, 30, N_STUDENTS)),
        0, 500
    ),
    0
).astype(int)


# ──────────────────────────────────────────────
# Step 8 — Placement outcome
# ──────────────────────────────────────────────

# Probability of placement rises steeply with talent
placement_logit = -3.5 + talent * 9.0 + RNG.normal(0, 0.8, N_STUDENTS)
placement_prob  = 1 / (1 + np.exp(-placement_logit))
placed          = (RNG.random(N_STUDENTS) < placement_prob).astype(int)

# ──────────────────────────────────────────────
# Step 9 — Package (only for placed students)
# ──────────────────────────────────────────────

base_package = (
    4.0
    + talent[placed == 1] * 30.0
    + RNG.normal(0, 2.5, placed.sum())
)
base_package = clamp(base_package, 3.0, 60.0).round(2)

package_lpa          = np.full(N_STUDENTS, np.nan)
package_lpa[placed == 1] = base_package


# ──────────────────────────────────────────────
# Step 10 — Introduce realistic missing values
# ──────────────────────────────────────────────

def inject_missing(arr, rate=0.05):
    """Randomly replace `rate` fraction of values with NaN."""
    mask = RNG.random(len(arr)) < rate
    result = arr.astype(float)
    result[mask] = np.nan
    return result

cgpa         = inject_missing(cgpa, rate=0.02)
projects     = inject_missing(projects, rate=0.03)
skills_count = inject_missing(skills_count, rate=0.04)


# ──────────────────────────────────────────────
# Step 11 — Assemble DataFrame
# ──────────────────────────────────────────────

df = pd.DataFrame({
    "student_id"             : [f"S{i:04d}" for i in range(1, N_STUDENTS + 1)],
    "age"                    : age,
    "gender"                 : gender,
    "branch"                 : branch,
    "cgpa"                   : cgpa,
    "projects"               : projects,
    "internships"            : internships,
    "skills_count"           : skills_count,
    "leetcode_solved"        : leetcode_solved,
    "leetcode_rating"        : leetcode_rating,
    "leetcode_contest_rating": leetcode_contest_rating,
    "codeforces_rating"      : codeforces_rating,
    "codeforces_solved"      : codeforces_solved,
    "codechef_rating"        : codechef_rating,
    "codechef_solved"        : codechef_solved,
    "github_repos"           : github_repos,
    "github_contributions"   : github_contributions,
    "github_stars"           : github_stars,
    "placed"                 : placed,
    "package_lpa"            : package_lpa,
})

# Introduce a handful of duplicate rows (to test cleaning)
duplicate_indices = RNG.choice(df.index, size=8, replace=False)
df = pd.concat([df, df.loc[duplicate_indices]], ignore_index=True)

# Shuffle
df = df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)


# ──────────────────────────────────────────────
# Step 12 — Save
# ──────────────────────────────────────────────

RAW_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(RAW_DATA_PATH, index=False)

print("=" * 55)
print("  Synthetic dataset generated successfully")
print("=" * 55)
print(f"  Rows         : {len(df)}")
print(f"  Placed        : {int(df['placed'].sum())}  ({df['placed'].mean()*100:.1f}%)")
print(f"  Avg CGPA      : {df['cgpa'].mean():.2f}")
print(f"  Avg Package   : {df['package_lpa'].mean():.2f} LPA  (placed only)")
print(f"  Saved to      : {RAW_DATA_PATH}")
print("=" * 55)
