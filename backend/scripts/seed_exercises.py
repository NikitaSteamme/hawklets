#!/usr/bin/env python3
"""
Seed global exercises to any environment.

Usage:
    # Inside Docker container (recommended for prod):
    docker compose exec backend python scripts/seed_exercises.py

    # With explicit connection:
    MONGO_URL="mongodb+srv://..." DB_NAME="hawklets_db" python scripts/seed_exercises.py

Idempotent — safe to run multiple times.
  - _id is a stable UUID derived from the exercise name, so IDs never change
    between runs (workout items can safely store exercise_id references).
  - Exercise data fields are updated on each run ($set), so adding new
    muscle groups or changing default_tracking is picked up automatically.
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "").strip() or input("MONGO_URL: ").strip()
DB_NAME   = os.environ.get("DB_NAME",   "").strip() or input("DB name [hawklets_db]: ").strip() or "hawklets_db"

if not MONGO_URL:
    print("ERROR: MONGO_URL is required.")
    sys.exit(1)

# ─── Exercise data ────────────────────────────────────────────────────────────

def _imu(*extra_metrics):
    return {"type": "imu", "metrics": ["sets", "reps", "weight", "rest", *extra_metrics]}

def _timed():
    return {"type": "timed", "metrics": ["duration"]}

EXERCISES = [
    # ── Chest ──────────────────────────────────────────────────────────────────
    {"name": "Bench Press",         "muscle_groups": ["chest", "triceps", "shoulders"], "equipment": "barbell",    "movement_pattern": "push",       "default_tracking": _imu()},
    {"name": "Incline Bench Press", "muscle_groups": ["chest", "triceps", "shoulders"], "equipment": "barbell",    "movement_pattern": "push",       "default_tracking": _imu()},
    {"name": "Dumbbell Press",      "muscle_groups": ["chest", "triceps", "shoulders"], "equipment": "dumbbell",   "movement_pattern": "push",       "default_tracking": _imu()},
    {"name": "Dumbbell Flyes",      "muscle_groups": ["chest"],                         "equipment": "dumbbell",   "movement_pattern": "push",       "default_tracking": _imu()},
    {"name": "Push-ups",            "muscle_groups": ["chest", "triceps", "core"],      "equipment": "bodyweight", "movement_pattern": "push",       "default_tracking": _imu()},
    {"name": "Chest Dips",          "muscle_groups": ["chest", "triceps"],              "equipment": "bodyweight", "movement_pattern": "push",       "default_tracking": _imu()},

    # ── Back ───────────────────────────────────────────────────────────────────
    {"name": "Pull-ups",            "muscle_groups": ["back", "biceps", "core"],        "equipment": "bodyweight", "movement_pattern": "pull",       "default_tracking": _imu()},
    {"name": "Lat Pulldown",        "muscle_groups": ["back", "biceps"],                "equipment": "machine",    "movement_pattern": "pull",       "default_tracking": _imu()},
    {"name": "Barbell Row",         "muscle_groups": ["back", "biceps", "core"],        "equipment": "barbell",    "movement_pattern": "pull",       "default_tracking": _imu()},
    {"name": "Dumbbell Row",        "muscle_groups": ["back", "biceps"],                "equipment": "dumbbell",   "movement_pattern": "pull",       "default_tracking": _imu()},
    {"name": "Seated Cable Row",    "muscle_groups": ["back", "biceps"],                "equipment": "machine",    "movement_pattern": "pull",       "default_tracking": _imu()},
    {"name": "Deadlift",            "muscle_groups": ["back", "legs", "glutes", "core"],"equipment": "barbell",    "movement_pattern": "hinge",      "default_tracking": _imu()},
    {"name": "T-Bar Row",           "muscle_groups": ["back", "biceps"],                "equipment": "machine",    "movement_pattern": "pull",       "default_tracking": _imu()},

    # ── Legs ───────────────────────────────────────────────────────────────────
    {"name": "Squats",              "muscle_groups": ["legs", "glutes", "core"],        "equipment": "barbell",    "movement_pattern": "squat",      "default_tracking": _imu()},
    {"name": "Leg Press",           "muscle_groups": ["legs", "glutes"],                "equipment": "machine",    "movement_pattern": "squat",      "default_tracking": _imu()},
    {"name": "Romanian Deadlift",   "muscle_groups": ["legs", "glutes", "back"],        "equipment": "barbell",    "movement_pattern": "hinge",      "default_tracking": _imu()},
    {"name": "Lunges",              "muscle_groups": ["legs", "glutes"],                "equipment": "dumbbell",   "movement_pattern": "squat",      "default_tracking": _imu()},
    {"name": "Leg Extension",       "muscle_groups": ["legs"],                          "equipment": "machine",    "movement_pattern": "isolation",  "default_tracking": _imu()},
    {"name": "Leg Curl",            "muscle_groups": ["legs"],                          "equipment": "machine",    "movement_pattern": "isolation",  "default_tracking": _imu()},
    {"name": "Calf Raises",         "muscle_groups": ["calves"],                        "equipment": "machine",    "movement_pattern": "isolation",  "default_tracking": _imu()},

    # ── Shoulders ──────────────────────────────────────────────────────────────
    {"name": "Overhead Press",          "muscle_groups": ["shoulders", "triceps", "core"], "equipment": "barbell",  "movement_pattern": "push",      "default_tracking": _imu()},
    {"name": "Dumbbell Shoulder Press", "muscle_groups": ["shoulders", "triceps"],         "equipment": "dumbbell", "movement_pattern": "push",      "default_tracking": _imu()},
    {"name": "Lateral Raises",          "muscle_groups": ["shoulders"],                    "equipment": "dumbbell", "movement_pattern": "isolation", "default_tracking": _imu()},
    {"name": "Front Raises",            "muscle_groups": ["shoulders"],                    "equipment": "dumbbell", "movement_pattern": "isolation", "default_tracking": _imu()},
    {"name": "Face Pulls",              "muscle_groups": ["shoulders", "back"],            "equipment": "machine",  "movement_pattern": "pull",      "default_tracking": _imu()},

    # ── Arms ───────────────────────────────────────────────────────────────────
    {"name": "Biceps Curls",      "muscle_groups": ["biceps"],            "equipment": "dumbbell", "movement_pattern": "pull", "default_tracking": _imu()},
    {"name": "Hammer Curls",      "muscle_groups": ["biceps", "forearms"],"equipment": "dumbbell", "movement_pattern": "pull", "default_tracking": _imu()},
    {"name": "Triceps Pushdown",  "muscle_groups": ["triceps"],           "equipment": "machine",  "movement_pattern": "push", "default_tracking": _imu()},
    {"name": "Skull Crushers",    "muscle_groups": ["triceps"],           "equipment": "barbell",  "movement_pattern": "push", "default_tracking": _imu()},
    {"name": "Triceps Extension", "muscle_groups": ["triceps"],           "equipment": "dumbbell", "movement_pattern": "push", "default_tracking": _imu()},
    {"name": "Preacher Curls",    "muscle_groups": ["biceps"],            "equipment": "barbell",  "movement_pattern": "pull", "default_tracking": _imu()},

    # ── Core ───────────────────────────────────────────────────────────────────
    {"name": "Plank",            "muscle_groups": ["core"],           "equipment": "bodyweight", "movement_pattern": "isometric", "default_tracking": _timed()},
    {"name": "Crunches",         "muscle_groups": ["core"],           "equipment": "bodyweight", "movement_pattern": "curl",      "default_tracking": _imu()},
    {"name": "Leg Raises",       "muscle_groups": ["core"],           "equipment": "bodyweight", "movement_pattern": "curl",      "default_tracking": _imu()},
    {"name": "Russian Twists",   "muscle_groups": ["core"],           "equipment": "bodyweight", "movement_pattern": "rotation",  "default_tracking": _imu()},
    {"name": "Ab Wheel Rollout", "muscle_groups": ["core", "shoulders"], "equipment": "machine", "movement_pattern": "extension", "default_tracking": _imu()},

    # ── Cardio ─────────────────────────────────────────────────────────────────
    {"name": "Treadmill",       "muscle_groups": ["cardio", "legs"],         "equipment": "machine",    "movement_pattern": "locomotion", "default_tracking": _timed()},
    {"name": "Cycling",         "muscle_groups": ["cardio", "legs"],         "equipment": "machine",    "movement_pattern": "locomotion", "default_tracking": _timed()},
    {"name": "Rowing Machine",  "muscle_groups": ["cardio", "back", "legs"], "equipment": "machine",    "movement_pattern": "locomotion", "default_tracking": _timed()},
    {"name": "Jump Rope",       "muscle_groups": ["cardio", "calves"],       "equipment": "bodyweight", "movement_pattern": "locomotion", "default_tracking": _timed()},
    {"name": "Stairmaster",     "muscle_groups": ["cardio", "legs", "glutes"], "equipment": "machine",  "movement_pattern": "locomotion", "default_tracking": _timed()},
]

# ─── Seed ─────────────────────────────────────────────────────────────────────

async def seed():
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]

    try:
        await client.admin.command("ping")
    except Exception as e:
        print(f"ERROR: Cannot connect to MongoDB — {e}")
        sys.exit(1)

    NOW = datetime.now(timezone.utc).isoformat()
    created = updated = 0

    print(f"\n=== Seeding {len(EXERCISES)} exercises into '{DB_NAME}' ===\n")

    for ex in EXERCISES:
        # Stable UUID derived from name — never changes between runs
        stable_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"exercise:{ex['name']}"))

        result = await db.exercises_global.update_one(
            {"_id": stable_id},
            {
                "$set": {
                    "name":             ex["name"],
                    "muscle_groups":    ex["muscle_groups"],
                    "equipment":        ex["equipment"],
                    "movement_pattern": ex["movement_pattern"],
                    "default_tracking": ex["default_tracking"],
                    "version":          1,
                    "updated_at":       NOW,
                },
                "$setOnInsert": {
                    "_id":        stable_id,
                    "created_at": NOW,
                    "deleted_at": None,
                    "metadata":   {},
                },
            },
            upsert=True,
        )

        if result.upserted_id:
            print(f"  + {ex['name']}")
            created += 1
        else:
            updated += 1

    client.close()
    print(f"\nDone — {created} created, {updated} updated.")


if __name__ == "__main__":
    asyncio.run(seed())
