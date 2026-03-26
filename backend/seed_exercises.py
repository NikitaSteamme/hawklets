import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def seed():
    print("Starting seed script...")
    mongo_url = os.getenv("MONGO_URL", "mongodb://hawklets_root:change_this_password@mongo:27017")
    db_name = os.getenv("DB_NAME", "hawklets_db")
    
    print(f"Connecting to {mongo_url} (DB: {db_name})...")
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
    db = client[db_name]
    
    try:
        await client.admin.command('ping')
        print("MongoDB ping successful!")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return
    
    exercises = [
        # Chest
        {"name": "Bench Press", "muscle_groups": ["chest", "triceps", "shoulders"], "equipment": "barbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Incline Bench Press", "muscle_groups": ["chest", "triceps", "shoulders"], "equipment": "barbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Dumbbell Press", "muscle_groups": ["chest", "triceps", "shoulders"], "equipment": "dumbbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Dumbbell Flyes", "muscle_groups": ["chest"], "equipment": "dumbbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Push-ups", "muscle_groups": ["chest", "triceps", "core"], "equipment": "bodyweight", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "rest"]}, "version": 1},
        {"name": "Chest Dips", "muscle_groups": ["chest", "triceps"], "equipment": "bodyweight", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},

        # Back
        {"name": "Pull-ups", "muscle_groups": ["back", "biceps", "core"], "equipment": "bodyweight", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Lat Pulldown", "muscle_groups": ["back", "biceps"], "equipment": "machine", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Barbell Row", "muscle_groups": ["back", "biceps", "core"], "equipment": "barbell", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Dumbbell Row", "muscle_groups": ["back", "biceps"], "equipment": "dumbbell", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Seated Cable Row", "muscle_groups": ["back", "biceps"], "equipment": "machine", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Deadlift", "muscle_groups": ["back", "legs", "glutes", "core"], "equipment": "barbell", "movement_pattern": "hinge", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "T-Bar Row", "muscle_groups": ["back", "biceps"], "equipment": "machine", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},

        # Legs
        {"name": "Squats", "muscle_groups": ["legs", "glutes", "core"], "equipment": "barbell", "movement_pattern": "squat", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Leg Press", "muscle_groups": ["legs", "glutes"], "equipment": "machine", "movement_pattern": "squat", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Romanian Deadlift", "muscle_groups": ["legs", "glutes", "back"], "equipment": "barbell", "movement_pattern": "hinge", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Lunges", "muscle_groups": ["legs", "glutes"], "equipment": "dumbbell", "movement_pattern": "squat", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Leg Extension", "muscle_groups": ["legs"], "equipment": "machine", "movement_pattern": "isolation", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Leg Curl", "muscle_groups": ["legs"], "equipment": "machine", "movement_pattern": "isolation", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Calf Raises", "muscle_groups": ["calves"], "equipment": "machine", "movement_pattern": "isolation", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},

        # Shoulders
        {"name": "Overhead Press", "muscle_groups": ["shoulders", "triceps", "core"], "equipment": "barbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Dumbbell Shoulder Press", "muscle_groups": ["shoulders", "triceps"], "equipment": "dumbbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Lateral Raises", "muscle_groups": ["shoulders"], "equipment": "dumbbell", "movement_pattern": "isolation", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Front Raises", "muscle_groups": ["shoulders"], "equipment": "dumbbell", "movement_pattern": "isolation", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Face Pulls", "muscle_groups": ["shoulders", "back"], "equipment": "machine", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},

        # Arms
        {"name": "Biceps Curls", "muscle_groups": ["biceps"], "equipment": "dumbbell", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Hammer Curls", "muscle_groups": ["biceps", "forearms"], "equipment": "dumbbell", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Triceps Pushdown", "muscle_groups": ["triceps"], "equipment": "machine", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Skull Crushers", "muscle_groups": ["triceps"], "equipment": "barbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Triceps Extension", "muscle_groups": ["triceps"], "equipment": "dumbbell", "movement_pattern": "push", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},
        {"name": "Preacher Curls", "muscle_groups": ["biceps"], "equipment": "barbell", "movement_pattern": "pull", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "weight", "rest"]}, "version": 1},

        # Core
        {"name": "Plank", "muscle_groups": ["core"], "equipment": "bodyweight", "movement_pattern": "isometric", "default_tracking": {"type": "timed", "metrics": ["duration"]}, "version": 1},
        {"name": "Crunches", "muscle_groups": ["core"], "equipment": "bodyweight", "movement_pattern": "curl", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "rest"]}, "version": 1},
        {"name": "Leg Raises", "muscle_groups": ["core"], "equipment": "bodyweight", "movement_pattern": "curl", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "rest"]}, "version": 1},
        {"name": "Russian Twists", "muscle_groups": ["core"], "equipment": "bodyweight", "movement_pattern": "rotation", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "rest"]}, "version": 1},
        {"name": "Ab Wheel Rollout", "muscle_groups": ["core", "shoulders"], "equipment": "machine", "movement_pattern": "extension", "default_tracking": {"type": "IMU", "metrics": ["sets", "reps", "rest"]}, "version": 1},

        # Cardio / Timed
        {"name": "Treadmill", "muscle_groups": ["cardio", "legs"], "equipment": "machine", "movement_pattern": "locomotion", "default_tracking": {"type": "timed", "metrics": ["duration"]}, "version": 1},
        {"name": "Cycling", "muscle_groups": ["cardio", "legs"], "equipment": "machine", "movement_pattern": "locomotion", "default_tracking": {"type": "timed", "metrics": ["duration"]}, "version": 1},
        {"name": "Rowing Machine", "muscle_groups": ["cardio", "back", "legs"], "equipment": "machine", "movement_pattern": "locomotion", "default_tracking": {"type": "timed", "metrics": ["duration"]}, "version": 1},
        {"name": "Jump Rope", "muscle_groups": ["cardio", "calves"], "equipment": "bodyweight", "movement_pattern": "locomotion", "default_tracking": {"type": "timed", "metrics": ["duration"]}, "version": 1},
        {"name": "Stairmaster", "muscle_groups": ["cardio", "legs", "glutes"], "equipment": "machine", "movement_pattern": "locomotion", "default_tracking": {"type": "timed", "metrics": ["duration"]}, "version": 1},
    ]

    for ex in exercises:
        await db.exercises_global.update_one({"name": ex["name"]}, {"$set": ex}, upsert=True)
    
    print("Database seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed())
