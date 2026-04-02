from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path

current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models import RoutineCreate, RoutineUpdate, RoutineResponse
    from backend.models.mongo_models import Routine
    from backend.routers.auth import get_current_user
except ImportError:
    try:
        from models import RoutineCreate, RoutineUpdate, RoutineResponse
        from models.mongo_models import Routine
        from routers.auth import get_current_user
    except ImportError:
        from ..models import RoutineCreate, RoutineUpdate, RoutineResponse
        from ..models.mongo_models import Routine
        from ..routers.auth import get_current_user

router = APIRouter(prefix="/routines", tags=["routines"])

db = None


def set_db_connection(database):
    global db
    db = database


async def _compute_streak(user_id: str, routine: dict) -> int:
    """
    Streak = number of consecutive complete calendar weeks (Mon–Sun) where
    the user logged >= workouts_per_week workouts.

    Only logs on or after streak_started_at are counted. If streak_started_at
    is not set, created_at is used as the floor.

    Current week: if the user can no longer meet the target (count so far +
    remaining days in week < target), the streak is considered broken.
    """
    workouts_per_week = routine.get("workouts_per_week", 3)

    floor = routine.get("streak_started_at") or routine.get("created_at")
    if isinstance(floor, str):
        floor = datetime.fromisoformat(floor.replace("Z", "+00:00"))
    if floor is None:
        return 0

    logs = await db.workout_logs.find(
        {"owner_id": user_id, "logged_at": {"$gte": floor}},
        {"logged_at": 1},
    ).sort("logged_at", 1).to_list(length=1000)

    # Build week → count map  (week key = ISO date of Monday)
    week_counts: dict[str, int] = {}
    for log in logs:
        ld = log.get("logged_at")
        if isinstance(ld, str):
            ld = datetime.fromisoformat(ld.replace("Z", "+00:00"))
        if ld is None:
            continue
        d = ld.date() if hasattr(ld, "date") else ld
        week_monday = d - timedelta(days=d.weekday())
        key = week_monday.isoformat()
        week_counts[key] = week_counts.get(key, 0) + 1

    today = datetime.now(timezone.utc).date()
    current_monday = today - timedelta(days=today.weekday())

    # Check whether current week is already impossible to complete
    days_remaining_incl_today = 7 - today.weekday()  # Mon=0 → 7, Sun=6 → 1
    current_count = week_counts.get(current_monday.isoformat(), 0)
    current_week_failed = (current_count + days_remaining_incl_today) < workouts_per_week

    if current_week_failed:
        return 0

    # Walk back through past complete weeks
    streak = 0
    if current_count >= workouts_per_week:
        streak = 1  # current week already complete

    check_monday = current_monday - timedelta(weeks=1)
    floor_date = floor.date() if hasattr(floor, "date") else floor
    while check_monday >= floor_date:
        if week_counts.get(check_monday.isoformat(), 0) >= workouts_per_week:
            streak += 1
            check_monday -= timedelta(weeks=1)
        else:
            break

    return streak


async def _routine_to_response(r: dict, user_id: str) -> RoutineResponse:
    streak = await _compute_streak(user_id, r) if r.get("is_active") else 0
    return RoutineResponse(
        id=str(r["_id"]),
        name=r["name"],
        workout_ids=r.get("workout_ids", []),
        is_active=r.get("is_active", False),
        owner_id=r["owner_id"],
        workouts_per_week=r.get("workouts_per_week", 3),
        streak=streak,
        created_at=r.get("created_at", datetime.now(timezone.utc)),
        updated_at=r.get("updated_at", datetime.now(timezone.utc)),
    )


@router.get("", response_model=List[RoutineResponse])
async def get_routines(
    current_user: dict = Depends(get_current_user),
):
    """Получение всех Routines пользователя"""
    user_id = current_user["id"]
    routines = await db.routines.find(
        {"owner_id": user_id, "deleted_at": None},
    ).sort("updated_at", -1).to_list(length=200)
    return [await _routine_to_response(r, user_id) for r in routines]


@router.post("", response_model=RoutineResponse, status_code=status.HTTP_201_CREATED)
async def create_routine(
    routine_data: RoutineCreate,
    current_user: dict = Depends(get_current_user),
):
    """Создание новой Routine"""
    if len(routine_data.workout_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A routine must include at least one workout",
        )

    user_id = current_user["id"]

    routine = Routine(
        owner_id=user_id,
        name=routine_data.name,
        workout_ids=routine_data.workout_ids,
        workouts_per_week=routine_data.workouts_per_week,
        is_active=False,
    )

    doc = routine.to_mongo()
    await db.routines.insert_one(doc)
    return await _routine_to_response(doc | {"_id": routine.id}, user_id)


@router.get("/{routine_id}", response_model=RoutineResponse)
async def get_routine(
    routine_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Получение конкретной Routine"""
    user_id = current_user["id"]
    r = await db.routines.find_one({"_id": routine_id, "owner_id": user_id})
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")
    return await _routine_to_response(r, user_id)


@router.put("/{routine_id}", response_model=RoutineResponse)
async def update_routine(
    routine_id: str,
    routine_data: RoutineUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Обновление Routine (название, список workouts, workouts_per_week)"""
    user_id = current_user["id"]

    r = await db.routines.find_one({"_id": routine_id, "owner_id": user_id})
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")

    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if routine_data.name is not None:
        update_fields["name"] = routine_data.name
    if routine_data.workout_ids is not None:
        if len(routine_data.workout_ids) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A routine must include at least one workout",
            )
        update_fields["workout_ids"] = routine_data.workout_ids
    if routine_data.workouts_per_week is not None:
        update_fields["workouts_per_week"] = routine_data.workouts_per_week

    await db.routines.update_one({"_id": routine_id}, {"$set": update_fields})
    updated = await db.routines.find_one({"_id": routine_id})
    return await _routine_to_response(updated, user_id)


@router.post("/{routine_id}/set-active", response_model=RoutineResponse)
async def set_active_routine(
    routine_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Установить Routine как активную (снимает флаг с остальных)"""
    user_id = current_user["id"]

    r = await db.routines.find_one({"_id": routine_id, "owner_id": user_id})
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")

    now = datetime.now(timezone.utc)

    # Снимаем is_active со всех routines пользователя
    await db.routines.update_many(
        {"owner_id": user_id},
        {"$set": {"is_active": False}},
    )
    # Активируем выбранную; сбрасываем streak_started_at → отсчёт заново
    await db.routines.update_one(
        {"_id": routine_id},
        {"$set": {"is_active": True, "streak_started_at": now, "updated_at": now}},
    )

    updated = await db.routines.find_one({"_id": routine_id})
    return await _routine_to_response(updated, user_id)


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routine(
    routine_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Удаление Routine"""
    user_id = current_user["id"]

    result = await db.routines.delete_one({"_id": routine_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")

    return None
