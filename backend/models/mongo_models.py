from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from .base import BaseDocument, OwnerMixin, TimestampMixin


class User(BaseDocument):
    """Модель пользователя"""
    email: EmailStr
    display_name: str
    preferences: Dict[str, Any] = Field(default_factory=dict)
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
    order_index: int
    target_sets: Optional[int] = None
    target_reps_min: Optional[int] = None
    target_reps_max: Optional[int] = None
    rest_sec: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkoutTemplate(BaseDocument, OwnerMixin):
    """Шаблон тренировки"""
    title: str
    description: Optional[str] = None
    visibility: str = Field(default="private")  # private/unlisted/public
    share_code: Optional[str] = None
    revision: int = Field(default=1)
    items: List[TemplateItem] = Field(default_factory=list)
    
    class Config:
        collection_name = "workout_templates"
        indexes = [
            {"key": [("owner_id", 1), ("updated_at", -1)]},
            {"key": [("share_code", 1)], "sparse": True},
            {"key": [("visibility", 1)]}
        ]


# Импортируем uuid здесь, чтобы избежать циклического импорта
import uuid
from datetime import timezone