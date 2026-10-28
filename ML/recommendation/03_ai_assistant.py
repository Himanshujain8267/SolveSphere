"""
03_ai_assistant.py
------------------
Phase 4 — The AI Personal Assistant for SolveSphere.

This wraps the recommendation engine in a conversational AI layer
powered by Google Gemini (free API).

Flow:
  1. User sends a message (e.g., "What should I practice today?")
  2. The recommendation engine picks 3 personalized problems
  3. Those problems + user profile are injected into a Gemini prompt
  4. Gemini responds like a friendly coding mentor

Usage:
  Interactive chat:
    python 03_ai_assistant.py

  Single query:
    python 03_ai_assistant.py --query "What should I practice today?"

  Custom profile:
    python 03_ai_assistant.py --rating 1600 --weak "dp,trees" --strong "math"

Run: python 03_ai_assistant.py
"""

import argparse
import os
import sys
from pathlib import Path

# ──────────────────────────────────────────────
# Load environment variables
# ──────────────────────────────────────────────

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # dotenv not installed, rely on system env vars

import google.generativeai as genai

# Import our recommendation engine
sys.path.insert(0, str(Path(__file__).parent))
from importlib import import_module
recommend_module = import_module("02_recommend")
get_recommendations = recommend_module.get_recommendations
load_database = recommend_module.load_database


# ──────────────────────────────────────────────
# Configure Gemini
# ──────────────────────────────────────────────

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY or API_KEY == "your_api_key_here":
    print("=" * 60)
    print("  ERROR: Gemini API key not found!")
    print("=" * 60)
    print()
    print("  1. Go to: https://aistudio.google.com/apikey")
    print("  2. Click 'Create API Key' (it's FREE)")
    print("  3. Create a file:  ML/recommendation/.env")
    print("     with this content:")
    print()
    print("     GEMINI_API_KEY=AIzaSy...")
    print()
    print("  4. Run this script again.")
    print("=" * 60)
    sys.exit(1)

genai.configure(api_key=API_KEY)


# ──────────────────────────────────────────────
# System prompt (the personality of SolveSphere AI)
# ──────────────────────────────────────────────

SYSTEM_PROMPT = """You are SolveSphere AI — a friendly, encouraging personal coding mentor.

Your personality:
- Warm but direct. You don't waste time with fluff.
- You speak like a senior developer helping a junior — supportive but honest.
- You use simple language. No jargon unless explaining it.
- You use emojis sparingly (1-2 per response max).
- You keep responses concise (under 200 words unless the user asks for detail).

Your capabilities:
- You recommend coding practice problems based on the user's skill level.
- You explain WHY a specific problem is recommended (weakness, challenge, confidence).
- You can give hints on how to approach a problem if asked.
- You motivate the user and track their progress.

Rules:
- ALWAYS include the direct link to the problem when recommending.
- NEVER make up problem names or links. Only use the ones provided in the context.
- If the user asks something unrelated to coding practice, politely redirect them.
- Address the user by name.

The user's profile and today's recommended problems will be provided in each message.
Use them to personalize your response."""


# ──────────────────────────────────────────────
# Build context from recommendations
# ──────────────────────────────────────────────

def build_context(user_profile, recommendations):
    """Build the hidden context block injected into each Gemini call."""
    name   = user_profile.get("name", "Student")
    rating = user_profile.get("current_rating", 1200)
    weak   = ", ".join(user_profile.get("weak_topics", []))
    strong = ", ".join(user_profile.get("strong_topics", []))

    context = f"""
--- USER PROFILE ---
Name: {name}
Current Rating: {rating}
Weak Topics: {weak or "Not specified"}
Strong Topics: {strong or "Not specified"}

--- TODAY'S RECOMMENDED PROBLEMS ---
"""
    for i, rec in enumerate(recommendations, 1):
        context += f"""
Problem {i}: [{rec['type']}]
  Title: {rec['title']}
  Platform: {rec['platform']}
  Difficulty: {rec['difficulty']}
  Tags: {rec['tags'] or 'N/A'}
  Link: {rec['url']}
  Reason: {rec['reason']}
"""

    return context


# ──────────────────────────────────────────────
# The AI Assistant class
# ──────────────────────────────────────────────

class SolveSphereAssistant:
    """Conversational AI assistant powered by Gemini + our recommendation engine."""

    def __init__(self, user_profile):
        self.user_profile = user_profile
        self.db = load_database()
        self.recommendations = get_recommendations(user_profile, self.db)
        self.context = build_context(user_profile, self.recommendations)

        # Initialize Gemini model
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        # Start a chat session with context pre-loaded
        self.chat = self.model.start_chat(
            history=[
                {
                    "role": "user",
                    "parts": [f"[SYSTEM CONTEXT - DO NOT REPEAT THIS TO THE USER]\n{self.context}"]
                },
                {
                    "role": "model",
                    "parts": ["Understood. I have the user's profile and today's recommended problems ready. I'll use them to give personalized advice. I won't repeat this context block to the user."]
                }
            ]
        )

    def ask(self, message):
        """Send a message to the assistant and return its response."""
        try:
            response = self.chat.send_message(message)
            return response.text
        except Exception as e:
            return f"[Error communicating with Gemini: {e}]"

    def refresh_recommendations(self):
        """Re-roll the recommendations (e.g., if user wants different problems)."""
        self.recommendations = get_recommendations(self.user_profile, self.db)
        self.context = build_context(self.user_profile, self.recommendations)
        # Reset chat with new context
        self.chat = self.model.start_chat(
            history=[
                {
                    "role": "user",
                    "parts": [f"[SYSTEM CONTEXT - DO NOT REPEAT THIS TO THE USER]\n{self.context}"]
                },
                {
                    "role": "model",
                    "parts": ["Understood. I have refreshed recommendations ready."]
                }
            ]
        )
        return self.recommendations


# ──────────────────────────────────────────────
# Interactive Chat Loop
# ──────────────────────────────────────────────

def interactive_chat(user_profile):
    """Run an interactive terminal chat with the SolveSphere AI."""

    name = user_profile.get("name", "Student")

    print("\n" + "=" * 60)
    print("  SOLVESPHERE AI  -  Personal Coding Mentor")
    print("=" * 60)
    print(f"  Hello {name}! I'm your AI coding assistant.")
    print(f"  Rating: {user_profile.get('current_rating', '?')}")
    print(f"  Weak topics: {', '.join(user_profile.get('weak_topics', []))}")
    print(f"  Strong topics: {', '.join(user_profile.get('strong_topics', []))}")
    print()
    print("  Commands:")
    print("    Type any message to chat")
    print("    'refresh'  - Get new problem recommendations")
    print("    'quit'     - Exit")
    print("=" * 60)

    assistant = SolveSphereAssistant(user_profile)

    while True:
        try:
            user_input = input(f"\n  {name}: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\n  Goodbye! Keep coding! \n")
            break

        if not user_input:
            continue

        if user_input.lower() in ("quit", "exit", "q"):
            print("\n  Goodbye! Keep coding! \n")
            break

        if user_input.lower() == "refresh":
            assistant.refresh_recommendations()
            print("\n  [Recommendations refreshed!]")
            user_input = "Give me my new recommendations"

        response = assistant.ask(user_input)
        print(f"\n  SolveSphere AI:\n")

        # Print response with indentation for readability
        for line in response.split("\n"):
            print(f"    {line}")


# ──────────────────────────────────────────────
# Single query mode
# ──────────────────────────────────────────────

def single_query(user_profile, query):
    """Ask a single question and print the response."""
    assistant = SolveSphereAssistant(user_profile)
    response = assistant.ask(query)

    print("\n" + "=" * 60)
    print("  SOLVESPHERE AI RESPONSE")
    print("=" * 60)
    print()
    for line in response.split("\n"):
        print(f"  {line}")
    print()
    print("=" * 60)


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SolveSphere AI Assistant")
    parser.add_argument("--name", type=str, default="Harsh")
    parser.add_argument("--rating", type=int, default=1200)
    parser.add_argument("--weak", type=str, default="graphs,dp",
                        help="Comma-separated weak topics")
    parser.add_argument("--strong", type=str, default="math,implementation",
                        help="Comma-separated strong topics")
    parser.add_argument("--query", type=str, default=None,
                        help="Single query mode (non-interactive)")
    args = parser.parse_args()

    user_profile = {
        "name":               args.name,
        "current_rating":     args.rating,
        "weak_topics":        [t.strip() for t in args.weak.split(",") if t.strip()],
        "strong_topics":      [t.strip() for t in args.strong.split(",") if t.strip()],
        "preferred_platform": None,
    }

    if args.query:
        single_query(user_profile, args.query)
    else:
        interactive_chat(user_profile)


if __name__ == "__main__":
    main()
