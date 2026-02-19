from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
import uuid
from decimal import Decimal


class WorkoutSessionBase(BaseModel):
    """Базовая модель сессии тренировки"""
    model_config = ConfigDict(from_attributes=True)
    
    owner_id: str
    template_id: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    source: str = Field(default="manual")  # manual/device
    metrics_summary: Optional[Dict[str, Any]] = None


class WorkoutSessionCreate(WorkoutSessionBase):
    """Модель для создания сессии тренировки"""
    pass


class WorkoutSessionUpdate(BaseModel):
    """Модель для обновления сессии тренировки"""
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    metrics_summary: Optional[Dict[str, Any]] = None


class WorkoutSession(WorkoutSessionBase):
    """Полная модель сессии тренировки"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class SessionSetBase(BaseModel):
    """Базовая модель подхода"""
    model_config = ConfigDict(from_attributes=True)
    
    session_id: str
    exercise_id: str
    set_index: int
    weight_kg: Optional[Decimal] = None
    reps: Optional[int] = None
    rpe: Optional[Decimal] = None  # Rate of Perceived Exertion
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    flags: Optional[Dict[str, Any]] = None


class SessionSetCreate(SessionSetBase):
    """Модель для создания подхода"""
    pass


class SessionSetUpdate(BaseModel):
    """Модель для обновления подхода"""
    weight_kg: Optional[Decimal] = None
    reps: Optional[int] = None
    rpe: Optional[Decimal] = None
    end_at: Optional[datetime] = None
    flags: Optional[Dict[str, Any]] = None


class SessionSet(SessionSetBase):
    """Полная модель подхода"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class IMURecordBase(BaseModel):
    """Базовая модель IMU записи"""
    model_config = ConfigDict(from_attributes=True)
    
    session_id: str
    set_id: Optional[str] = None
    exercise_id: Optional[str] = None
    sample_rate_hz: int
    duration_ms: int
    format: str  # csv/bin/json.gz
    checksum: Optional[str] = None
    local_path: str
    cloud_path: Optional[str] = None


class IMURecordCreate(IMURecordBase):
    """Модель для создания IMU записи"""
    pass


class IMURecordUpdate(BaseModel):
    """Модель для обновления IMU записи"""
    cloud_path: Optional[str] = None
    checksum: Optional[str] = None


class IMURecord(IMURecordBase):
    """Полная модель IMU записи"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class OutboxOperation(BaseModel):
    """Модель операции в очереди синхронизации"""
    model_config = ConfigDict(from_attributes=True)
    
    op_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str  # 'workout_sessions', 'session_sets', ...
    entity_id: str
    operation: str  # 'upsert' | 'delete'
    payload_json: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    retry_count: int = Field(default=0)
    last_error: Optional[str] = None
    next_retry_at: Optional[datetime] = None


# Импортируем необходимые модули
from pydantic import BaseModel
from datetime import timezone