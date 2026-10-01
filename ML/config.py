"""
config.py
---------
Single source of truth for all paths, constants, and feature lists.
Every script imports from here — change a path once, it updates everywhere.
"""

from pathlib import Path

# ──────────────────────────────────────────────
# Root paths
# ──────────────────────────────────────────────

ROOT        = Path(__file__).parent
DATA_DIR    = ROOT / "data"
RAW_DIR     = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
EXTERNAL_DIR  = DATA_DIR / "external"
MODELS_DIR  = ROOT / "models"
REPORTS_DIR = ROOT / "reports" / "eda"

# ──────────────────────────────────────────────
# File paths
# ──────────────────────────────────────────────

RAW_DATA_PATH       = RAW_DIR / "students_raw.csv"
CLEANED_DATA_PATH   = PROCESSED_DIR / "cleaned_students.csv"
FEATURES_DATA_PATH  = PROCESSED_DIR / "features.csv"

X_TRAIN_PATH = PROCESSED_DIR / "X_train.csv"
X_TEST_PATH  = PROCESSED_DIR / "X_test.csv"
Y_TRAIN_PATH = PROCESSED_DIR / "y_train.csv"
Y_TEST_PATH  = PROCESSED_DIR / "y_test.csv"

PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.joblib"
MODEL_PATH        = MODELS_DIR / "model_package_v1.joblib"

# ──────────────────────────────────────────────
# Targets
# ──────────────────────────────────────────────

TARGET_PACKAGE = "package_lpa"     # regression target  (Model B)
TARGET_PLACED  = "placed"          # classification target (Model A later)
STUDENT_ID_COL = "student_id"

# ──────────────────────────────────────────────
# Model settings
# ──────────────────────────────────────────────

RANDOM_STATE = 42
TEST_SIZE    = 0.20     # 80/20 split

# ──────────────────────────────────────────────
# Feature groups
# These are updated after feature engineering (Step 4)
# ──────────────────────────────────────────────

# Raw numeric features from the dataset
RAW_NUMERIC_FEATURES = [
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
]

# Raw categorical features
RAW_CATEGORICAL_FEATURES = [
    "gender",
    "branch",
]

# Engineered features added in Step 4
ENGINEERED_FEATURES = [
    "total_problems_solved",
    "platforms_connected",
    "highest_rating",
    "average_rating",
    "coding_activity_score",
    "cp_score",
    "profile_completeness",
]

# Final feature list used for model training
# (raw + engineered, dropping id and targets)
MODEL_FEATURES = RAW_NUMERIC_FEATURES + RAW_CATEGORICAL_FEATURES + ENGINEERED_FEATURES
