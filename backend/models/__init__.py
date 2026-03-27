"""
Модели Pydantic для Hawklets API
"""

from .base import BaseDocument, TimestampMixin, OwnerMixin
from .mongo_models import (
    User,
    ExerciseGlobal,
    ExerciseUser,
    TemplateItem,
    Workout,
    Routine,
    WorkoutLog,
    Challenge,
    Notification,
)
from .postgres_models import (
    WorkoutSession,
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
    SessionSet,
    SessionSetCreate,
    SessionSetUpdate,
    IMURecord,
    IMURecordCreate,
    IMURecordUpdate,
    OutboxOperation
)
from .api_models import (
    PaginationParams,
    PaginatedResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    ExerciseCreate,
    ExerciseUpdate,
    TemplateItemCreate,
    WorkoutCreate,
    WorkoutUpdate,
    RoutineCreate,
    RoutineUpdate,
    RoutineResponse,
    WorkoutLogCreate,
    WorkoutLogResponse,
    ChallengeResponse,
    LeaderboardEntry,
    FriendResponse,
    NotificationResponse,
    WorkoutSessionCreateRequest,
    SessionSetCreateRequest,
    IMURecordCreateRequest,
    ErrorResponse,
    SuccessResponse,
    HealthCheckResponse
)

__all__ = [
    # Base models
    "BaseDocument",
    "TimestampMixin",
    "OwnerMixin",
    
    # MongoDB models
    "User",
    "ExerciseGlobal",
    "ExerciseUser",
    "TemplateItem",
    "Workout",
    "Routine",
    "WorkoutLog",
    "Challenge",
    "Notification",
    
    # PostgreSQL models
    "WorkoutSession",
    "WorkoutSessionCreate",
    "WorkoutSessionUpdate",
    "SessionSet",
    "SessionSetCreate",
    "SessionSetUpdate",
    "IMURecord",
    "IMURecordCreate",
    "IMURecordUpdate",
    "OutboxOperation",
    
    # API models
    "PaginationParams",
    "PaginatedResponse",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "ExerciseCreate",
    "ExerciseUpdate",
    "TemplateItemCreate",
    "WorkoutCreate",
    "WorkoutUpdate",
    "RoutineCreate",
    "RoutineUpdate",
    "RoutineResponse",
    "WorkoutLogCreate",
    "WorkoutLogResponse",
    "ChallengeResponse",
    "LeaderboardEntry",
    "FriendResponse",
    "NotificationResponse",
    "WorkoutSessionCreateRequest",
    "SessionSetCreateRequest",
    "IMURecordCreateRequest",
    "ErrorResponse",
    "SuccessResponse",
    "HealthCheckResponse"
]