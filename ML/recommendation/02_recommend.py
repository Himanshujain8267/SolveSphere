"""
02_recommend.py
---------------
The Recommendation Engine for SolveSphere.

Given a user's skill profile, recommends a personalized set of practice
problems from the 14,000+ problem database.

Strategy (3-question daily plan):
  1. ZPD Question       — Matches current rating, random topic (builds confidence)
  2. Weakness Question  — Slightly easier, targets a weak topic (fills gaps)
  3. Challenge Question — Harder, targets a strong topic (pushes growth)

Usage:
  python 02_recommend.py                          # uses demo profile
  python 02_recommend.py --rating 1400 --weak "dp,graphs" --strong "math"

Run: python 02_recommend.py
"""

import argparse
import json
import random
from pathlib import Path

import pandas as pd

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────

DATA_DIR = Path(__file__).parent / "data"
DB_PATH  = DATA_DIR / "problem_database.csv"


# ──────────────────────────────────────────────
# Load the problem database once
# ──────────────────────────────────────────────

def load_database():
    """Load and return the problem database."""
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Problem database not found at {DB_PATH}.\n"
            "Run 01_fetch_problems.py and 01b_import_leetcode.py first."
        )
    df = pd.read_csv(DB_PATH)
    # Ensure tags column is string (some rows may be NaN)
    df["tags"] = df["tags"].fillna("").str.lower().str.strip()
    return df


# ──────────────────────────────────────────────
# Filter helpers
# ──────────────────────────────────────────────

def filter_by_rating(df, lo, hi):
    """Filter problems within a difficulty range [lo, hi]."""
    return df[(df["difficulty"] >= lo) & (df["difficulty"] <= hi)]


def filter_by_topic(df, topics):
    """Filter problems that contain ANY of the given topic tags."""
    if not topics:
        return df
    pattern = "|".join(t.strip().lower() for t in topics if t.strip())
    if not pattern:
        return df
    return df[df["tags"].str.contains(pattern, na=False)]


def normalize_topic(topic):
    """Normalize a topic label for comparison with database tags."""
    return " ".join(str(topic).strip().lower().replace("_", " ").replace("-", " ").split())


def get_available_topics(platform="Codeforces", db=None):
    """Return the distinct non-empty tags available for a platform."""
    if db is None:
        db = load_database()
    platform_rows = db[db["platform"].str.casefold() == platform.casefold()]
    topics = {
        tag.strip()
        for tags in platform_rows["tags"].fillna("")
        for tag in str(tags).split(",")
        if tag.strip()
    }
    return sorted(topics, key=str.casefold)


def get_topic_recommendations(topic, db=None, count=5, platform="Codeforces"):
    """Return distinct problems whose tags exactly match the requested topic."""
    if db is None:
        db = load_database()

    requested_topic = normalize_topic(topic)
    if not requested_topic:
        return []

    platform_rows = db[db["platform"].str.casefold() == platform.casefold()]
    platform_rows = platform_rows[
        platform_rows["url"].astype(str).str.match(r"^https?://", case=False, na=False)
    ]
    matching_rows = platform_rows[
        platform_rows["tags"].fillna("").apply(
            lambda tags: requested_topic in {
                normalize_topic(tag) for tag in str(tags).split(",") if tag.strip()
            }
        )
    ].drop_duplicates("problem_id")
    if matching_rows.empty:
        return []

    selected = matching_rows.sample(n=min(max(1, int(count)), 10, len(matching_rows)))
    recommendations = []
    for _, problem in selected.iterrows():
        recommendations.append({
            "type": "Topic Practice",
            "problem_id": problem["problem_id"],
            "title": problem["title"],
            "platform": problem["platform"],
            "url": problem["url"],
            "difficulty": int(problem["difficulty"]),
            "tags": str(problem["tags"]),
            "reason": f"Matches your selected topic: {topic.strip()}.",
        })
    return recommendations


def pick_one(df, exclude_ids=None):
    """Pick one random problem from a DataFrame, avoiding already-picked IDs."""
    if exclude_ids:
        df = df[~df["problem_id"].isin(exclude_ids)]
    if df.empty:
        return None
    return df.sample(1).iloc[0]


# ──────────────────────────────────────────────
# The Recommendation Engine
# ──────────────────────────────────────────────

def get_recommendations(user_profile, db=None, count=3):
    """
    Generate 3 personalized problem recommendations.

    Parameters
    ----------
    user_profile : dict
        {
            "name": "Harsh",
            "current_rating": 1200,
            "weak_topics": ["graphs", "dynamic programming"],
            "strong_topics": ["math", "implementation"],
            "preferred_platform": None  # or "LeetCode" / "Codeforces"
        }
    db : DataFrame or None
        Problem database. Loaded from disk if None.

    Returns
    -------
    list of dict
        Each dict has: type, problem_id, title, url, difficulty, tags, reason
    """
    if db is None:
        db = load_database()

    rating  = user_profile.get("current_rating", 1200)
    weak    = user_profile.get("weak_topics", [])
    strong  = user_profile.get("strong_topics", [])
    platform = user_profile.get("preferred_platform", None)

    # Filter by platform preference if set
    pool = db.copy()
    if platform:
        pool = pool[pool["platform"] == platform]
    pool = pool[
        pool["url"].astype(str).str.match(r"^https?://", case=False, na=False)
    ]

    recommendations = []
    picked_ids = set()

    # ─────────────────────────────────────────
    # 1. ZPD Question
    #    Current rating to +200 above, any topic
    #    Builds confidence by matching their exact level
    # ─────────────────────────────────────────
    zpd_lo = rating
    zpd_hi = rating + 200
    zpd_pool = filter_by_rating(pool, zpd_lo, zpd_hi)

    zpd_pick = pick_one(zpd_pool, picked_ids)
    if zpd_pick is not None:
        picked_ids.add(zpd_pick["problem_id"])
        recommendations.append({
            "type":       "ZPD (Zone of Proximal Development)",
            "problem_id": zpd_pick["problem_id"],
            "title":      zpd_pick["title"],
            "platform":   zpd_pick["platform"],
            "url":        zpd_pick["url"],
            "difficulty": int(zpd_pick["difficulty"]),
            "tags":       zpd_pick["tags"],
            "reason":     f"Matched to your current level ({rating}). "
                          f"This {int(zpd_pick['difficulty'])}-rated problem "
                          f"will build your confidence."
        })

    # ─────────────────────────────────────────
    # 2. Weakness Question
    #    200 below current rating, targeting a weak topic
    #    Slightly easier so the new topic isn't overwhelming
    # ─────────────────────────────────────────
    weak_lo = max(800, rating - 200)
    weak_hi = rating
    weak_pool = filter_by_rating(pool, weak_lo, weak_hi)
    weak_pool = filter_by_topic(weak_pool, weak)

    # Fallback: if no problems match the weak topic in that range,
    # widen the range or relax the topic filter
    if weak_pool.empty:
        weak_pool = filter_by_rating(pool, max(800, rating - 400), rating)
        weak_pool = filter_by_topic(weak_pool, weak)
    if weak_pool.empty:
        # Last resort: any problem in the easy range
        weak_pool = filter_by_rating(pool, max(800, rating - 200), rating)

    weak_pick = pick_one(weak_pool, picked_ids)
    if weak_pick is not None:
        picked_ids.add(weak_pick["problem_id"])
        weak_topic_str = ", ".join(weak) if weak else "general"
        recommendations.append({
            "type":       "Weakness Target",
            "problem_id": weak_pick["problem_id"],
            "title":      weak_pick["title"],
            "platform":   weak_pick["platform"],
            "url":        weak_pick["url"],
            "difficulty": int(weak_pick["difficulty"]),
            "tags":       weak_pick["tags"],
            "reason":     f"Targets your weak area(s): {weak_topic_str}. "
                          f"Rated {int(weak_pick['difficulty'])} (slightly easier) "
                          f"so you can focus on learning the concept."
        })

    # ─────────────────────────────────────────
    # 3. Challenge Question
    #    200–400 above current rating, in a strong topic
    #    Pushes growth using topics where they already have foundations
    # ─────────────────────────────────────────
    chal_lo = rating + 200
    chal_hi = rating + 400
    chal_pool = filter_by_rating(pool, chal_lo, chal_hi)
    chal_pool = filter_by_topic(chal_pool, strong)

    # Fallback: if no match, relax topic
    if chal_pool.empty:
        chal_pool = filter_by_rating(pool, chal_lo, chal_hi)

    chal_pick = pick_one(chal_pool, picked_ids)
    if chal_pick is not None:
        picked_ids.add(chal_pick["problem_id"])
        strong_topic_str = ", ".join(strong) if strong else "general"
        recommendations.append({
            "type":       "Challenge",
            "problem_id": chal_pick["problem_id"],
            "title":      chal_pick["title"],
            "platform":   chal_pick["platform"],
            "url":        chal_pick["url"],
            "difficulty": int(chal_pick["difficulty"]),
            "tags":       chal_pick["tags"],
            "reason":     f"A stretch problem ({int(chal_pick['difficulty'])}) "
                          f"in your strong area(s): {strong_topic_str}. "
                          f"This will push you to the next level."
        })

    count = max(0, min(int(count), 10))
    extra_targets = [rating - 100, rating, rating + 100, rating + 200, rating + 300]
    while len(recommendations) < count:
        target_rating = extra_targets[(len(recommendations) - 3) % len(extra_targets)]
        remaining = pool[~pool["problem_id"].isin(picked_ids)]
        if remaining.empty:
            break

        candidates = filter_by_rating(remaining, target_rating - 250, target_rating + 250)
        if candidates.empty:
            distance = (remaining["difficulty"] - target_rating).abs()
            candidates = remaining[distance == distance.min()]

        pick = pick_one(candidates)
        picked_ids.add(pick["problem_id"])
        recommendations.append({
            "type": "Steady Practice",
            "problem_id": pick["problem_id"],
            "title": pick["title"],
            "platform": pick["platform"],
            "url": pick["url"],
            "difficulty": int(pick["difficulty"]),
            "tags": pick["tags"],
            "reason": (
                f"Build consistency with a problem near your current level "
                f"({rating})."
            ),
        })

    return recommendations[:count]


# ──────────────────────────────────────────────
# Pretty-print recommendations
# ──────────────────────────────────────────────

def display_recommendations(user_profile, recs):
    """Print recommendations in a readable format."""
    name = user_profile.get("name", "Student")
    rating = user_profile.get("current_rating", "?")

    print("\n" + "=" * 65)
    print(f"  PERSONALIZED RECOMMENDATIONS FOR {name.upper()}")
    print(f"  Current Rating: {rating}")
    print("=" * 65)

    if not recs:
        print("\n  No recommendations could be generated.")
        print("  Check that the problem database exists and has data.\n")
        return

    for i, rec in enumerate(recs, 1):
        print(f"\n  [{i}] {rec['type']}")
        print(f"  {'─' * 55}")
        print(f"  Problem  : {rec['title']}")
        print(f"  Platform : {rec['platform']}")
        print(f"  Rating   : {rec['difficulty']}")
        print(f"  Tags     : {rec['tags'] or 'N/A'}")
        print(f"  Link     : {rec['url']}")
        print(f"  Why?     : {rec['reason']}")

    print("\n" + "=" * 65)
    print(f"  Total: {len(recs)} problems recommended")
    print("=" * 65 + "\n")


# ──────────────────────────────────────────────
# CLI + Demo
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SolveSphere Recommendation Engine")
    parser.add_argument("--rating", type=int, default=1200, help="Current user rating")
    parser.add_argument("--weak", type=str, default="graphs,dp",
                        help="Comma-separated weak topics")
    parser.add_argument("--strong", type=str, default="math,implementation",
                        help="Comma-separated strong topics")
    parser.add_argument("--platform", type=str, default=None,
                        help="Preferred platform: LeetCode or Codeforces")
    parser.add_argument("--name", type=str, default="Harsh", help="User name")
    parser.add_argument("--count", type=int, default=3,
                        help="Maximum number of recommendations (1-10)")
    parser.add_argument("--topic", type=str, default=None,
                        help="Generate problems matching this exact topic tag")
    parser.add_argument("--list-topics", action="store_true",
                        help="List available topic tags for the selected platform")
    parser.add_argument("--json", action="store_true",
                        help="Write recommendations as JSON")
    args = parser.parse_args()

    if not 1 <= args.count <= 10:
        parser.error("--count must be between 1 and 10")
    if args.topic is not None and not args.topic.strip():
        parser.error("--topic cannot be empty")
    if args.topic is not None and args.list_topics:
        parser.error("--topic and --list-topics cannot be used together")

    if args.list_topics:
        topics = get_available_topics(args.platform or "Codeforces")
        if args.json:
            print(json.dumps({"platform": args.platform or "Codeforces", "topics": topics}))
        else:
            print("\n".join(topics))
        return

    if args.topic is not None:
        recommendations = get_topic_recommendations(
            args.topic,
            count=args.count,
            platform=args.platform or "Codeforces",
        )
        if args.json:
            print(json.dumps({
                "topic": args.topic.strip(),
                "platform": args.platform or "Codeforces",
                "recommendations": recommendations,
            }))
        else:
            display_recommendations(
                {"name": "Student", "current_rating": args.topic.strip()},
                recommendations,
            )
        return

    user_profile = {
        "name":               args.name,
        "current_rating":     args.rating,
        "weak_topics":        [t.strip() for t in args.weak.split(",") if t.strip()],
        "strong_topics":      [t.strip() for t in args.strong.split(",") if t.strip()],
        "preferred_platform": args.platform,
    }

    recs = get_recommendations(user_profile, count=args.count)
    if args.json:
        print(json.dumps({
            "currentRating": args.rating,
            "recommendations": recs,
        }))
    else:
        display_recommendations(user_profile, recs)


if __name__ == "__main__":
    main()
