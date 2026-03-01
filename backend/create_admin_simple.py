#!/usr/bin/env python3
"""
Упрощенный скрипт для создания администратора без motor.
Использует pymongo вместо motor.
"""

import os
import sys
from pathlib import Path
import hashlib
import secrets
from datetime import datetime

# Добавляем родительскую директорию в путь
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

try:
    import pymongo
    from pymongo import MongoClient
except ImportError:
    print("Установите pymongo: pip install pymongo")
    sys.exit(1)

# Конфигурация
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hawklets')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@hawklets.com')
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'nikita')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'kodfogmjtnjkfgd4534fkmfdg4534')
ADMIN_FULL_NAME = os.environ.get('ADMIN_FULL_NAME', 'System Administrator')

def get_password_hash(password: str) -> str:
    """Хеширует пароль с использованием bcrypt или простого хеша"""
    try:
        import bcrypt
        # Используем bcrypt если доступен
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    except ImportError:
        # Простой хеш для тестирования (НЕ для продакшн!)
        print("Внимание: Используется простой хеш. Установите bcrypt для безопасности.")
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

def create_default_admin():
    """Создает администратора по умолчанию"""
    print("Подключение к MongoDB...")
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Проверяем подключение
        client.admin.command('ping')
        print("✓ MongoDB подключен успешно")
        
        # Проверяем, существует ли уже администратор
        existing_admin = db.admins.find_one({"$or": [
            {"email": ADMIN_EMAIL},
            {"username": ADMIN_USERNAME}
        ]})
        
        if existing_admin:
            print(f"Администратор уже существует:")
            print(f"  ID: {existing_admin.get('_id')}")
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
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "deleted_at": None
        }
        
        result = db.admins.insert_one(admin_data)
        
        print("✓ Администратор успешно создан!")
        print(f"  ID: {result.inserted_id}")
        print(f"  Email: {ADMIN_EMAIL}")
        print(f"  Username: {ADMIN_USERNAME}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print(f"  Role: superadmin")
        print(f"  Permissions: {admin_data['permissions']}")
        
        # Проверяем коллекции
        collections = db.list_collection_names()
        print(f"\nДоступные коллекции: {', '.join(collections)}")
        
        # Считаем документы
        users_count = db.users.count_documents({})
        admins_count = db.admins.count_documents({})
        waitlist_count = db.waitlist.count_documents({})
        
        print(f"\nСтатистика базы данных:")
        print(f"  Пользователей: {users_count}")
        print(f"  Администраторов: {admins_count}")
        print(f"  В листе ожидания: {waitlist_count}")
        
        client.close()
        
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        print("\nУстранение проблем:")
        print("1. Проверьте, запущен ли MongoDB: sudo systemctl status mongod")
        print("2. Проверьте подключение: mongosh --eval 'db.adminCommand(\"ping\")'")
        print("3. Установите pymongo: pip install pymongo")
        print("4. Для безопасности установите bcrypt: pip install bcrypt")
        sys.exit(1)

def check_admin_login():
    """Проверяет возможность входа администратора"""
    print("\n" + "="*50)
    print("Проверка входа администратора")
    print("="*50)
    
    print(f"\nДля входа в админ-панель используйте:")
    print(f"  URL: https://hawklets.com/admin/login")
    print(f"  Имя пользователя: {ADMIN_USERNAME}")
    print(f"  Пароль: {ADMIN_PASSWORD}")
    
    print("\nДля тестирования API:")
    print(f"  curl -X POST https://hawklets.com/api/admin/auth/login \\")
    print(f"    -H 'Content-Type: application/json' \\")
    print(f"    -d '{{\"username\": \"{ADMIN_USERNAME}\", \"password\": \"{ADMIN_PASSWORD}\"}}'")
    
    print("\nВАЖНО: Измените пароль после первого входа!")

if __name__ == "__main__":
    print("="*50)
    print("Создание администратора по умолчанию для Hawklets")
    print("="*50)
    
    if MONGO_URL == 'mongodb://localhost:27017':
        print("Используется MongoDB по умолчанию (localhost)")
    
    create_default_admin()
    check_admin_login()
    
    print("\n" + "="*50)
    print("Готово! Администратор создан.")
    print("="*50)