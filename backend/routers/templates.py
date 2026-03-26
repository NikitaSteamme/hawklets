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
        WorkoutCreate,
        WorkoutUpdate,
        TemplateItemCreate,
        PaginationParams,
        PaginatedResponse
    )
    from backend.models.mongo_models import Workout, TemplateItem
    from backend.routers.auth import get_current_user
except ImportError:
    try:
        from models import (
            WorkoutCreate,
            WorkoutUpdate,
            TemplateItemCreate,
            PaginationParams,
            PaginatedResponse
        )
        from models.mongo_models import Workout, TemplateItem
        from routers.auth import get_current_user
    except ImportError:
        from ..models import (
            WorkoutCreate,
            WorkoutUpdate,
            TemplateItemCreate,
            PaginationParams,
            PaginatedResponse
        )
        from ..models.mongo_models import Workout, TemplateItem
        from ..routers.auth import get_current_user

router = APIRouter(prefix="/workouts", tags=["workouts"])

db = None

def set_db_connection(database):
    global db
    db = database


@router.get("", response_model=PaginatedResponse)
async def get_workouts(
    current_user: dict = Depends(get_current_user),
    pagination: PaginationParams = Depends(),
    search: Optional[str] = None,
    visibility: Optional[str] = Query(None, pattern="^(private|unlisted|public)$"),
    include_deleted: bool = False
):
    """Получение Workouts пользователя с пагинацией"""
    user_id = current_user["id"]
    
    filters = {"owner_id": user_id}
    if not include_deleted:
        filters["deleted_at"] = None
    
    if search:
        filters["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if visibility:
        filters["visibility"] = visibility
    
    total = await db.workouts.count_documents(filters)
    
    sort_field = pagination.sort_by or "updated_at"
    sort_order = -1 if pagination.sort_order == "desc" else 1
    
    templates = await db.workouts.find(
        filters,
        {"_id": 0}
    ).sort(sort_field, sort_order).skip(
        (pagination.page - 1) * pagination.page_size
    ).limit(pagination.page_size).to_list(length=pagination.page_size)
    
    items = [Workout.from_mongo(w) for w in templates]
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=(total + pagination.page_size - 1) // pagination.page_size
    )


@router.get("/{workout_id}", response_model=Workout)
async def get_workout(
    workout_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получение конкретного шаблона тренировки"""
    user_id = current_user["id"]
    
    # template = await db.workouts.find_one({
    #     "_id": template_id,
    #     "$or": [
    #         {"owner_id": user_id},
    #         {"visibility": "public"},
    #         {"visibility": "unlisted", "share_code": {"$exists": True}}
    #     ],
    #     "deleted_at": None
    # }, {"_id": 0})
    
    # if not template:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Template not found"
    #     )
    
    # Заглушка
    if template_id != "1":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return Workout(
        id="1",
        owner_id=user_id,
        title="Push Day",
        description="Chest and triceps workout",
        visibility="private",
        revision=1,
        items=[
            TemplateItem(
                id="1",
                exercise_id="1",
                order_index=0,
                target_sets=3,
                target_reps_min=8,
                target_reps_max=12,
                rest_sec=90
            )
        ],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )


@router.post("", response_model=Workout, status_code=status.HTTP_201_CREATED)
async def create_workout(
    workout_data: WorkoutCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создание Workout"""
    user_id = current_user["id"]
    
    # Создаем элементы шаблона
    items = []
    for i, item_data in enumerate(workout_data.items):
        item = TemplateItem(
            exercise_id=item_data.exercise_id,
            order_index=item_data.order_index or i,
            target_sets=item_data.target_sets,
            target_reps_min=item_data.target_reps_min,
            target_reps_max=item_data.target_reps_max,
            target_weight_kg=getattr(item_data, "target_weight_kg", None),
            target_duration_sec=getattr(item_data, "target_duration_sec", None),
            rest_sec=item_data.rest_sec,
            notes=item_data.notes
        )
        items.append(item)
    
    workout = Workout(
        owner_id=user_id,
        title=workout_data.title,
        description=workout_data.description,
        visibility=workout_data.visibility,
        items=items
    )

    if workout.visibility in ["unlisted", "public"] and not workout.share_code:
        import secrets
        workout.share_code = secrets.token_urlsafe(8)

    await db.workouts.insert_one(workout.to_mongo())

    return workout


@router.put("/{workout_id}", response_model=Workout)
async def update_workout(
    workout_id: str,
    workout_data: WorkoutUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновление Workout"""
    user_id = current_user["id"]
    
    # Находим шаблон
    # template = await db.workouts.find_one({
    #     "_id": template_id,
    #     "owner_id": user_id,
    #     "deleted_at": None
    # })
    # if not template:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Template not found"
    #     )
    
    # Обновляем поля
    update_data = workout_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Если обновляется revision, увеличиваем его
    if "revision" in update_data:
        update_data["revision"] = template.get("revision", 1) + 1
    
    # await db.workouts.update_one(
    #     {"_id": template_id},
    #     {"$set": update_data}
    # )
    
    # Получаем обновленный шаблон
    # updated_template = await db.workouts.find_one({"_id": template_id}, {"_id": 0})
    
    # Заглушка
    updated_template = Workout(
        id=template_id,
        owner_id=user_id,
        title=workout_data.title or "Updated Template",
        description=workout_data.description,
        visibility=workout_data.visibility or "private",
        revision=2,
        items=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    return updated_template


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    current_user: dict = Depends(get_current_user),
    permanent: bool = Query(False, description="Permanent deletion")
):
    """Удаление шаблона тренировки"""
    user_id = current_user["id"]
    
    # Находим шаблон
    # template = await db.workouts.find_one({
    #     "_id": template_id,
    #     "owner_id": user_id
    # })
    # if not template:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Template not found"
    #     )
    
    if permanent:
        # Полное удаление
        # await db.workouts.delete_one({"_id": template_id})
        pass
    else:
        # Мягкое удаление
        # await db.workouts.update_one(
        #     {"_id": template_id},
        #     {"$set": {"deleted_at": datetime.now(timezone.utc)}}
        # )
        pass
    
    return None


@router.post("/{workout_id}/duplicate", response_model=Workout)
async def duplicate_workout(
    workout_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Дублирование шаблона тренировки"""
    user_id = current_user["id"]
    
    # Находим исходный шаблон
    # source_template = await db.workouts.find_one({
    #     "_id": template_id,
    #     "$or": [
    #         {"owner_id": user_id},
    #         {"visibility": "public"}
    #     ],
    #     "deleted_at": None
    # })
    # if not source_template:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Template not found"
    #     )
    
    # Создаем копию
    # new_template = source_template.copy()
    # new_template["_id"] = str(uuid.uuid4())
    # new_template["owner_id"] = user_id
    # new_template["title"] = f"{source_template['title']} (Copy)"
    # new_template["share_code"] = None
    # new_template["created_at"] = datetime.now(timezone.utc)
    # new_template["updated_at"] = datetime.now(timezone.utc)
    # new_template["deleted_at"] = None
    
    # await db.workouts.insert_one(new_template)
    
    # Заглушка
    new_template = Workout(
        id="2",
        owner_id=user_id,
        title="Push Day (Copy)",
        description="Chest and triceps workout - Copy",
        visibility="private",
        revision=1,
        items=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    return new_template


@router.get("/shared/{share_code}", response_model=Workout)
async def get_workout_by_share_code(share_code: str):
    """Получение Workout по share code"""
    # template = await db.workouts.find_one({
    #     "share_code": share_code,
    #     "visibility": {"$in": ["unlisted", "public"]},
    #     "deleted_at": None
    # }, {"_id": 0})
    
    # if not template:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Template not found"
    #     )
    
    # Заглушка
    if share_code != "abc123":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return Workout(
        id="3",
        owner_id="user123",
        title="Shared Workout",
        description="Public workout template",
        visibility="public",
        share_code="abc123",
        revision=1,
        items=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )