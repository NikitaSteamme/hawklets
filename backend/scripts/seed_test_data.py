#!/usr/bin/env python3
"""
Seed script: inserts 10 test users and 3 challenges.
Run from the backend/ directory:
    python scripts/seed_test_data.py

Idempotent — safe to run multiple times (uses upsert).
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

NOW = datetime.now(timezone.utc).isoformat()
HASHED_PASSWORD = pwd_context.hash("Password123!")

TEST_USERS = [
    {"email": "alex.stone@test.hawklets.com",    "display_name": "AlexStone",    "first_name": "Alex",    "last_name": "Stone",    "iron_points": 14200, "endurance_points": 3100},
    {"email": "brooke.hall@test.hawklets.com",   "display_name": "BrookeHall",   "first_name": "Brooke",  "last_name": "Hall",     "iron_points": 11800, "endurance_points": 6500},
    {"email": "carlos.reyes@test.hawklets.com",  "display_name": "CarlosReyes",  "first_name": "Carlos",  "last_name": "Reyes",    "iron_points": 9400,  "endurance_points": 7200},
    {"email": "diana.wu@test.hawklets.com",      "display_name": "DianaWu",      "first_name": "Diana",   "last_name": "Wu",       "iron_points": 7600,  "endurance_points": 4800},
    {"email": "ethan.moss@test.hawklets.com",    "display_name": "EthanMoss",    "first_name": "Ethan",   "last_name": "Moss",     "iron_points": 5300,  "endurance_points": 9100},
    {"email": "fiona.blake@test.hawklets.com",   "display_name": "FionaBlake",   "first_name": "Fiona",   "last_name": "Blake",    "iron_points": 3200,  "endurance_points": 2900},
    {"email": "gabriel.nash@test.hawklets.com",  "display_name": "GabrielNash",  "first_name": "Gabriel", "last_name": "Nash",     "iron_points": 12500, "endurance_points": 1400},
    {"email": "hana.porter@test.hawklets.com",   "display_name": "HanaPorter",   "first_name": "Hana",    "last_name": "Porter",   "iron_points": 800,   "endurance_points": 8600},
    {"email": "ivan.cross@test.hawklets.com",    "display_name": "IvanCross",    "first_name": "Ivan",    "last_name": "Cross",    "iron_points": 6700,  "endurance_points": 5500},
    {"email": "jade.rivers@test.hawklets.com",   "display_name": "JadeRivers",   "first_name": "Jade",    "last_name": "Rivers",   "iron_points": 10100, "endurance_points": 3800},
]

CHALLENGES = [
    {
        "title": "Iron Week",
        "description": "Earn 10,000 Iron Points in a single week. Every kilogram lifted counts!",
        "type": "ip",
        "target_ip": 10000,
        "target_ep": 0,
        "duration_days": 7,
        "min_participants": 1,
        "is_active": True,
    },
    {
        "title": "Endurance Week",
        "description": "Earn 10,000 Endurance Points in a single week. Push your cardio to the limit!",
        "type": "ep",
        "target_ip": 0,
        "target_ep": 10000,
        "duration_days": 7,
        "min_participants": 1,
        "is_active": True,
    },
    {
        "title": "Iron vs Endurance Duel",
        "description": "Race a rival: be the first to earn 5,000 IP and 5,000 EP. Requires two participants.",
        "type": "mixed",
        "target_ip": 5000,
        "target_ep": 5000,
        "duration_days": 7,
        "min_participants": 2,
        "is_active": True,
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=== Seeding test users ===")
    for u in TEST_USERS:
        doc = {
            "_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, u["email"])),
            "email": u["email"],
            "display_name": u["display_name"],
            "first_name": u["first_name"],
            "last_name": u["last_name"],
            "preferences": {},
            "iron_points": u["iron_points"],
            "endurance_points": u["endurance_points"],
            "friend_ids": [],
            "auth": {"hashed_password": HASHED_PASSWORD},
            "created_at": NOW,
            "updated_at": NOW,
            "deleted_at": None,
        }
        result = await db.users.update_one(
            {"email": u["email"]},
            {"$setOnInsert": doc},
            upsert=True,
        )
        if result.upserted_id:
            print(f"  created : {u['email']}  IP={u['iron_points']}  EP={u['endurance_points']}")
        else:
            print(f"  exists  : {u['email']}")

    print("\n=== Seeding challenges ===")
    for c in CHALLENGES:
        doc = {
            "_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"challenge:{c['title']}")),
            "created_at": NOW,
            "updated_at": NOW,
            "deleted_at": None,
            **c,
        }
        result = await db.challenges.update_one(
            {"title": c["title"]},
            {"$setOnInsert": doc},
            upsert=True,
        )
        if result.upserted_id:
            print(f"  created : {c['title']}")
        else:
            print(f"  exists  : {c['title']}")

    client.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(seed())
