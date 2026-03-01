from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from bson import ObjectId

# Add parent directory to sys.path to allow both absolute and relative imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models.mongo_models import User
except ImportError:
    # If backend.models doesn't work, try direct import
    try:
        from models.mongo_models import User
    except ImportError:
        # Last resort: try relative import
        from ..models.mongo_models import User

router = APIRouter(prefix="/admin", tags=["admin"])

# Admin API Key configuration
ADMIN_API_KEY_NAME = "X-ADMIN-API-KEY"
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "default-admin-api-key-change-in-production")

# Security scheme for admin endpoints
admin_api_key_header = APIKeyHeader(name=ADMIN_API_KEY_NAME, auto_error=False)

async def verify_admin_api_key(admin_api_key_header: str = Depends(admin_api_key_header)):
    """Verify admin API key from request header"""
    if not admin_api_key_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin API key is missing"
        )
    
    if admin_api_key_header != ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key"
        )
    
    return admin_api_key_header

# Models for admin responses
class AdminUserResponse(BaseModel):
    """Модель ответа с данными пользователя для админки"""
    id: str
    email: str
    display_name: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)
    last_login: Optional[datetime] = None

class PaginatedUsersResponse(BaseModel):
    """Модель ответа с пагинированным списком пользователей"""
    users: List[AdminUserResponse]
    page: int
    page_size: int = 50
    total_users: int
    is_last_page: bool

class UsersCountResponse(BaseModel):
    """Модель ответа с количеством пользователей"""
    total_users: int
    users_last_24h: int

# Global database connection (will be set by the main app)
_db_connection: Optional[AsyncIOMotorDatabase] = None

def set_db_connection(db: AsyncIOMotorDatabase):
    """Set the database connection for the admin router"""
    global _db_connection
    _db_connection = db

async def get_db():
    """Dependency to get database connection"""
    if _db_connection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not configured"
        )
    return _db_connection

@router.get("/users/{page}", response_model=PaginatedUsersResponse, dependencies=[Depends(verify_admin_api_key)])
async def get_users_page(
    page: int,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Получение списка пользователей с пагинацией.
    
    Args:
        page: Номер страницы (начинается с 1)
    
    Returns:
        Список пользователей (50 на страницу) с флагом is_last_page
    """
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page number must be greater than 0"
        )
    
    page_size = 50
    skip = (page - 1) * page_size
    
    # Получаем общее количество пользователей
    total_users = await db.users.count_documents({})
    
    # Получаем пользователей для текущей страницы
    cursor = db.users.find({}).sort("created_at", -1).skip(skip).limit(page_size)
    users = await cursor.to_list(length=page_size)
    
    # Преобразуем пользователей в модель ответа
    user_responses = []
    for user in users:
        # Извлекаем last_login из auth поля
        last_login = None
        if user.get("auth") and isinstance(user["auth"], dict):
            last_login_str = user["auth"].get("last_login")
            if last_login_str:
                try:
                    last_login = datetime.fromisoformat(last_login_str.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    pass
        
        user_responses.append(AdminUserResponse(
            id=str(user["_id"]),
            email=user["email"],
            display_name=user.get("display_name", ""),
            created_at=user.get("created_at", datetime.now(timezone.utc)),
            updated_at=user.get("updated_at", datetime.now(timezone.utc)),
            deleted_at=user.get("deleted_at"),
            preferences=user.get("preferences", {}),
            last_login=last_login
        ))
    
    # Проверяем, является ли эта страница последней
    is_last_page = (skip + len(user_responses)) >= total_users
    
    return PaginatedUsersResponse(
        users=user_responses,
        page=page,
        page_size=page_size,
        total_users=total_users,
        is_last_page=is_last_page
    )

@router.get("/users/count", response_model=UsersCountResponse, dependencies=[Depends(verify_admin_api_key)])
async def get_users_count(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Получение статистики по пользователям.
    
    Returns:
        Общее количество пользователей и количество зарегистрированных за последние 24 часа
    """
    # Получаем общее количество пользователей
    total_users = await db.users.count_documents({})
    
    # Вычисляем время 24 часа назад
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Получаем количество пользователей, зарегистрированных за последние 24 часа
    users_last_24h = await db.users.count_documents({
        "created_at": {"$gte": twenty_four_hours_ago}
    })
    
    return UsersCountResponse(
        total_users=total_users,
        users_last_24h=users_last_24h
    )