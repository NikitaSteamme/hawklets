#!/usr/bin/env python3
"""
Тестирование Hawklets API
"""

import asyncio
import httpx
import json
from datetime import datetime, timezone

BASE_URL = "http://localhost:8000/api"


async def test_health_check():
    """Тест health check endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Health Check: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200


async def test_root():
    """Тест корневого endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/")
        print(f"Root: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200


async def test_waitlist():
    """Тест waitlist endpoints"""
    async with httpx.AsyncClient() as client:
        # Создание записи в waitlist
        waitlist_data = {
            "email": f"test_{datetime.now().timestamp()}@example.com",
            "name": "Test User"
        }
        
        response = await client.post(f"{BASE_URL}/waitlist", json=waitlist_data)
        print(f"Create Waitlist: {response.status_code}")
        
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
            
            # Получение всех записей
            response = await client.get(f"{BASE_URL}/waitlist")
            print(f"Get Waitlist: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Total waitlist entries: {data['count']}")
        
        return response.status_code in [200, 400]  # 400 если email уже существует


async def test_exercises():
    """Тест endpoints упражнений"""
    async with httpx.AsyncClient() as client:
        # Получение глобальных упражнений
        response = await client.get(f"{BASE_URL}/exercises/global")
        print(f"Get Global Exercises: {response.status_code}")
        
        if response.status_code == 200:
            exercises = response.json()
            print(f"Found {len(exercises)} global exercises")
        
        # Получение конкретного упражнения
        response = await client.get(f"{BASE_URL}/exercises/global/1")
        print(f"Get Exercise by ID: {response.status_code}")
        
        return response.status_code in [200, 404]


async def test_auth():
    """Тест endpoints аутентификации"""
    async with httpx.AsyncClient() as client:
        # Регистрация пользователя
        register_data = {
            "email": f"testuser_{datetime.now().timestamp()}@example.com",
            "display_name": "Test User",
            "password": "testpassword123"
        }
        
        response = await client.post(f"{BASE_URL}/auth/register", json=register_data)
        print(f"Register: {response.status_code}")
        
        if response.status_code == 200:
            print("User registered successfully")
            
            # Вход пользователя
            login_data = {
                "username": register_data["email"],
                "password": register_data["password"]
            }
            
            # Используем form data для OAuth2
            response = await client.post(
                f"{BASE_URL}/auth/login",
                data=login_data
            )
            print(f"Login: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                print(f"Access token received: {token_data['access_token'][:20]}...")
                
                # Получение информации о пользователе
                headers = {"Authorization": f"Bearer {token_data['access_token']}"}
                response = await client.get(f"{BASE_URL}/auth/me", headers=headers)
                print(f"Get User Info: {response.status_code}")
        
        return response.status_code in [200, 400, 401]


async def test_templates():
    """Тест endpoints шаблонов тренировок"""
    async with httpx.AsyncClient() as client:
        # Получение шаблонов
        response = await client.get(f"{BASE_URL}/templates")
        print(f"Get Templates: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data['items'])} templates")
        
        return response.status_code == 200


async def run_all_tests():
    """Запуск всех тестов"""
    print("=" * 60)
    print("Starting Hawklets API Tests")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Root Endpoint", test_root),
        ("Waitlist", test_waitlist),
        ("Exercises", test_exercises),
        ("Authentication", test_auth),
        ("Templates", test_templates)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*40}")
        print(f"Testing: {test_name}")
        print(f"{'='*40}")
        
        try:
            success = await test_func()
            results.append((test_name, success))
            status = "PASS" if success else "FAIL"
            print(f"\n{test_name}: {status}")
        except Exception as e:
            print(f"Error: {e}")
            results.append((test_name, False))
            print(f"\n{test_name}: FAIL (Error: {e})")
    
    print(f"\n{'='*60}")
    print("Test Results Summary")
    print(f"{'='*60}")
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{test_name:30} {status}")
        if success:
            passed += 1
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("All tests passed successfully!")
        return True
    else:
        print(f"{total - passed} tests failed")
        return False


if __name__ == "__main__":
    # Проверяем, запущен ли сервер
    import sys
    
    print("Note: Make sure the server is running on http://localhost:8000")
    print("Start the server with: uvicorn backend.server:app --reload")
    print()
    
    result = asyncio.run(run_all_tests())
    sys.exit(0 if result else 1)