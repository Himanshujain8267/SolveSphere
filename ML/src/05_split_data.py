"""
05_split_data.py
----------------
Step 5 — Train / Test split.

  • Drops student_id (not a feature)
  • Filters to placed == 1 students for package regression
  • Uses stratified split on a binned version of package for even distribution
  • Saves X_train, X_test, y_train, y_test

Run: python src/05_split_data.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from sklearn.model_selection import train_test_split

from config import (
    FEATURES_DATA_PATH,
    X_TRAIN_PATH, X_TEST_PATH,
    Y_TRAIN_PATH, Y_TEST_PATH,
    PROCESSED_DIR,
    TARGET_PACKAGE,
    TARGET_PLACED,
    STUDENT_ID_COL,
    RANDOM_STATE,
    TEST_SIZE,
)

# ──────────────────────────────────────────────
# Load
# ──────────────────────────────────────────────

print("\n" + "=" * 60)
print("  STEP 5 — TRAIN / TEST SPLIT")
print("=" * 60)

df = pd.read_csv(FEATURES_DATA_PATH)
print(f"\nLoaded: {df.shape[0]} rows × {df.shape[1]} cols")


# ──────────────────────────────────────────────
# Filter: only placed students for package model
# ──────────────────────────────────────────────

if TARGET_PLACED in df.columns:
    before = len(df)
    df = df[df[TARGET_PLACED] == 1].copy()
    print(f"Filtered to placed students: {len(df)} / {before} rows")

if TARGET_PACKAGE not in df.columns:
    raise ValueError(f"Target column '{TARGET_PACKAGE}' not found in dataset.")

# Drop rows where target is NaN
df = df.dropna(subset=[TARGET_PACKAGE])
print(f"After dropping NaN targets: {len(df)} rows")


# ──────────────────────────────────────────────
# Define X and y
# ──────────────────────────────────────────────

drop_cols = [TARGET_PACKAGE, TARGET_PLACED, STUDENT_ID_COL]
drop_cols = [c for c in drop_cols if c in df.columns]

X = df.drop(columns=drop_cols)
y = df[TARGET_PACKAGE]

print(f"\nFeatures (X): {X.shape[1]} columns")
print(f"Target   (y): {TARGET_PACKAGE}  —  "
      f"min={y.min():.1f}, max={y.max():.1f}, mean={y.mean():.1f}")


# ──────────────────────────────────────────────
# Stratified split using package quantile bins
# Ensures both splits have similar package distributions
# ──────────────────────────────────────────────

y_bins = pd.qcut(y, q=5, labels=False, duplicates="drop")

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y_bins,
)

print(f"\n{'─'*40}")
print(f"  Training samples : {len(X_train)}")
print(f"  Testing  samples : {len(X_test)}")
print(f"{'─'*40}")
print(f"\n  y_train — mean: {y_train.mean():.2f}  std: {y_train.std():.2f}")
print(f"  y_test  — mean: {y_test.mean():.2f}  std: {y_test.std():.2f}")


# ──────────────────────────────────────────────
# Save
# ──────────────────────────────────────────────

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

X_train.to_csv(X_TRAIN_PATH, index=False)
X_test.to_csv(X_TEST_PATH,   index=False)
y_train.to_csv(Y_TRAIN_PATH, index=False)
y_test.to_csv(Y_TEST_PATH,   index=False)

print(f"\n✅ Splits saved:")
print(f"   {X_TRAIN_PATH.name}")
print(f"   {X_TEST_PATH.name}")
print(f"   {Y_TRAIN_PATH.name}")
print(f"   {Y_TEST_PATH.name}\n")
