from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import jwt
from passlib.context import CryptContext
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, EmailStr

# Add parent directory to sys.path to allow both absolute and relative imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models.mongo_models import Admin
except ImportError:
    # If backend.models doesn't work, try direct import
    try:
        from models.mongo_models import Admin
    except ImportError:
        # Last resort: try relative import
        from ..models.mongo_models import Admin

router = APIRouter(prefix="/admin/auth", tags=["admin authentication"])

# Конфигурация
ADMIN_SECRET_KEY = os.getenv("ADMIN_JWT_SECRET_KEY", "admin-secret-key-change-in-production")
ADMIN_ALGORITHM = "HS256"
ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 часов для админки

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/auth/login")

# Models
class AdminCreate(BaseModel):
    """Модель для создания администратора"""
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    password: str
    role: str = Field(default="admin")
    permissions: List[str] = Field(default_factory=list)

class AdminLogin(BaseModel):
    """Модель для входа администратора"""
    username: str
    password: str

class AdminResponse(BaseModel):
    """Модель ответа с данными администратора"""
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    permissions: List[str]
    created_at: datetime
    updated_at: datetime

class AdminTokenResponse(BaseModel):
    """Модель ответа с токеном администратора"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin: AdminResponse

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Хеширует пароль"""
    return pwd_context.hash(password)

def create_admin_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создает JWT токен для администратора"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "admin_access"})
    encoded_jwt = jwt.encode(to_encode, ADMIN_SECRET_KEY, algorithm=ADMIN_ALGORITHM)
    return encoded_jwt

# Global database connection (will be set by the main app)
_db_connection: Optional[AsyncIOMotorDatabase] = None

def set_db_connection(db: AsyncIOMotorDatabase):
    """Set the database connection for the admin auth router"""
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

async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Получает текущего администратора из токена"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=[ADMIN_ALGORITHM])
        admin_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if admin_id is None or token_type != "admin_access":
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Получаем администратора из базы данных
    admin = await db.admins.find_one({"_id": admin_id})
    if not admin:
        raise credentials_exception
    
    return {
        "id": str(admin["_id"]),
        "email": admin["email"],
        "username": admin["username"],
        "full_name": admin.get("full_name"),
        "role": admin.get("role", "admin"),
        "permissions": admin.get("permissions", []),
        "created_at": admin.get("created_at", datetime.now(timezone.utc)),
        "updated_at": admin.get("updated_at", datetime.now(timezone.utc))
    }

@router.post("/register", response_model=AdminResponse)
async def register_admin(
    admin_data: AdminCreate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Регистрация нового администратора (только для суперадминов)"""
    # Проверяем, существует ли администратор с таким email или username
    existing_email = await db.admins.find_one({"email": admin_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin with this email already exists"
        )
    
    existing_username = await db.admins.find_one({"username": admin_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin with this username already exists"
        )
    
    # Создаем администратора
    admin = Admin(
        email=admin_data.email,
        username=admin_data.username,
        full_name=admin_data.full_name,
        role=admin_data.role,
        permissions=admin_data.permissions,
        auth={
            "password_hash": get_password_hash(admin_data.password),
            "last_login": datetime.now(timezone.utc)
        }
    )
    
    # Сохраняем в базу данных
    await db.admins.insert_one(admin.to_mongo())
    
    return AdminResponse(
        id=admin.id,
        email=admin.email,
        username=admin.username,
        full_name=admin.full_name,
        role=admin.role,
        permissions=admin.permissions,
        created_at=admin.created_at,
        updated_at=admin.updated_at
    )

@router.post("/login", response_model=AdminTokenResponse)
async def login_admin(
    admin_data: AdminLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Вход администратора"""
    # Находим администратора по username
    admin = await db.admins.find_one({"username": admin_data.username})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Проверяем пароль
    if not verify_password(admin_data.password, admin["auth"]["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Обновляем время последнего входа
    await db.admins.update_one(
        {"_id": admin["_id"]},
        {"$set": {"auth.last_login": datetime.now(timezone.utc)}}
    )
    
    # Создаем токен
    access_token_expires = timedelta(minutes=ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_admin_access_token(
        data={"sub": str(admin["_id"])},
        expires_delta=access_token_expires
    )
    
    admin_response = AdminResponse(
        id=str(admin["_id"]),
        email=admin["email"],
        username=admin["username"],
        full_name=admin.get("full_name"),
        role=admin.get("role", "admin"),
        permissions=admin.get("permissions", []),
        created_at=admin.get("created_at", datetime.now(timezone.utc)),
        updated_at=admin.get("updated_at", datetime.now(timezone.utc))
    )
    
    return AdminTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        admin=admin_response
    )

@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Получение информации о текущем администраторе"""
    admin = await db.admins.find_one({"_id": current_admin["id"]})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    return AdminResponse(
        id=str(admin["_id"]),
        email=admin["email"],
        username=admin["username"],
        full_name=admin.get("full_name"),
        role=admin.get("role", "admin"),
        permissions=admin.get("permissions", []),
        created_at=admin.get("created_at", datetime.now(timezone.utc)),
        updated_at=admin.get("updated_at", datetime.now(timezone.utc))
    )