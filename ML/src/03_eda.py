"""
03_eda.py
---------
Step 3 — Exploratory Data Analysis.

All plots are saved to  reports/eda/  as PNG files.
Nothing blocks (no plt.show()).

Questions answered:
  1. What does the target (package_lpa) look like?
  2. What is the placement rate?
  3. How does CGPA relate to package?
  4. How does coding activity relate to package?
  5. Are there outliers?
  6. Which features correlate most with package?
  7. Branch-wise placement rates

Run: python src/03_eda.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import matplotlib
matplotlib.use("Agg")           # non-interactive backend → saves files, never blocks

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from config import CLEANED_DATA_PATH, REPORTS_DIR

# ──────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────

REPORTS_DIR.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "figure.dpi"    : 120,
    "axes.spines.top"   : False,
    "axes.spines.right" : False,
    "font.size"     : 11,
})

PALETTE = "viridis"

print("\n" + "=" * 60)
print("  STEP 3 — EDA")
print("=" * 60)

df = pd.read_csv(CLEANED_DATA_PATH)
print(f"\nLoaded: {df.shape[0]} rows × {df.shape[1]} cols")


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def save(fig, name):
    path = REPORTS_DIR / name
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    print(f"   Saved → {path.name}")


# ──────────────────────────────────────────────
# 1. Package distribution (placed only)
# ──────────────────────────────────────────────

placed_df = df[df["placed"] == 1].copy()

fig, ax = plt.subplots(figsize=(9, 5))
ax.hist(placed_df["package_lpa"].dropna(), bins=30, color="#4C72B0", edgecolor="white")
ax.set_xlabel("Package (LPA)")
ax.set_ylabel("Students")
ax.set_title("Distribution of Placement Package (Placed Students Only)")
ax.axvline(placed_df["package_lpa"].mean(),   color="red",    linestyle="--", label=f"Mean  {placed_df['package_lpa'].mean():.1f}")
ax.axvline(placed_df["package_lpa"].median(), color="orange", linestyle="--", label=f"Median {placed_df['package_lpa'].median():.1f}")
ax.legend()
save(fig, "01_package_distribution.png")


# ──────────────────────────────────────────────
# 2. Placement rate
# ──────────────────────────────────────────────

counts = df["placed"].value_counts()
fig, ax = plt.subplots(figsize=(6, 5))
bars = ax.bar(["Not Placed", "Placed"], counts.values, color=["#DD8452", "#4C72B0"])
for bar, val in zip(bars, counts.values):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 3,
            f"{val}", ha="center", fontweight="bold")
ax.set_title(f"Placement Rate  ({df['placed'].mean()*100:.1f}% placed)")
ax.set_ylabel("Students")
save(fig, "02_placement_rate.png")


# ──────────────────────────────────────────────
# 3. CGPA vs Package (scatter)
# ──────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(8, 5))
ax.scatter(placed_df["cgpa"], placed_df["package_lpa"],
           alpha=0.55, s=35, color="#4C72B0")
ax.set_xlabel("CGPA")
ax.set_ylabel("Package (LPA)")
ax.set_title("CGPA vs Package (Placed Students)")
save(fig, "03_cgpa_vs_package.png")


# ──────────────────────────────────────────────
# 4. LeetCode Solved vs Package
# ──────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(8, 5))
ax.scatter(placed_df["leetcode_solved"], placed_df["package_lpa"],
           alpha=0.55, s=35, color="#55A868")
ax.set_xlabel("LeetCode Problems Solved")
ax.set_ylabel("Package (LPA)")
ax.set_title("LeetCode Solved vs Package")
save(fig, "04_leetcode_vs_package.png")


# ──────────────────────────────────────────────
# 5. Codeforces Rating vs Package
# ──────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(8, 5))
ax.scatter(placed_df["codeforces_rating"], placed_df["package_lpa"],
           alpha=0.55, s=35, color="#C44E52")
ax.set_xlabel("Codeforces Rating")
ax.set_ylabel("Package (LPA)")
ax.set_title("Codeforces Rating vs Package")
save(fig, "05_codeforces_vs_package.png")


# ──────────────────────────────────────────────
# 6. Box plots for outlier detection
# ──────────────────────────────────────────────

outlier_cols = [
    "cgpa", "leetcode_solved", "leetcode_rating",
    "codeforces_rating", "github_contributions", "package_lpa"
]
existing = [c for c in outlier_cols if c in df.columns]

fig, axes = plt.subplots(2, 3, figsize=(14, 8))
axes = axes.flatten()

for i, col in enumerate(existing):
    axes[i].boxplot(df[col].dropna(), vert=True, patch_artist=True,
                    boxprops=dict(facecolor="#4C72B0", alpha=0.6))
    axes[i].set_title(col)
    axes[i].set_xlabel("")

# hide any unused axes
for j in range(len(existing), len(axes)):
    axes[j].set_visible(False)

fig.suptitle("Box Plots — Outlier Detection", fontsize=13, fontweight="bold")
plt.tight_layout()
save(fig, "06_boxplots_outliers.png")


# ──────────────────────────────────────────────
# 7. Correlation heatmap (numeric features)
# ──────────────────────────────────────────────

numeric_df = df.select_dtypes(include="number").drop(
    columns=["student_id"] if "student_id" in df.columns else [],
    errors="ignore"
)

fig, ax = plt.subplots(figsize=(14, 10))
sns.heatmap(
    numeric_df.corr(),
    annot=True,
    fmt=".2f",
    cmap="coolwarm",
    center=0,
    linewidths=0.5,
    ax=ax
)
ax.set_title("Feature Correlation Matrix", fontsize=14, fontweight="bold")
plt.tight_layout()
save(fig, "07_correlation_heatmap.png")


# ──────────────────────────────────────────────
# 8. Correlation with package_lpa (bar chart)
# ──────────────────────────────────────────────

if "package_lpa" in numeric_df.columns:
    corr_series = (
        numeric_df.corr()["package_lpa"]
        .drop("package_lpa")
        .sort_values(ascending=False)
    )

    fig, ax = plt.subplots(figsize=(10, 6))
    colors = ["#4C72B0" if v >= 0 else "#DD8452" for v in corr_series.values]
    ax.barh(corr_series.index[::-1], corr_series.values[::-1], color=colors[::-1])
    ax.axvline(0, color="black", linewidth=0.8)
    ax.set_xlabel("Pearson Correlation with package_lpa")
    ax.set_title("Feature Correlations with Target (package_lpa)")
    plt.tight_layout()
    save(fig, "08_correlations_with_target.png")

    print("\n📊 Correlations with package_lpa:")
    print(corr_series.to_string())


# ──────────────────────────────────────────────
# 9. Branch-wise placement rate
# ──────────────────────────────────────────────

if "branch" in df.columns:
    branch_stats = df.groupby("branch")["placed"].mean().sort_values(ascending=False)

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(branch_stats.index, branch_stats.values * 100, color="#4C72B0")
    for bar, val in zip(bars, branch_stats.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
                f"{val*100:.0f}%", ha="center", fontsize=9)
    ax.set_ylabel("Placement Rate (%)")
    ax.set_title("Placement Rate by Branch")
    plt.tight_layout()
    save(fig, "09_branch_placement_rate.png")


# ──────────────────────────────────────────────
# 10. Package distribution by branch (box)
# ──────────────────────────────────────────────

if "branch" in df.columns:
    fig, ax = plt.subplots(figsize=(10, 6))
    branch_order = (
        placed_df.groupby("branch")["package_lpa"].median()
        .sort_values(ascending=False).index
    )
    sns.boxplot(data=placed_df, x="branch", y="package_lpa",
                order=branch_order, palette="Set2", ax=ax)
    ax.set_title("Package Distribution by Branch (Placed Students)")
    ax.set_xlabel("Branch")
    ax.set_ylabel("Package (LPA)")
    plt.tight_layout()
    save(fig, "10_package_by_branch.png")


print(f"\n✅ EDA complete. All plots saved to:  {REPORTS_DIR}\n")
