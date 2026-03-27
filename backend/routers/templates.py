from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone
import secrets
import sys
from pathlib import Path

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


# ─── Exercise name population ─────────────────────────────────────────────────

async def _populate_exercise_names(workout_docs: list) -> list:
    """
    One-shot batch query: collect all unique exercise_ids across all workout
    documents, fetch their names from exercises_global, then attach
    exercise_name to every item dict.  Falls back to exercise_id if not found.
    """
    all_ids = list({
        item["exercise_id"]
        for w in workout_docs
        for item in w.get("items", [])
    })
    if not all_ids:
        return workout_docs

    exercises = await db.exercises_global.find(
        {"_id": {"$in": all_ids}},
        {"_id": 1, "name": 1}
    ).to_list(length=len(all_ids))

    name_map = {ex["_id"]: ex["name"] for ex in exercises}

    for w in workout_docs:
        for item in w.get("items", []):
            item["exercise_name"] = name_map.get(
                item["exercise_id"], item["exercise_id"]
            )

    return workout_docs


# ─── Endpoints ────────────────────────────────────────────────────────────────

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

    # NOTE: do NOT pass {"_id": 0} — we need _id to build stable workout IDs
    docs = await db.workouts.find(filters).sort(sort_field, sort_order).skip(
        (pagination.page - 1) * pagination.page_size
    ).limit(pagination.page_size).to_list(length=pagination.page_size)

    docs = await _populate_exercise_names(docs)
    items = [Workout.from_mongo(w) for w in docs]

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
    """Получение конкретного Workout"""
    user_id = current_user["id"]

    doc = await db.workouts.find_one({
        "_id": workout_id,
        "$or": [
            {"owner_id": user_id},
            {"visibility": "public"},
            {"visibility": "unlisted"},
        ],
        "deleted_at": None,
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    docs = await _populate_exercise_names([doc])
    return Workout.from_mongo(docs[0])


@router.post("", response_model=Workout, status_code=status.HTTP_201_CREATED)
async def create_workout(
    workout_data: WorkoutCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создание Workout"""
    user_id = current_user["id"]

    items = [
        TemplateItem(
            exercise_id=item_data.exercise_id,
            order_index=item_data.order_index or i,
            target_sets=item_data.target_sets,
            target_reps_min=item_data.target_reps_min,
            target_reps_max=item_data.target_reps_max,
            target_weight_kg=getattr(item_data, "target_weight_kg", None),
            target_duration_sec=getattr(item_data, "target_duration_sec", None),
            rest_sec=item_data.rest_sec,
            notes=item_data.notes,
        )
        for i, item_data in enumerate(workout_data.items)
    ]

    workout = Workout(
        owner_id=user_id,
        title=workout_data.title,
        description=workout_data.description,
        visibility=workout_data.visibility,
        items=items,
    )

    if workout.visibility in ("unlisted", "public") and not workout.share_code:
        workout.share_code = secrets.token_urlsafe(8)

    doc = workout.to_mongo()
    await db.workouts.insert_one(doc)

    # Populate names so the response already contains exercise_name
    docs = await _populate_exercise_names([doc])
    return Workout.from_mongo(docs[0])


@router.put("/{workout_id}", response_model=Workout)
async def update_workout(
    workout_id: str,
    workout_data: WorkoutUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновление Workout"""
    user_id = current_user["id"]

    doc = await db.workouts.find_one({
        "_id": workout_id,
        "owner_id": user_id,
        "deleted_at": None,
    })
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    update_fields = workout_data.model_dump(exclude_unset=True)
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "revision" in update_fields:
        update_fields["revision"] = doc.get("revision", 1) + 1

    await db.workouts.update_one({"_id": workout_id}, {"$set": update_fields})

    updated = await db.workouts.find_one({"_id": workout_id})
    docs = await _populate_exercise_names([updated])
    return Workout.from_mongo(docs[0])


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    current_user: dict = Depends(get_current_user),
    permanent: bool = Query(False, description="Permanent deletion")
):
    """Удаление Workout"""
    user_id = current_user["id"]

    doc = await db.workouts.find_one({"_id": workout_id, "owner_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    if permanent:
        await db.workouts.delete_one({"_id": workout_id})
    else:
        await db.workouts.update_one(
            {"_id": workout_id},
            {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
        )

    return None


@router.post("/{workout_id}/duplicate", response_model=Workout)
async def duplicate_workout(
    workout_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Дублирование Workout"""
    user_id = current_user["id"]

    source = await db.workouts.find_one({
        "_id": workout_id,
        "$or": [{"owner_id": user_id}, {"visibility": "public"}],
        "deleted_at": None,
    })
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    import uuid
    new_doc = dict(source)
    new_doc["_id"] = str(uuid.uuid4())
    new_doc["owner_id"] = user_id
    new_doc["title"] = f"{source['title']} (Copy)"
    new_doc["share_code"] = None
    new_doc["visibility"] = "private"
    now = datetime.now(timezone.utc).isoformat()
    new_doc["created_at"] = now
    new_doc["updated_at"] = now
    new_doc["deleted_at"] = None

    await db.workouts.insert_one(new_doc)

    docs = await _populate_exercise_names([new_doc])
    return Workout.from_mongo(docs[0])


@router.get("/shared/{share_code}", response_model=Workout)
async def get_workout_by_share_code(share_code: str):
    """Получение Workout по share code"""
    doc = await db.workouts.find_one({
        "share_code": share_code,
        "visibility": {"$in": ["unlisted", "public"]},
        "deleted_at": None,
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    docs = await _populate_exercise_names([doc])
    return Workout.from_mongo(docs[0])
