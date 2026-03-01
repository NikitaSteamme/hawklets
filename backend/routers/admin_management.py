from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId

# Add parent directory to sys.path to allow both absolute and relative imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models.mongo_models import Admin
    from backend.routers.admin_auth import get_current_admin
except ImportError:
    # If backend.models doesn't work, try direct import
    try:
        from models.mongo_models import Admin
        from routers.admin_auth import get_current_admin
    except ImportError:
        # Last resort: try relative import
        from ..models.mongo_models import Admin
        from .admin_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin management"])

# Models for admin management
class AdminUpdate(BaseModel):
    """Модель для обновления администратора"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None

class AdminDeleteRequest(BaseModel):
    """Модель для подтверждения удаления администратора"""
    confirm: bool = True

# Models for user management (from previous admin router)
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

class AdminStatsResponse(BaseModel):
    """Модель ответа со статистикой для админки"""
    total_users: int
    users_last_24h: int
    total_admins: int
    total_waitlist: int
    waitlist_last_24h: int
    server_status: str
    timestamp: datetime

# Global database connection (will be set by the main app)
_db_connection: Optional[AsyncIOMotorDatabase] = None

def set_db_connection(db: AsyncIOMotorDatabase):
    """Set the database connection for the admin management router"""
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

# Admin CRUD endpoints
@router.get("/admins", response_model=List[AdminUserResponse])
async def get_all_admins(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Получение списка всех администраторов (только для суперадминов)"""
    # Проверяем права (только суперадмины могут видеть список администраторов)
    if current_admin.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can view admin list"
        )
    
    cursor = db.admins.find({}).sort("created_at", -1)
    admins = await cursor.to_list(length=100)
    
    admin_responses = []
    for admin in admins:
        # Извлекаем last_login из auth поля
        last_login = None
        if admin.get("auth") and isinstance(admin["auth"], dict):
            last_login_str = admin["auth"].get("last_login")
            if last_login_str:
                try:
                    last_login = datetime.fromisoformat(last_login_str.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    pass
        
        admin_responses.append(AdminUserResponse(
            id=str(admin["_id"]),
            email=admin["email"],
            display_name=admin.get("full_name", admin["username"]),
            created_at=admin.get("created_at", datetime.now(timezone.utc)),
            updated_at=admin.get("updated_at", datetime.now(timezone.utc)),
            deleted_at=admin.get("deleted_at"),
            preferences={},  # У админов нет preferences
            last_login=last_login
        ))
    
    return admin_responses

@router.put("/admins/{admin_id}")
async def update_admin(
    admin_id: str,
    update_data: AdminUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Обновление администратора (только для суперадминов)"""
    # Проверяем права (только суперадмины могут обновлять администраторов)
    if current_admin.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can update admins"
        )
    
    # Проверяем, существует ли администратор
    admin = await db.admins.find_one({"_id": admin_id})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    update_fields = {}
    
    if update_data.email is not None:
        # Проверяем, не занят ли email другим администратором
        existing = await db.admins.find_one({"email": update_data.email, "_id": {"$ne": admin_id}})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another admin"
            )
        update_fields["email"] = update_data.email
    
    if update_data.username is not None:
        # Проверяем, не занят ли username другим администратором
        existing = await db.admins.find_one({"username": update_data.username, "_id": {"$ne": admin_id}})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already in use by another admin"
            )
        update_fields["username"] = update_data.username
    
    if update_data.full_name is not None:
        update_fields["full_name"] = update_data.full_name
    
    if update_data.password is not None:
        from .admin_auth import get_password_hash
        update_fields["auth.password_hash"] = get_password_hash(update_data.password)
    
    if update_data.role is not None:
        update_fields["role"] = update_data.role
    
    if update_data.permissions is not None:
        update_fields["permissions"] = update_data.permissions
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Добавляем updated_at
    update_fields["updated_at"] = datetime.now(timezone.utc)
    
    # Обновляем администратора в базе данных
    await db.admins.update_one(
        {"_id": admin_id},
        {"$set": update_fields}
    )
    
    return {
        "success": True,
        "message": "Admin updated successfully",
        "admin_id": admin_id
    }

@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: str,
    confirm_request: AdminDeleteRequest,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Удаление администратора (только для суперадминов)"""
    # Проверяем права (только суперадмины могут удалять администраторов)
    if current_admin.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can delete admins"
        )
    
    if not confirm_request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin deletion must be confirmed"
        )
    
    # Нельзя удалить самого себя
    if admin_id == current_admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )
    
    # Удаляем администратора из базы данных
    result = await db.admins.delete_one({"_id": admin_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    return {
        "success": True,
        "message": "Admin deleted successfully",
        "admin_id": admin_id
    }

# User management endpoints (from previous admin router)
@router.get("/users/{page}", response_model=PaginatedUsersResponse)
async def get_users_page(
    page: int,
    current_admin: dict = Depends(get_current_admin),
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

@router.get("/users/count", response_model=UsersCountResponse)
async def get_users_count(
    current_admin: dict = Depends(get_current_admin),
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

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Получение общей статистики для админки.
    
    Returns:
        Статистика по пользователям, администраторам, листу ожидания и статус сервера
    """
    # Получаем общее количество пользователей
    total_users = await db.users.count_documents({})
    
    # Вычисляем время 24 часа назад
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Получаем количество пользователей, зарегистрированных за последние 24 часа
    users_last_24h = await db.users.count_documents({
        "created_at": {"$gte": twenty_four_hours_ago}
    })
    
    # Получаем количество администраторов
    total_admins = await db.admins.count_documents({})
    
    # Получаем статистику по листу ожидания
    total_waitlist = await db.waitlist.count_documents({})
    waitlist_last_24h = await db.waitlist.count_documents({
        "created_at": {"$gte": twenty_four_hours_ago}
    })
    
    return AdminStatsResponse(
        total_users=total_users,
        users_last_24h=users_last_24h,
        total_admins=total_admins,
        total_waitlist=total_waitlist,
        waitlist_last_24h=waitlist_last_24h,
        server_status="healthy",
        timestamp=datetime.now(timezone.utc)
    )