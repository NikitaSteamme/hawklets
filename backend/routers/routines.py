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


def _routine_to_response(r: dict) -> RoutineResponse:
    return RoutineResponse(
        id=str(r["_id"]),
        name=r["name"],
        workout_ids=r.get("workout_ids", []),
        is_active=r.get("is_active", False),
        owner_id=r["owner_id"],
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
    return [_routine_to_response(r) for r in routines]


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
        is_active=False,
    )

    await db.routines.insert_one(routine.to_mongo())
    return _routine_to_response(routine.to_mongo() | {"_id": routine.id})


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
    return _routine_to_response(r)


@router.put("/{routine_id}", response_model=RoutineResponse)
async def update_routine(
    routine_id: str,
    routine_data: RoutineUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Обновление Routine (название, список workouts)"""
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

    await db.routines.update_one({"_id": routine_id}, {"$set": update_fields})
    updated = await db.routines.find_one({"_id": routine_id})
    return _routine_to_response(updated)


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

    # Снимаем is_active со всех routines пользователя
    await db.routines.update_many(
        {"owner_id": user_id},
        {"$set": {"is_active": False}},
    )
    # Устанавливаем активную
    await db.routines.update_one(
        {"_id": routine_id},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}},
    )

    updated = await db.routines.find_one({"_id": routine_id})
    return _routine_to_response(updated)


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
