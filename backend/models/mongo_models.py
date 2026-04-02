from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from .base import BaseDocument, OwnerMixin, TimestampMixin


class User(BaseDocument):
    """Модель пользователя"""
    email: EmailStr
    display_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)
    iron_points: int = 0
    endurance_points: int = 0
    friend_ids: List[str] = Field(default_factory=list)
    avatar_url: Optional[str] = None
    auth: Optional[Dict[str, Any]] = None
    
    class Config:
        collection_name = "users"
        indexes = [
            {"key": [("email", 1)], "unique": True},
            {"key": [("created_at", -1)]}
        ]


class Admin(BaseDocument):
    """Модель администратора"""
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: str = Field(default="admin")  # admin/superadmin
    permissions: List[str] = Field(default_factory=list)
    auth: Optional[Dict[str, Any]] = None
    
    class Config:
        collection_name = "admins"
        indexes = [
            {"key": [("email", 1)], "unique": True},
            {"key": [("username", 1)], "unique": True},
            {"key": [("created_at", -1)]}
        ]


class ExerciseGlobal(BaseDocument):
    """Глобальные упражнения (общие для всех пользователей)"""
    name: str
    muscle_groups: List[str] = Field(default_factory=list)
    equipment: Optional[str] = None
    movement_pattern: Optional[str] = None
    default_tracking: Dict[str, Any] = Field(default_factory=dict)
    version: int = 1
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        collection_name = "exercises_global"
        indexes = [
            {"key": [("name", 1)]},
            {"key": [("muscle_groups", 1)]},
            {"key": [("updated_at", -1)]}
        ]


class ExerciseUser(BaseDocument, OwnerMixin):
    """Пользовательские упражнения"""
    name: str
    muscle_groups: List[str] = Field(default_factory=list)
    equipment: Optional[str] = None
    movement_pattern: Optional[str] = None
    default_tracking: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        collection_name = "exercises_user"
        indexes = [
            {"key": [("owner_id", 1), ("updated_at", -1)]},
            {"key": [("owner_id", 1), ("deleted_at", 1)]},
            {"key": [("name", 1)]}
        ]


class TemplateItem(BaseModel):
    """Элемент шаблона тренировки (вложенный документ)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exercise_id: str
    # Populated at read time by joining with exercises_global; not stored in DB
    exercise_name: Optional[str] = None
    exercise_type: Optional[str] = None  # e.g. 'imu', 'timed', 'cardio'
    order_index: int
    target_sets: Optional[int] = None
    target_reps_min: Optional[int] = None
    target_reps_max: Optional[int] = None
    target_weight_kg: Optional[float] = None
    target_duration_sec: Optional[int] = None
    rest_sec: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Workout(BaseDocument, OwnerMixin):
    """Workout — набор упражнений для одной тренировки (бывший WorkoutTemplate)"""
    title: str
    description: Optional[str] = None
    visibility: str = Field(default="private")  # private/unlisted/public
    share_code: Optional[str] = None
    revision: int = Field(default=1)
    items: List[TemplateItem] = Field(default_factory=list)

    class Config:
        collection_name = "workouts"
        indexes = [
            {"key": [("owner_id", 1), ("updated_at", -1)]},
            {"key": [("share_code", 1)], "sparse": True},
            {"key": [("visibility", 1)]}
        ]


class Routine(BaseDocument, OwnerMixin):
    """Routine — именованный набор Workouts (минимум 1)"""
    name: str
    workout_ids: List[str] = Field(default_factory=list)
    is_active: bool = Field(default=False)
    workouts_per_week: int = Field(default=3)
    # Set to now() when this routine becomes active; all logs before this date don't count towards streak
    streak_started_at: Optional[datetime] = None

    class Config:
        collection_name = "routines"
        indexes = [
            {"key": [("owner_id", 1), ("updated_at", -1)]},
            {"key": [("owner_id", 1), ("is_active", 1)]},
        ]


class WorkoutLog(BaseDocument, OwnerMixin):
    """WorkoutLog — запись о проведённой тренировке"""
    workout_name: str
    workout_id: Optional[str] = None
    logged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None

    class Config:
        collection_name = "workout_logs"
        indexes = [
            {"key": [("owner_id", 1), ("logged_at", -1)]},
        ]


class Challenge(BaseDocument):
    """Challenge — соревновательный вызов для пользователей"""
    title: str
    description: Optional[str] = None
    type: str = Field(default="ip")  # ip / ep / mixed
    target_ip: int = 0
    target_ep: int = 0
    duration_days: int = 7
    min_participants: int = 1
    is_active: bool = True

    class Config:
        collection_name = "challenges"
        indexes = [
            {"key": [("is_active", 1)]},
            {"key": [("type", 1)]},
        ]


class Notification(BaseDocument, OwnerMixin):
    """Notification — уведомление пользователя (запросы в друзья и т.п.)"""
    type: str = Field(default="friend_request")
    from_user_id: str
    from_user_name: str
    read: bool = False
    data: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        collection_name = "notifications"
        indexes = [
            {"key": [("owner_id", 1), ("read", 1)]},
            {"key": [("owner_id", 1), ("created_at", -1)]},
        ]


# Импортируем uuid здесь, чтобы избежать циклического импорта
import uuid
from datetime import timezone