from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
import os
import sys
from pathlib import Path

# Add parent directory to sys.path to allow both absolute and relative imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.models import UserCreate, UserLogin, UserResponse, TokenResponse
    from backend.models.mongo_models import User
except ImportError:
    # If backend.models doesn't work, try direct import
    try:
        from models import UserCreate, UserLogin, UserResponse, TokenResponse
        from models.mongo_models import User
    except ImportError:
        # Last resort: try relative import
        from ..models import UserCreate, UserLogin, UserResponse, TokenResponse
        from ..models.mongo_models import User

router = APIRouter(prefix="/auth", tags=["authentication"])

# Конфигурация
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Хеширует пароль"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создает JWT токен"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Создает refresh токен"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Получает текущего пользователя из токена"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Здесь нужно получить пользователя из базы данных
    # Пока возвращаем заглушку
    return {"id": user_id, "email": "user@example.com"}


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Регистрация нового пользователя"""
    # Проверяем, существует ли пользователь с таким email
    # existing_user = await db.users.find_one({"email": user_data.email})
    # if existing_user:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="User with this email already exists"
    #     )
    
    # Создаем пользователя
    user = User(
        email=user_data.email,
        display_name=user_data.display_name,
        auth={
            "password_hash": get_password_hash(user_data.password),
            "last_login": datetime.now(timezone.utc)
        }
    )
    
    # Сохраняем в базу данных
    # await db.users.insert_one(user.to_mongo())
    
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Вход пользователя"""
    # Находим пользователя по email
    # user = await db.users.find_one({"email": form_data.username})
    # if not user:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect email or password",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )
    
    # Проверяем пароль
    # if not verify_password(form_data.password, user["auth"]["password_hash"]):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect email or password",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )
    
    # Обновляем время последнего входа
    # await db.users.update_one(
    #     {"_id": user["_id"]},
    #     {"$set": {"auth.last_login": datetime.now(timezone.utc)}}
    # )
    
    # Создаем токены
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "user_id"},  # Заменить на user["_id"]
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": "user_id"})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """Обновление access токена"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Проверяем, существует ли пользователь
        # user = await db.users.find_one({"_id": user_id})
        # if not user:
        #     raise HTTPException(
        #         status_code=status.HTTP_401_UNAUTHORIZED,
        #         detail="User not found"
        #     )
        
        # Создаем новый access токен
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_id},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Получение информации о текущем пользователе"""
    # user = await db.users.find_one({"_id": current_user["id"]})
    # if not user:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="User not found"
    #     )
    
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        display_name="John Doe",  # Заменить на user["display_name"]
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )