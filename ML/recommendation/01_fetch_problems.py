"""
01_fetch_problems.py
--------------------
Fetches coding problems from public APIs to build our Recommendation Database.

Currently fetches from:
1. Codeforces (Official API) - ~8000+ problems with precise difficulty ratings (800-3500) and tags.

Run: python 01_fetch_problems.py
"""

import requests
import pandas as pd
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = DATA_DIR / "problem_database.csv"

def fetch_codeforces_problems():
    print("Fetching problems from Codeforces API...")
    url = "https://codeforces.com/api/problemset.problems"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        if data["status"] != "OK":
            print("Failed to fetch from Codeforces.")
            return pd.DataFrame()

        problems = data["result"]["problems"]

        normalized_problems = []
        for p in problems:
            # Codeforces rating (difficulty) - some older/special problems don't have it
            if "rating" not in p:
                continue

            # Create a direct URL to the problem
            contest_id = p.get("contestId")
            index = p.get("index")
            if not contest_id or not index:
                continue

            url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"

            normalized_problems.append({
                "platform": "Codeforces",
                "problem_id": f"CF_{contest_id}_{index}",
                "title": p.get("name", "Unknown"),
                "url": url,
                "difficulty": p.get("rating"), # Numeric rating (800 - 3500)
                "tags": ", ".join(p.get("tags", [])) # e.g., "dp, math, greedy"
            })

        df = pd.DataFrame(normalized_problems)
        print(f"Successfully fetched {len(df)} Codeforces problems.")
        return df

    except Exception as e:
        print(f"Error fetching Codeforces: {e}")
        return pd.DataFrame()

def generate_mock_leetcode_problems():
    print("Generating standard LeetCode problems (Mock Data for MVP)...")

    lc_data = [
        {"platform": "LeetCode", "problem_id": "LC_1", "title": "Two Sum", "url": "https://leetcode.com/problems/two-sum/", "difficulty": 800, "tags": "array, hash-table"},
        {"platform": "LeetCode", "problem_id": "LC_3", "title": "Longest Substring Without Repeating Characters", "url": "https://leetcode.com/problems/longest-substring-without-repeating-characters/", "difficulty": 1200, "tags": "hash-table, string, sliding-window"},
        {"platform": "LeetCode", "problem_id": "LC_42", "title": "Trapping Rain Water", "url": "https://leetcode.com/problems/trapping-rain-water/", "difficulty": 1800, "tags": "array, two-pointers, dynamic-programming, stack"},
        {"platform": "LeetCode", "problem_id": "LC_200", "title": "Number of Islands", "url": "https://leetcode.com/problems/number-of-islands/", "difficulty": 1400, "tags": "array, depth-first-search, breadth-first-search, union-find"},
        {"platform": "LeetCode", "problem_id": "LC_1143", "title": "Longest Common Subsequence", "url": "https://leetcode.com/problems/longest-common-subsequence/", "difficulty": 1500, "tags": "string, dynamic-programming"},
    ]

    df = pd.DataFrame(lc_data)
    print(f"Added {len(df)} LeetCode problems.")
    return df

def main():
    print("="*50)
    print(" BUILDING PROBLEM DATABASE ")
    print("="*50)

    cf_df = fetch_codeforces_problems()
    lc_df = generate_mock_leetcode_problems()

    # Combine datasets
    final_df = pd.concat([cf_df, lc_df], ignore_index=True)

    if final_df.empty:
        print("No data collected. Exiting.")
        return

    # Save to CSV
    final_df.to_csv(OUTPUT_FILE, index=False)

    print("="*50)
    print(f"SUCCESS! Database built with {len(final_df)} total problems.")
    print(f"Saved to: {OUTPUT_FILE}")

    print("\nSample Data:")
    print(final_df.sample(5).to_string())

if __name__ == "__main__":
    main()
