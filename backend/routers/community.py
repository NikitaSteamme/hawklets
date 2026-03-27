from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
import sys
import random
from pathlib import Path

current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models.mongo_models import Notification
    from backend.models.api_models import (
        ChallengeResponse, LeaderboardEntry, FriendResponse, NotificationResponse
    )
    from backend.routers.auth import get_current_user
except ImportError:
    try:
        from models.mongo_models import Notification
        from models.api_models import (
            ChallengeResponse, LeaderboardEntry, FriendResponse, NotificationResponse
        )
        from routers.auth import get_current_user
    except ImportError:
        from ..models.mongo_models import Notification
        from ..models.api_models import (
            ChallengeResponse, LeaderboardEntry, FriendResponse, NotificationResponse
        )
        from ..routers.auth import get_current_user

router = APIRouter(prefix="/community", tags=["community"])

db = None


def set_db_connection(database):
    global db
    db = database


def _parse_dt(val):
    if val is None:
        return datetime.now(timezone.utc)
    if isinstance(val, datetime):
        return val
    return datetime.fromisoformat(str(val).replace("Z", "+00:00"))


def _challenge_to_response(doc: dict) -> ChallengeResponse:
    return ChallengeResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description"),
        type=doc.get("type", "ip"),
        target_ip=doc.get("target_ip", 0),
        target_ep=doc.get("target_ep", 0),
        duration_days=doc.get("duration_days", 7),
        min_participants=doc.get("min_participants", 1),
        is_active=doc.get("is_active", True),
        created_at=_parse_dt(doc.get("created_at")),
    )


def _user_to_friend(doc: dict) -> FriendResponse:
    return FriendResponse(
        id=str(doc["_id"]),
        display_name=doc.get("display_name", ""),
        iron_points=doc.get("iron_points", 0),
        endurance_points=doc.get("endurance_points", 0),
    )


def _notif_to_response(doc: dict) -> NotificationResponse:
    return NotificationResponse(
        id=str(doc["_id"]),
        type=doc.get("type", "friend_request"),
        from_user_id=doc.get("from_user_id", ""),
        from_user_name=doc.get("from_user_name", ""),
        read=doc.get("read", False),
        created_at=_parse_dt(doc.get("created_at")),
        data=doc.get("data", {}),
    )


# ── Challenges ────────────────────────────────────────────────────────────────

@router.get("/challenges", response_model=List[ChallengeResponse])
async def get_challenges(
    current_user: dict = Depends(get_current_user),
):
    """Список активных челленджей"""
    docs = await db.challenges.find({"is_active": True}).to_list(length=100)
    return [_challenge_to_response(d) for d in docs]


# ── Leaderboard ───────────────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    current_user: dict = Depends(get_current_user),
):
    """Топ-3 пользователей по Iron Points"""
    docs = await db.users.find(
        {"deleted_at": None},
        {"_id": 1, "display_name": 1, "iron_points": 1, "endurance_points": 1},
    ).sort("iron_points", -1).to_list(length=3)

    return [
        LeaderboardEntry(
            id=str(doc["_id"]),
            display_name=doc.get("display_name", ""),
            iron_points=doc.get("iron_points", 0),
            endurance_points=doc.get("endurance_points", 0),
            rank=i + 1,
        )
        for i, doc in enumerate(docs)
    ]


# ── Friends ───────────────────────────────────────────────────────────────────

@router.get("/friends", response_model=List[FriendResponse])
async def get_friends(
    current_user: dict = Depends(get_current_user),
):
    """Список друзей текущего пользователя"""
    user = await db.users.find_one({"_id": current_user["id"]})
    friend_ids = user.get("friend_ids", []) if user else []
    if not friend_ids:
        return []
    docs = await db.users.find({"_id": {"$in": friend_ids}}).to_list(length=200)
    return [_user_to_friend(d) for d in docs]


@router.get("/suggestions", response_model=List[FriendResponse])
async def get_suggestions(
    current_user: dict = Depends(get_current_user),
):
    """5 случайных пользователей для знакомства"""
    user = await db.users.find_one({"_id": current_user["id"]})
    friend_ids = user.get("friend_ids", []) if user else []
    excluded = friend_ids + [current_user["id"]]

    docs = await db.users.find(
        {"_id": {"$nin": excluded}, "deleted_at": None},
        {"_id": 1, "display_name": 1, "iron_points": 1, "endurance_points": 1},
    ).to_list(length=50)

    sample = random.sample(docs, min(5, len(docs)))
    return [_user_to_friend(d) for d in sample]


@router.post("/friends/invite/{user_id}")
async def invite_friend(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Отправить запрос в друзья"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Проверяем, не отправлен ли уже запрос
    existing = await db.notifications.find_one({
        "owner_id": user_id,
        "from_user_id": current_user["id"],
        "type": "friend_request",
        "read": False,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Invitation already sent")

    notif = Notification(
        owner_id=user_id,
        type="friend_request",
        from_user_id=current_user["id"],
        from_user_name=current_user.get("display_name", ""),
    )
    await db.notifications.insert_one(notif.to_mongo())
    return {"success": True, "message": "Invitation sent"}


@router.post("/friends/accept/{notification_id}")
async def accept_friend(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Принять запрос в друзья"""
    notif = await db.notifications.find_one({
        "_id": notification_id,
        "owner_id": current_user["id"],
        "type": "friend_request",
    })
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    from_user_id = notif["from_user_id"]
    my_id = current_user["id"]

    await db.users.update_one({"_id": my_id}, {"$addToSet": {"friend_ids": from_user_id}})
    await db.users.update_one({"_id": from_user_id}, {"$addToSet": {"friend_ids": my_id}})
    await db.notifications.update_one({"_id": notification_id}, {"$set": {"read": True}})

    return {"success": True}


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: dict = Depends(get_current_user),
):
    """Непрочитанные уведомления текущего пользователя"""
    docs = await db.notifications.find(
        {"owner_id": current_user["id"], "read": False},
    ).sort("created_at", -1).to_list(length=50)
    return [_notif_to_response(d) for d in docs]


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Пометить уведомление как прочитанное"""
    await db.notifications.update_one(
        {"_id": notification_id, "owner_id": current_user["id"]},
        {"$set": {"read": True}},
    )
    return {"success": True}
