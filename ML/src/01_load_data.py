"""
01_load_data.py
---------------
Step 1 — Load the raw dataset and produce a first inspection report.

Run: python src/01_load_data.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from config import RAW_DATA_PATH

# ──────────────────────────────────────────────
# Load
# ──────────────────────────────────────────────

print("\n" + "=" * 60)
print("  STEP 1 — LOAD DATA")
print("=" * 60)

if not RAW_DATA_PATH.exists():
    raise FileNotFoundError(
        f"\n[ERROR] Raw data not found at: {RAW_DATA_PATH}"
        "\n        Run  python src/00_generate_synthetic_data.py  first."
    )

df = pd.read_csv(RAW_DATA_PATH)


# ──────────────────────────────────────────────
# Shape
# ──────────────────────────────────────────────

print(f"\n{'─'*40}")
print(f"  Dataset shape: {df.shape[0]} rows × {df.shape[1]} columns")
print(f"{'─'*40}")


# ──────────────────────────────────────────────
# Columns
# ──────────────────────────────────────────────

print("\n📋 COLUMNS")
for col in df.columns:
    print(f"   {col:<35} {df[col].dtype}")


# ──────────────────────────────────────────────
# First 5 rows
# ──────────────────────────────────────────────

print("\n📄 FIRST 5 ROWS")
print(df.head().to_string())


# ──────────────────────────────────────────────
# Missing values
# ──────────────────────────────────────────────

missing = df.isnull().sum()
missing_pct = (missing / len(df) * 100).round(2)
missing_report = pd.DataFrame({
    "missing_count": missing,
    "missing_%": missing_pct
})
missing_report = missing_report[missing_report["missing_count"] > 0].sort_values(
    "missing_%", ascending=False
)

print("\n⚠️  MISSING VALUES")
if missing_report.empty:
    print("   No missing values found.")
else:
    print(missing_report.to_string())


# ──────────────────────────────────────────────
# Duplicates
# ──────────────────────────────────────────────

dup_count = df.duplicated().sum()
print(f"\n🔁 DUPLICATE ROWS: {dup_count}")


# ──────────────────────────────────────────────
# Target distribution
# ──────────────────────────────────────────────

if "placed" in df.columns:
    placed_dist = df["placed"].value_counts()
    print("\n🎯 TARGET — placed")
    print(f"   Not placed (0): {placed_dist.get(0, 0)}")
    print(f"   Placed     (1): {placed_dist.get(1, 0)}")
    print(f"   Placement rate: {df['placed'].mean()*100:.1f}%")

if "package_lpa" in df.columns:
    pkg = df["package_lpa"].dropna()
    print(f"\n🎯 TARGET — package_lpa  (placed students only)")
    print(f"   Min  : {pkg.min():.2f} LPA")
    print(f"   Max  : {pkg.max():.2f} LPA")
    print(f"   Mean : {pkg.mean():.2f} LPA")
    print(f"   Median: {pkg.median():.2f} LPA")


# ──────────────────────────────────────────────
# Statistical summary
# ──────────────────────────────────────────────

print("\n📊 STATISTICAL SUMMARY")
print(df.describe(include="all").to_string())

print("\n✅ Step 1 complete.\n")
