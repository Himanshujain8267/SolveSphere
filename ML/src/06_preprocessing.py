"""
06_preprocessing.py
-------------------
Step 6 — Build a reusable sklearn preprocessing pipeline.

Pipeline:
  Numeric  → median imputation
  Categorical → most_frequent imputation + OneHotEncoder

The fitted preprocessor is saved with joblib so the same
transformations apply at inference time without re-fitting.

Run: python src/06_preprocessing.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from config import (
    X_TRAIN_PATH,
    X_TEST_PATH,
    PREPROCESSOR_PATH,
    MODELS_DIR,
)

# ──────────────────────────────────────────────
# Load
# ──────────────────────────────────────────────

print("\n" + "=" * 60)
print("  STEP 6 — PREPROCESSING PIPELINE")
print("=" * 60)

X_train = pd.read_csv(X_TRAIN_PATH)
X_test  = pd.read_csv(X_TEST_PATH)

print(f"\nX_train: {X_train.shape}")
print(f"X_test : {X_test.shape}")


# ──────────────────────────────────────────────
# Identify feature types
# ──────────────────────────────────────────────

numeric_features = X_train.select_dtypes(include=["int64", "float64"]).columns.tolist()
categorical_features = X_train.select_dtypes(include=["object", "category"]).columns.tolist()

print(f"\nNumeric features     ({len(numeric_features)}):")
for f in numeric_features:
    print(f"   {f}")

print(f"\nCategorical features ({len(categorical_features)}):")
for f in categorical_features:
    print(f"   {f}")


# ──────────────────────────────────────────────
# Build transformers
# ──────────────────────────────────────────────

numeric_transformer = SimpleImputer(strategy="median")

categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
])


# ──────────────────────────────────────────────
# Assemble ColumnTransformer
# ──────────────────────────────────────────────

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer,     numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ],
    remainder="drop",       # drop any columns not listed (e.g., student_id if leftover)
    verbose_feature_names_out=False,
)


# ──────────────────────────────────────────────
# Fit on training data only
# ──────────────────────────────────────────────

X_train_transformed = preprocessor.fit_transform(X_train)
X_test_transformed  = preprocessor.transform(X_test)

# Get output feature names for inspection
try:
    out_features = preprocessor.get_feature_names_out()
except Exception:
    out_features = []

print(f"\nOutput features after preprocessing: {len(out_features)}")
print(f"X_train transformed shape: {X_train_transformed.shape}")
print(f"X_test  transformed shape: {X_test_transformed.shape}")


# ──────────────────────────────────────────────
# Save preprocessor
# ──────────────────────────────────────────────

MODELS_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump(preprocessor, PREPROCESSOR_PATH)

print(f"\n✅ Preprocessor saved to: {PREPROCESSOR_PATH}")
print("   Load it later with:  preprocessor = joblib.load(PREPROCESSOR_PATH)\n")
