#!/usr/bin/env python3
"""
Тестовый скрипт для проверки API админ-панели.
Запустите после запуска сервера: python test_admin_api.py
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def print_response(response, description):
    """Печатает ответ API"""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"Response: {response.text}")

def test_admin_auth():
    """Тестирование аутентификации администратора"""
    print("Тестирование аутентификации администратора...")
    
    # 1. Попытка входа с неверными данными
    print("\n1. Попытка входа с неверными данными:")
    response = requests.post(f"{BASE_URL}/admin/auth/login", json={
        "username": "wrong",
        "password": "wrong"
    })
    print_response(response, "Неверные учетные данные")
    
    # 2. Создание администратора (если нет)
    print("\n2. Создание администратора:")
    response = requests.post(f"{BASE_URL}/admin/auth/register", json={
        "email": "testadmin@hawklets.com",
        "username": "testadmin",
        "full_name": "Test Administrator",
        "password": "test123",
        "role": "admin",
        "permissions": ["users.read", "users.write"]
    })
    print_response(response, "Регистрация администратора")
    
    # 3. Вход с правильными данными
    print("\n3. Вход с правильными данными:")
    response = requests.post(f"{BASE_URL}/admin/auth/login", json={
        "username": "testadmin",
        "password": "test123"
    })
    print_response(response, "Успешный вход")
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return token
    return None

def test_admin_endpoints(token):
    """Тестирование защищенных эндпоинтов админ-панели"""
    if not token:
        print("Нет токена, пропускаем тесты защищенных эндпоинтов")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Получение информации о текущем администраторе
    print("\n1. Получение информации о текущем администраторе:")
    response = requests.get(f"{BASE_URL}/admin/auth/me", headers=headers)
    print_response(response, "Информация об администраторе")
    
    # 2. Получение статистики
    print("\n2. Получение статистики:")
    response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
    print_response(response, "Статистика")
    
    # 3. Получение количества пользователей
    print("\n3. Получение количества пользователей:")
    response = requests.get(f"{BASE_URL}/admin/users/count", headers=headers)
    print_response(response, "Количество пользователей")
    
    # 4. Получение пользователей с пагинацией
    print("\n4. Получение пользователей (страница 1):")
    response = requests.get(f"{BASE_URL}/admin/users/1", headers=headers)
    print_response(response, "Пользователи (страница 1)")
    
    # 5. Получение списка администраторов
    print("\n5. Получение списка администраторов:")
    response = requests.get(f"{BASE_URL}/admin/admins", headers=headers)
    print_response(response, "Список администраторов")

def test_api_key_protection():
    """Тестирование защиты API ключом"""
    print("\nТестирование защиты API ключом...")
    
    # Попытка доступа без API ключа
    print("\n1. Попытка доступа к основному API без ключа:")
    response = requests.get(f"{BASE_URL}/health")
    print_response(response, "Доступ к /api/health без ключа")
    
    # Попытка доступа к админ API без токена
    print("\n2. Попытка доступа к админ API без токена:")
    response = requests.get(f"{BASE_URL}/admin/stats")
    print_response(response, "Доступ к /api/admin/stats без токена")

def main():
    """Основная функция тестирования"""
    print("="*60)
    print("Тестирование API админ-панели Hawklets")
    print("="*60)
    
    try:
        # Проверяем, запущен ли сервер
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print(f"Сервер не отвечает на {BASE_URL}/health")
            print("Запустите сервер: cd backend && python server.py")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"Не удалось подключиться к {BASE_URL}")
        print("Запустите сервер: cd backend && python server.py")
        sys.exit(1)
    
    # Запускаем тесты
    test_api_key_protection()
    token = test_admin_auth()
    
    if token:
        test_admin_endpoints(token)
    
    print("\n" + "="*60)
    print("Тестирование завершено!")
    print("="*60)
    
    if token:
        print("\nДля тестирования фронтенда:")
        print("1. Перейдите по адресу: http://localhost:3000/admin/login")
        print("2. Используйте учетные данные:")
        print("   - Имя пользователя: testadmin")
        print("   - Пароль: test123")
        print("3. Или используйте администратора по умолчанию:")
        print("   - Имя пользователя: admin")
        print("   - Пароль: admin123")

if __name__ == "__main__":
    main()