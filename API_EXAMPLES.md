# Hawklets API - Примеры запросов

Этот файл содержит практические примеры запросов к Hawklets API для различных инструментов.

## Содержание
1. [Базовые настройки](#базовые-настройки)
2. [Аутентификация](#аутентификация)
3. [Упражнения](#упражнения)
4. [Шаблоны тренировок](#шаблоны-тренировок)
5. [Сессии тренировок](#сессии-тренировок)
6. [CURL примеры](#curl-примеры)
7. [Python примеры](#python-примеры)
8. [JavaScript примеры](#javascript-примеры)

## Базовые настройки

### API Endpoint
```
https://hawklets.com/api
```

### API Key
```
X-API-Key: ***********
```

### Заголовки по умолчанию
```http
X-API-Key: <ваш_api_ключ>
Content-Type: application/json
```

## Аутентификация

### 1. Регистрация пользователя
**Endpoint:** `POST /auth/register`

```http
POST https://hawklets.com/api/auth/register
Content-Type: application/json
X-API-Key: ***************

{
  "email": "user@example.com",
  "display_name": "John Doe",
  "password": "SecurePassword123!"
}
```

### 2. Вход в систему
**Endpoint:** `POST /auth/login`

```http
POST https://hawklets.com/api/auth/login
Content-Type: application/json
X-API-Key: ***************

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Успешный ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Получение информации о текущем пользователе
**Endpoint:** `GET /auth/me`

```http
GET https://hawklets.com/api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: ***************
```

### 4. Обновление токена
**Endpoint:** `POST /auth/refresh`

```http
POST https://hawklets.com/api/auth/refresh
Content-Type: application/json
X-API-Key: ***************

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. Обновление информации аккаунта
**Endpoint:** `PUT /auth/update`

```http
PUT https://hawklets.com/api/auth/update
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: ***************

{
  "display_name": "Updated Name",
  "password": "NewPassword123!"
}
```

### 6. Удаление аккаунта
**Endpoint:** `DELETE /auth/delete`

```http
DELETE https://hawklets.com/api/auth/delete
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: ***************

{
  "confirm": true
}
```

## Упражнения

### 1. Получение глобальных упражнений
**Endpoint:** `GET /exercises/global`

```http
GET https://hawklets.com/api/exercises/global
X-API-Key: ***************
```

**С пагинацией:**
```http
GET https://hawklets.com/api/exercises/global?page=1&page_size=20&sort_by=name&sort_order=asc
X-API-Key: ***************
```

### 2. Получение пользовательских упражнений
**Endpoint:** `GET /exercises/user`

```http
GET https://hawklets.com/api/exercises/user
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: ***************
```

### 3. Создание пользовательского упражнения
**Endpoint:** `POST /exercises/user`

```http
POST https://hawklets.com/api/exercises/user
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: ***************

{
  "name": "Custom Dumbbell Press",
  "muscle_groups": ["chest", "shoulders"],
  "equipment": "dumbbells",
  "movement_pattern": "push",
  "default_tracking": {
    "primary_metric": "weight",
    "secondary_metric": "reps"
  }
}
```

## Шаблоны тренировок

### 1. Получение шаблонов
**Endpoint:** `GET /templates`

```http
GET https://hawklets.com/api/templates
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: ***************
```

### 2. Создание шаблона
**Endpoint:** `POST /templates`

```http
POST https://hawklets.com/api/templates
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: ***************

{
  "title": "Push Day",
  "description": "Chest and triceps focused workout",
  "visibility": "private",
  "items": [
    {
      "exercise_id": "bench-press-uuid",
      "order_index": 0,
      "target_sets": 3,
      "target_reps_min": 8,
      "target_reps_max": 12,
      "rest_sec": 90
    },
    {
      "exercise_id": "shoulder-press-uuid",
      "order_index": 1,
      "target_sets": 3,
      "target_reps_min": 10,
      "target_reps_max": 15,
      "rest_sec": 60
    }
  ]
}
```

## Сессии тренировок

### 1. Создание сессии
**Endpoint:** `POST /sessions`

```http
POST https://hawklets.com/api/sessions
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: *****

{
  "template_id": "template-uuid",
  "started_at": "2024-01-01T10:00:00Z",
  "notes": "Good session, felt strong"
}
```

### 2. Добавление подхода к сессии
**Endpoint:** `POST /sessions/{id}/sets`

```http
POST https://hawklets.com/api/sessions/session-uuid/sets
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: *****

{
  "exercise_id": "exercise-uuid",
  "set_number": 1,
  "weight_kg": 80,
  "reps": 10,
  "rpe": 8
}
```

## CURL примеры

### Регистрация пользователя
```bash
curl -X POST https://hawklets.com/api/auth/register \
  -H "X-API-Key: *****" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "display_name": "John Doe",
    "password": "SecurePassword123!"
  }'
```

### Вход в систему
```bash
curl -X POST https://hawklets.com/api/auth/login \
  -H "X-API-Key: *****" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Получение информации о пользователе
```bash
curl -X GET https://hawklets.com/api/auth/me \
  -H "X-API-Key: *****" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Обновление токена
```bash
curl -X POST https://hawklets.com/api/auth/refresh \
  -H "X-API-Key: *****" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Python примеры

### Установка зависимостей
```bash
pip install requests
```

### Полный пример работы с API
```python
import requests
import json

BASE_URL = "https://hawklets.com/api"
API_KEY = "*****"

def register_user(email, display_name, password):
    """Регистрация нового пользователя"""
    url = f"{BASE_URL}/auth/register"
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "display_name": display_name,
        "password": password
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

def login(email, password):
    """Вход в систему"""
    url = f"{BASE_URL}/auth/login"
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "password": password
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

def get_current_user(access_token):
    """Получение информации о текущем пользователе"""
    url = f"{BASE_URL}/auth/me"
    headers = {
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(url, headers=headers)
    return response.json()

def update_account(access_token, display_name=None, password=None):
    """Обновление информации аккаунта"""
    url = f"{BASE_URL}/auth/update"
    headers = {
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    data = {}
    if display_name:
        data["display_name"] = display_name
    if password:
        data["password"] = password
    
    response = requests.put(url, json=data, headers=headers)
    return response.json()

# Пример использования
if __name__ == "__main__":
    # 1. Регистрация
    user = register_user("test@example.com", "Test User", "TestPassword123!")
    print("Registered user:", user)
    
    # 2. Вход
    tokens = login("test@example.com", "TestPassword123!")
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    print("Access token:", access_token[:30] + "...")
    
    # 3. Получение информации
    user_info = get_current_user(access_token)
    print("User info:", user_info)
    
    # 4. Обновление аккаунта
    updated = update_account(access_token, display_name="Updated Name")
    print("Updated user:", updated)
```

## JavaScript примеры

### Использование fetch API
```javascript
const BASE_URL = 'https://hawklets.com/api';
const API_KEY = '*****';

// Регистрация пользователя
async function registerUser(email, displayName, password) {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            display_name: displayName,
            password
        })
    });
    
    return await response.json();
}

// Вход в систему
async function login(email, password) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            password
        })
    });
    
    return await response.json();
}

// Получение информации о пользователе
async function getCurrentUser(accessToken) {
    const response = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
            'X-API-Key': API_KEY,
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    return await response.json();
}

// Пример использования
async function example() {
    // 1. Регистрация
    const user = await registerUser('test@example.com', 'Test User', 'TestPassword123!');
    console.log('Registered user:', user);
    
    // 2. Вход
    const tokens = await login('test@example.com', 'TestPassword123!');
    const accessToken = tokens.access_token;
    console.log('Access token:', accessToken.substring(0, 30) + '...');
    
    // 3. Получение информации
    const userInfo = await getCurrentUser(accessToken);
    console.log('User info:', userInfo);
}

// Запуск примера
example().catch(console.error);
```

## Обработка ошибок

### Пример обработки ошибок в Python
```python
import requests

def make_api_request(method, endpoint, data=None, headers=None):
    """Универсальная функция для API запросов с обработкой ошибок"""
    url = f"https://hawklets.com/api{endpoint}"
    
    default_headers = {
        "X-API-Key":
