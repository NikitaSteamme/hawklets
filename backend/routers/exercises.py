from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone
import sys
from pathlib import Path

# Add parent directory to sys.path to allow both absolute and relative imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models import (
        ExerciseCreate,
        ExerciseUpdate,
        PaginationParams,
        PaginatedResponse
    )
    from backend.models.mongo_models import ExerciseGlobal, ExerciseUser
    from backend.routers.auth import get_current_user
except ImportError:
    # If backend.models doesn't work, try direct import
    try:
        from models import (
            ExerciseCreate,
            ExerciseUpdate,
            PaginationParams,
            PaginatedResponse
        )
        from models.mongo_models import ExerciseGlobal, ExerciseUser
        from routers.auth import get_current_user
    except ImportError:
        # Last resort: try relative import
        from ..models import (
            ExerciseCreate,
            ExerciseUpdate,
            PaginationParams,
            PaginatedResponse
        )
        from ..models.mongo_models import ExerciseGlobal, ExerciseUser
        from ..routers.auth import get_current_user

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("/global", response_model=List[ExerciseGlobal])
async def get_global_exercises(
    search: Optional[str] = Query(None, description="Search by name"),
    muscle_group: Optional[str] = Query(None, description="Filter by muscle group"),
    equipment: Optional[str] = Query(None, description="Filter by equipment"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Получение глобальных упражнений"""
    # Здесь будет запрос к MongoDB
    # filters = {}
    # if search:
    #     filters["name"] = {"$regex": search, "$options": "i"}
    # if muscle_group:
    #     filters["muscle_groups"] = muscle_group
    # if equipment:
    #     filters["equipment"] = equipment
    
    # exercises = await db.exercises_global.find(
    #     filters,
    #     {"_id": 0}
    # ).skip(skip).limit(limit).to_list(length=limit)
    
    # return [ExerciseGlobal.from_mongo(ex) for ex in exercises]
    
    # Заглушка для примера
    return [
        ExerciseGlobal(
            id="1",
            name="Bench Press",
            muscle_groups=["chest", "triceps", "shoulders"],
            equipment="barbell",
            movement_pattern="push",
            default_tracking={"primary_metric": "weight", "secondary_metric": "reps"},
            version=1,
            updated_at=datetime.now(timezone.utc)
        )
    ]


@router.get("/global/{exercise_id}", response_model=ExerciseGlobal)
async def get_global_exercise(exercise_id: str):
    """Получение конкретного глобального упражнения"""
    # exercise = await db.exercises_global.find_one({"_id": exercise_id}, {"_id": 0})
    # if not exercise:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Exercise not found"
    #     )
    # return ExerciseGlobal.from_mongo(exercise)
    
    # Заглушка
    if exercise_id != "1":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    return ExerciseGlobal(
        id="1",
        name="Bench Press",
        muscle_groups=["chest", "triceps", "shoulders"],
        equipment="barbell",
        movement_pattern="push",
        default_tracking={"primary_metric": "weight", "secondary_metric": "reps"},
        version=1,
        updated_at=datetime.now(timezone.utc)
    )


@router.get("/user", response_model=PaginatedResponse)
async def get_user_exercises(
    current_user: dict = Depends(get_current_user),
    pagination: PaginationParams = Depends(),
    search: Optional[str] = None,
    include_deleted: bool = False
):
    """Получение пользовательских упражнений с пагинацией"""
    user_id = current_user["id"]
    
    # filters = {"owner_id": user_id}
    # if not include_deleted:
    #     filters["deleted_at"] = None
    
    # if search:
    #     filters["name"] = {"$regex": search, "$options": "i"}
    
    # total = await db.exercises_user.count_documents(filters)
    
    # sort_field = pagination.sort_by or "updated_at"
    # sort_order = -1 if pagination.sort_order == "desc" else 1
    
    # exercises = await db.exercises_user.find(
    #     filters,
    #     {"_id": 0}
    # ).sort(sort_field, sort_order).skip(
    #     (pagination.page - 1) * pagination.page_size
    # ).limit(pagination.page_size).to_list(length=pagination.page_size)
    
    # items = [ExerciseUser.from_mongo(ex) for ex in exercises]
    
    # Заглушка
    items = [
        ExerciseUser(
            id="1",
            owner_id=user_id,
            name="Custom Push-up",
            muscle_groups=["chest", "triceps"],
            equipment="bodyweight",
            movement_pattern="push",
            default_tracking={"primary_metric": "reps"},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    ]
    
    return PaginatedResponse(
        items=items,
        total=1,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=1
    )


@router.post("/user", response_model=ExerciseUser, status_code=status.HTTP_201_CREATED)
async def create_user_exercise(
    exercise_data: ExerciseCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создание пользовательского упражнения"""
    user_id = current_user["id"]
    
    # Проверяем, нет ли уже упражнения с таким именем у пользователя
    # existing = await db.exercises_user.find_one({
    #     "owner_id": user_id,
    #     "name": exercise_data.name,
    #     "deleted_at": None
    # })
    # if existing:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Exercise with this name already exists"
    #     )
    
    exercise = ExerciseUser(
        owner_id=user_id,
        name=exercise_data.name,
        muscle_groups=exercise_data.muscle_groups,
        equipment=exercise_data.equipment,
        movement_pattern=exercise_data.movement_pattern,
        default_tracking=exercise_data.default_tracking
    )
    
    # Сохраняем в базу данных
    # await db.exercises_user.insert_one(exercise.to_mongo())
    
    return exercise


@router.put("/user/{exercise_id}", response_model=ExerciseUser)
async def update_user_exercise(
    exercise_id: str,
    exercise_data: ExerciseUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновление пользовательского упражнения"""
    user_id = current_user["id"]
    
    # Находим упражнение
    # exercise = await db.exercises_user.find_one({
    #     "_id": exercise_id,
    #     "owner_id": user_id,
    #     "deleted_at": None
    # })
    # if not exercise:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Exercise not found"
    #     )
    
    # Обновляем поля
    update_data = exercise_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # await db.exercises_user.update_one(
    #     {"_id": exercise_id},
    #     {"$set": update_data}
    # )
    
    # Получаем обновленное упражнение
    # updated_exercise = await db.exercises_user.find_one({"_id": exercise_id}, {"_id": 0})
    
    # Заглушка
    updated_exercise = ExerciseUser(
        id=exercise_id,
        owner_id=user_id,
        name=exercise_data.name or "Updated Exercise",
        muscle_groups=exercise_data.muscle_groups or ["chest"],
        equipment=exercise_data.equipment,
        movement_pattern=exercise_data.movement_pattern,
        default_tracking=exercise_data.default_tracking or {},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    return updated_exercise


@router.delete("/user/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user),
    permanent: bool = Query(False, description="Permanent deletion")
):
    """Удаление пользовательского упражнения"""
    user_id = current_user["id"]
    
    # Находим упражнение
    # exercise = await db.exercises_user.find_one({
    #     "_id": exercise_id,
    #     "owner_id": user_id
    # })
    # if not exercise:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Exercise not found"
    #     )
    
    if permanent:
        # Полное удаление
        # await db.exercises_user.delete_one({"_id": exercise_id})
        pass
    else:
        # Мягкое удаление
        # await db.exercises_user.update_one(
        #     {"_id": exercise_id},
        #     {"$set": {"deleted_at": datetime.now(timezone.utc)}}
        # )
        pass
    
    return None


@router.post("/user/{exercise_id}/restore", response_model=ExerciseUser)
async def restore_user_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Восстановление удаленного упражнения"""
    user_id = current_user["id"]
    
    # Находим удаленное упражнение
    # exercise = await db.exercises_user.find_one({
    #     "_id": exercise_id,
    #     "owner_id": user_id,
    #     "deleted_at": {"$ne": None}
    # })
    # if not exercise:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Exercise not found or not deleted"
    #     )
    
    # Восстанавливаем
    # await db.exercises_user.update_one(
    #     {"_id": exercise_id},
    #     {"$set": {"deleted_at": None}}
    # )
    
    # Получаем восстановленное упражнение
    # restored_exercise = await db.exercises_user.find_one({"_id": exercise_id}, {"_id": 0})
    
    # Заглушка
    restored_exercise = ExerciseUser(
        id=exercise_id,
        owner_id=user_id,
        name="Restored Exercise",
        muscle_groups=["chest"],
        equipment="barbell",
        movement_pattern="push",
        default_tracking={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        deleted_at=None
    )
    
    return restored_exercise