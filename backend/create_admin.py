#!/usr/bin/env python3
"""
Скрипт для создания администратора по умолчанию.
Запустите этот скрипт после запуска сервера для создания первого администратора.
"""

import asyncio
import os
import sys
from pathlib import Path

# Добавляем родительскую директорию в путь
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Конфигурация
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hawklets')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@hawklets.com')
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
ADMIN_FULL_NAME = os.environ.get('ADMIN_FULL_NAME', 'System Administrator')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Хеширует пароль"""
    return pwd_context.hash(password)

async def create_default_admin():
    """Создает администратора по умолчанию"""
    print("Подключение к MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Проверяем, существует ли уже администратор
    existing_admin = await db.admins.find_one({"$or": [
        {"email": ADMIN_EMAIL},
        {"username": ADMIN_USERNAME}
    ]})
    
    if existing_admin:
        print(f"Администратор уже существует:")
        print(f"  Email: {existing_admin.get('email')}")
        print(f"  Username: {existing_admin.get('username')}")
        print(f"  Role: {existing_admin.get('role', 'admin')}")
        client.close()
        return
    
    # Создаем администратора
    admin_data = {
        "email": ADMIN_EMAIL,
        "username": ADMIN_USERNAME,
        "full_name": ADMIN_FULL_NAME,
        "role": "superadmin",
        "permissions": ["*"],
        "auth": {
            "password_hash": get_password_hash(ADMIN_PASSWORD),
            "last_login": None
        },
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "deleted_at": None
    }
    
    result = await db.admins.insert_one(admin_data)
    
    print("Администратор успешно создан!")
    print(f"  ID: {result.inserted_id}")
    print(f"  Email: {ADMIN_EMAIL}")
    print(f"  Username: {ADMIN_USERNAME}")
    print(f"  Password: {ADMIN_PASSWORD}")
    print(f"  Role: superadmin")
    print("\nВАЖНО: Измените пароль после первого входа!")
    
    client.close()

async def check_database():
    """Проверяет состояние базы данных"""
    print("Проверка базы данных...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Проверяем коллекции
    collections = await db.list_collection_names()
    print(f"Доступные коллекции: {', '.join(collections)}")
    
    # Считаем документы
    users_count = await db.users.count_documents({})
    admins_count = await db.admins.count_documents({})
    waitlist_count = await db.waitlist.count_documents({})
    
    print(f"  Пользователей: {users_count}")
    print(f"  Администраторов: {admins_count}")
    print(f"  В листе ожидания: {waitlist_count}")
    
    client.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Создание администратора по умолчанию для Hawklets")
    print("=" * 50)
    
    # Проверяем переменные окружения
    if MONGO_URL == 'mongodb://localhost:27017':
        print("Предупреждение: Используется MongoDB по умолчанию (localhost)")
    
    # Запускаем асинхронные функции
    loop = asyncio.get_event_loop()
    loop.run_until_complete(check_database())
    print("-" * 50)
    loop.run_until_complete(create_default_admin())
    print("=" * 50)