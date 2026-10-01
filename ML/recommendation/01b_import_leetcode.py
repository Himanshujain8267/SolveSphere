"""
01b_import_leetcode.py
-----------------------
Imports the user-provided LeetCode CSV (2900+ problems) into our
unified problem database alongside the Codeforces problems.

Difficulty mapping (to match Codeforces numeric scale):
  Easy   → 1000
  Medium → 1500
  Hard   → 2000

Run: python 01b_import_leetcode.py
"""

import pandas as pd
from pathlib import Path

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────

CSV_PATH   = Path(r"C:\Users\Harsh\.gemini\antigravity\brain\9ab455f1-5f39-4472-9de9-9951dc602e56\.user_uploaded\media_1790764502753.csv")
DATA_DIR   = Path(__file__).parent / "data"
DB_PATH    = DATA_DIR / "problem_database.csv"

# ──────────────────────────────────────────────
# Difficulty mapping
# ──────────────────────────────────────────────

DIFFICULTY_MAP = {
    "Easy":   1000,
    "Medium": 1500,
    "Hard":   2000,
}


def main():
    print("=" * 55)
    print("  IMPORTING LEETCODE PROBLEMS")
    print("=" * 55)

    # ── Load the uploaded CSV ──────────────────
    lc_raw = pd.read_csv(CSV_PATH)
    print(f"\nLoaded: {len(lc_raw)} LeetCode problems from CSV")

    # ── Normalize to our schema ────────────────
    normalized = []
    for _, row in lc_raw.iterrows():
        diff_str = str(row["Difficulty"]).strip()
        rating   = DIFFICULTY_MAP.get(diff_str, 1500)

        normalized.append({
            "platform":   "LeetCode",
            "problem_id": f"LC_{row['Question_No']}",
            "title":      str(row["Question"]).strip(),
            "url":        str(row["Question_Link"]).strip(),
            "difficulty": rating,
            "tags":       "",        # this CSV doesn't include tags
        })

    lc_df = pd.DataFrame(normalized)

    # ── Difficulty breakdown ───────────────────
    easy   = (lc_df["difficulty"] == 1000).sum()
    medium = (lc_df["difficulty"] == 1500).sum()
    hard   = (lc_df["difficulty"] == 2000).sum()
    print(f"\n  Easy   (1000): {easy}")
    print(f"  Medium (1500): {medium}")
    print(f"  Hard   (2000): {hard}")

    # ── Load existing Codeforces database ──────
    if DB_PATH.exists():
        existing_df = pd.read_csv(DB_PATH)
        # Remove the 5 old mock LeetCode rows
        existing_df = existing_df[existing_df["platform"] != "LeetCode"]
        print(f"\nExisting Codeforces problems: {len(existing_df)}")
    else:
        existing_df = pd.DataFrame()
        print("\nNo existing database found. Creating fresh.")

    # ── Merge ──────────────────────────────────
    final_df = pd.concat([existing_df, lc_df], ignore_index=True)
    final_df.to_csv(DB_PATH, index=False)

    # ── Summary ────────────────────────────────
    cf_count = (final_df["platform"] == "Codeforces").sum()
    lc_count = (final_df["platform"] == "LeetCode").sum()

    print(f"\n{'=' * 55}")
    print(f"  DATABASE UPDATED SUCCESSFULLY")
    print(f"{'=' * 55}")
    print(f"  Codeforces : {cf_count:,} problems")
    print(f"  LeetCode   : {lc_count:,} problems")
    print(f"  TOTAL      : {len(final_df):,} problems")
    print(f"  Saved to   : {DB_PATH}")
    print(f"{'=' * 55}")

    print("\nSample LeetCode entries:")
    print(lc_df.sample(5).to_string(index=False))


if __name__ == "__main__":
    main()
