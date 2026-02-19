from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
import uuid


class PaginationParams(BaseModel):
    """Параметры пагинации"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseModel):
    """Ответ с пагинацией"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserCreate(BaseModel):
    """Модель для создания пользователя"""
    email: EmailStr
    display_name: str
    password: str


class UserLogin(BaseModel):
    """Модель для входа пользователя"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Модель ответа с данными пользователя"""
    id: str
    email: EmailStr
    display_name: str
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    """Модель ответа с токеном"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None


class ExerciseCreate(BaseModel):
    """Модель для создания упражнения"""
    name: str
    muscle_groups: List[str] = Field(default_factory=list)
    equipment: Optional[str] = None
    movement_pattern: Optional[str] = None
    default_tracking: Dict[str, Any] = Field(default_factory=dict)


class ExerciseUpdate(BaseModel):
    """Модель для обновления упражнения"""
    name: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[str] = None
    movement_pattern: Optional[str] = None
    default_tracking: Optional[Dict[str, Any]] = None


class TemplateItemCreate(BaseModel):
    """Модель для создания элемента шаблона"""
    exercise_id: str
    order_index: int
    target_sets: Optional[int] = None
    target_reps_min: Optional[int] = None
    target_reps_max: Optional[int] = None
    rest_sec: Optional[int] = None
    notes: Optional[str] = None


class WorkoutTemplateCreate(BaseModel):
    """Модель для создания шаблона тренировки"""
    title: str
    description: Optional[str] = None
    visibility: str = Field(default="private")
    items: List[TemplateItemCreate] = Field(default_factory=list)


class WorkoutTemplateUpdate(BaseModel):
    """Модель для обновления шаблона тренировки"""
    title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None
    revision: Optional[int] = None


class WorkoutSessionCreateRequest(BaseModel):
    """Запрос на создание сессии тренировки"""
    template_id: Optional[str] = None
    started_at: Optional[datetime] = None
    notes: Optional[str] = None
    source: str = Field(default="manual")


class SessionSetCreateRequest(BaseModel):
    """Запрос на создание подхода"""
    exercise_id: str
    set_index: int
    weight_kg: Optional[float] = None
    reps: Optional[int] = None
    rpe: Optional[float] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    flags: Optional[Dict[str, Any]] = None


class IMURecordCreateRequest(BaseModel):
    """Запрос на создание IMU записи"""
    set_id: Optional[str] = None
    exercise_id: Optional[str] = None
    sample_rate_hz: int
    duration_ms: int
    format: str
    checksum: Optional[str] = None
    local_path: str
    cloud_path: Optional[str] = None


class ErrorResponse(BaseModel):
    """Модель ответа с ошибкой"""
    detail: str
    code: Optional[str] = None
    field: Optional[str] = None


class SuccessResponse(BaseModel):
    """Модель успешного ответа"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None


class HealthCheckResponse(BaseModel):
    """Модель ответа проверки здоровья"""
    status: str
    timestamp: datetime
    version: str
    dependencies: Dict[str, str]