from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
import sys
from pathlib import Path

current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models import WorkoutLogCreate, WorkoutLogResponse
    from backend.models.mongo_models import WorkoutLog
    from backend.routers.auth import get_current_user
except ImportError:
    try:
        from models import WorkoutLogCreate, WorkoutLogResponse
        from models.mongo_models import WorkoutLog
        from routers.auth import get_current_user
    except ImportError:
        from ..models import WorkoutLogCreate, WorkoutLogResponse
        from ..models.mongo_models import WorkoutLog
        from ..routers.auth import get_current_user

router = APIRouter(prefix="/workout-logs", tags=["workout-logs"])

db = None


def set_db_connection(database):
    global db
    db = database


def _log_to_response(doc: dict) -> WorkoutLogResponse:
    logged_at = doc.get("logged_at", doc.get("created_at", datetime.now(timezone.utc)))
    if isinstance(logged_at, str):
        logged_at = datetime.fromisoformat(logged_at.replace("Z", "+00:00"))
    created_at = doc.get("created_at", datetime.now(timezone.utc))
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return WorkoutLogResponse(
        id=str(doc["_id"]),
        workout_name=doc["workout_name"],
        workout_id=doc.get("workout_id"),
        logged_at=logged_at,
        duration_minutes=doc.get("duration_minutes"),
        notes=doc.get("notes"),
        owner_id=doc["owner_id"],
        created_at=created_at,
    )


@router.get("", response_model=List[WorkoutLogResponse])
async def get_workout_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """Получение журнала тренировок пользователя"""
    user_id = current_user["id"]
    logs = await db.workout_logs.find(
        {"owner_id": user_id},
    ).sort("logged_at", -1).to_list(length=limit)
    return [_log_to_response(doc) for doc in logs]


@router.post("", response_model=WorkoutLogResponse, status_code=status.HTTP_201_CREATED)
async def create_workout_log(
    log_data: WorkoutLogCreate,
    current_user: dict = Depends(get_current_user),
):
    """Добавить запись о тренировке"""
    user_id = current_user["id"]

    logged_at = log_data.logged_at or datetime.now(timezone.utc)

    log = WorkoutLog(
        owner_id=user_id,
        workout_name=log_data.workout_name,
        workout_id=log_data.workout_id,
        logged_at=logged_at,
        duration_minutes=log_data.duration_minutes,
        notes=log_data.notes,
    )

    doc = log.to_mongo()
    await db.workout_logs.insert_one(doc)
    return _log_to_response(doc | {"_id": log.id})


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_log(
    log_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Удалить запись о тренировке"""
    user_id = current_user["id"]
    result = await db.workout_logs.delete_one({"_id": log_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log entry not found")
    return None
