# Hawklets API Documentation

## Обзор

Hawklets API - это RESTful API для фитнес-трекинга, построенное на FastAPI с использованием гибридной архитектуры баз данных:
- **MongoDB** для документо-ориентированных данных (пользователи, упражнения, шаблоны)
- **PostgreSQL** для реляционных данных (сессии тренировок, подходы, IMU записи)
- **Redis** для кэширования и сессий

## Быстрый старт

### 1. Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

### 2. Настройка окружения

Скопируйте файл `.env.example` в `.env` и настройте переменные окружения:

```bash
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Запуск сервера

```bash
# Development mode
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Документация API

После запуска сервера документация доступна по адресам:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Архитектура базы данных

### MongoDB Collections

1. **users** - Пользователи системы
2. **exercises_global** - Глобальные упражнения (общие для всех)
3. **exercises_user** - Пользовательские упражнения
4. **workout_templates** - Шаблоны тренировок

### PostgreSQL Tables

1. **workout_sessions** - Сессии тренировок
2. **session_sets** - Подходы в сессиях
3. **imu_records** - IMU записи (метаданные)
4. **outbox** - Очередь синхронизации

## Основные Endpoints

### Аутентификация

```
POST   /api/auth/register     - Регистрация пользователя
POST   /api/auth/login        - Вход (получение токена)
POST   /api/auth/refresh      - Обновление токена
GET    /api/auth/me           - Информация о текущем пользователе
PUT    /api/auth/update       - Обновление информации аккаунта
DELETE /api/auth/delete       - Удаление аккаунта
```

#### Регистрация пользователя
**Endpoint:** `POST /api/auth/register`

**Заголовки:**
```
X-API-Key: <ваш_api_ключ>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "display_name": "John Doe",
  "password": "secure_password123"
}
```

**Ответ (200 OK):**
```json
{
  "id": "a6fd363c-f8ec-4caf-85cb-d571017ac51e",
  "email": "user@example.com",
  "display_name": "John Doe",
  "created_at": "2026-02-25T07:51:29.388313Z",
  "updated_at": "2026-02-25T07:51:29.388324Z"
}
```

#### Вход в систему
**Endpoint:** `POST /api/auth/login`

**Заголовки:**
```
X-API-Key: <ваш_api_ключ>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "secure_password123"
}
```

**Ответ (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Обновление токена
**Endpoint:** `POST /api/auth/refresh`

**Заголовки:**
```
X-API-Key: <ваш_api_ключ>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ответ (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Получение информации о текущем пользователе
**Endpoint:** `GET /api/auth/me`

**Заголовки:**
```
X-API-Key: <ваш_api_ключ>
Authorization: Bearer <access_token>
```

**Ответ (200 OK):**
```json
{
  "id": "a6fd363c-f8ec-4caf-85cb-d571017ac51e",
  "email": "user@example.com",
  "display_name": "John Doe",
  "created_at": "2026-02-25T07:51:29.388313Z",
  "updated_at": "2026-02-25T07:51:29.388324Z"
}
```

#### Обновление информации аккаунта
**Endpoint:** `PUT /api/auth/update`

**Заголовки:**
```
X-API-Key: <ваш_api_ключ>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Тело запроса (оба поля опциональны):**
```json
{
  "display_name": "Updated Name",
  "password": "new_password123"
}
```

**Ответ (200 OK):**
```json
{
  "id": "a6fd363c-f8ec-4caf-85cb-d571017ac51e",
  "email": "user@example.com",
  "display_name": "Updated Name",
  "created_at": "2026-02-25T07:51:29.388313Z",
  "updated_at": "2026-02-25T08:00:00.000000Z"
}
```

#### Удаление аккаунта
**Endpoint:** `DELETE /api/auth/delete`

**Заголовки:**
```
X-API-Key: <ваш_api_ключ>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "confirm": true
}
```

**Ответ (200 OK):**
```json
{
  "message": "Account deleted successfully"
}
```

#### Примечания по аутентификации:
1. **API Key:** Все запросы требуют заголовок `X-API-Key` с валидным ключом API
2. **JWT Токены:** Access token действителен 30 минут, refresh token - 7 дней
3. **Авторизация:** Защищенные эндпоинты требуют заголовок `Authorization: Bearer <access_token>`
4. **Поле email:** Для входа используется поле `email`, а не `username`

### Упражнения

```
GET    /api/exercises/global           - Получение глобальных упражнений
GET    /api/exercises/global/{id}      - Получение конкретного упражнения
GET    /api/exercises/user             - Получение пользовательских упражнений
POST   /api/exercises/user             - Создание пользовательского упражнения
PUT    /api/exercises/user/{id}        - Обновление упражнения
DELETE /api/exercises/user/{id}        - Удаление упражнения
POST   /api/exercises/user/{id}/restore - Восстановление удаленного упражнения
```

### Шаблоны тренировок

```
GET    /api/templates                  - Получение шаблонов
GET    /api/templates/{id}             - Получение конкретного шаблона
POST   /api/templates                  - Создание шаблона
PUT    /api/templates/{id}             - Обновление шаблона
DELETE /api/templates/{id}             - Удаление шаблона
POST   /api/templates/{id}/duplicate   - Дублирование шаблона
GET    /api/templates/shared/{code}    - Получение шаблона по share code
```

### Сессии тренировок (PostgreSQL)

```
GET    /api/sessions                   - Получение сессий
GET    /api/sessions/{id}              - Получение конкретной сессии
POST   /api/sessions                   - Создание сессии
PUT    /api/sessions/{id}              - Обновление сессии
DELETE /api/sessions/{id}              - Удаление сессии
GET    /api/sessions/{id}/sets         - Получение подходов сессии
POST   /api/sessions/{id}/sets         - Добавление подхода
```

## Модели данных

### Пользователь (User)

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Упражнение (Exercise)

```json
{
  "id": "uuid",
  "name": "Bench Press",
  "muscle_groups": ["chest", "triceps", "shoulders"],
  "equipment": "barbell",
  "movement_pattern": "push",
  "default_tracking": {
    "primary_metric": "weight",
    "secondary_metric": "reps"
  }
}
```

### Шаблон тренировки (WorkoutTemplate)

```json
{
  "id": "uuid",
  "owner_id": "user_uuid",
  "title": "Push Day",
  "description": "Chest and triceps workout",
  "visibility": "private",
  "items": [
    {
      "id": "item_uuid",
      "exercise_id": "exercise_uuid",
      "order_index": 0,
      "target_sets": 3,
      "target_reps_min": 8,
      "target_reps_max": 12,
      "rest_sec": 90
    }
  ]
}
```

### Сессия тренировки (WorkoutSession)

```json
{
  "id": "uuid",
  "owner_id": "user_uuid",
  "template_id": "template_uuid",
  "started_at": "2024-01-01T10:00:00Z",
  "ended_at": "2024-01-01T11:00:00Z",
  "notes": "Good session",
  "source": "manual",
  "metrics_summary": {
    "total_sets": 15,
    "total_volume": 5000
  }
}
```

## Аутентификация

API использует JWT (JSON Web Tokens) для аутентификации. Для доступа к защищенным endpoints необходимо:

1. Зарегистрироваться или войти, чтобы получить access token
2. Добавить заголовок `Authorization: Bearer <token>` к запросам

### Пример запроса с токеном

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/auth/me
```

## Пагинация

Многие endpoints поддерживают пагинацию через query parameters:

```
GET /api/exercises/user?page=1&page_size=20&sort_by=name&sort_order=asc
```

Параметры:
- `page` - номер страницы (начинается с 1)
- `page_size` - количество элементов на странице (1-100)
- `sort_by` - поле для сортировки
- `sort_order` - порядок сортировки (asc/desc)

## Фильтрация

Endpoints поддерживают фильтрацию через query parameters:

```
GET /api/exercises/global?muscle_group=chest&equipment=barbell
GET /api/templates?visibility=public&search=push
```

## Обработка ошибок

API возвращает стандартные HTTP коды статусов:

- `200` - Успех
- `201` - Создано
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Запрещено
- `404` - Не найдено
- `500` - Внутренняя ошибка сервера

Формат ошибки:
```json
{
  "detail": "Error message",
  "code": "ERROR_CODE",
  "field": "field_name"  // optional
}
```

## Тестирование

Для тестирования API используйте:

```bash
# Запуск тестов
python test_api.py

# Запуск сервера для тестирования
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

## Развертывание с Docker

### 1. Настройка окружения

```bash
cp .env.example .env
# Настройте переменные окружения в .env
```

### 2. Запуск всех сервисов

```bash
docker-compose up -d
```

### 3. Проверка статуса

```bash
docker-compose ps
```

### 4. Просмотр логов

```bash
docker-compose logs -f backend
```

## Миграции базы данных

### MongoDB

MongoDB не требует миграций схемы. Коллекции создаются автоматически при первом обращении.

### PostgreSQL

Для управления миграциями PostgreSQL используется Alembic:

```bash
# Создание миграции
alembic revision --autogenerate -m "Description"

# Применение миграций
alembic upgrade head

# Откат миграции
alembic downgrade -1
```

## Мониторинг и логирование

- Логи приложения: `backend/logs/`
- Логи Docker: `docker-compose logs <service_name>`
- Health check: `GET /api/health`
- Метрики: (планируется добавить Prometheus endpoint)

## Безопасность

1. Все пароли хешируются с использованием bcrypt
2. JWT токены имеют ограниченное время жизни
3. CORS настроен для разрешенных origins
4. Все запросы к базе данных используют параметризованные запросы
5. Чувствительные данные не логируются

## Полный справочник API

### Аутентификация
| Метод | Endpoint | Описание | Требует токен |
|-------|----------|----------|---------------|
| POST | `/api/auth/register` | Регистрация нового пользователя | ❌ |
| POST | `/api/auth/login` | Вход в систему (получение токенов) | ❌ |
| POST | `/api/auth/refresh` | Обновление access token | ❌ |
| GET | `/api/auth/me` | Получение информации о текущем пользователе | ✅ |
| PUT | `/api/auth/update` | Обновление информации аккаунта | ✅ |
| DELETE | `/api/auth/delete` | Удаление аккаунта | ✅ |

### Упражнения
| Метод | Endpoint | Описание | Требует токен |
|-------|----------|----------|---------------|
| GET | `/api/exercises/global` | Получение глобальных упражнений | ❌ |
| GET | `/api/exercises/global/{id}` | Получение конкретного глобального упражнения | ❌ |
| GET | `/api/exercises/user` | Получение пользовательских упражнений | ✅ |
| POST | `/api/exercises/user` | Создание пользовательского упражнения | ✅ |
| PUT | `/api/exercises/user/{id}` | Обновление пользовательского упражнения | ✅ |
| DELETE | `/api/exercises/user/{id}` | Удаление пользовательского упражнения | ✅ |
| POST | `/api/exercises/user/{id}/restore` | Восстановление удаленного упражнения | ✅ |

### Шаблоны тренировок
| Метод | Endpoint | Описание | Требует токен |
|-------|----------|----------|---------------|
| GET | `/api/templates` | Получение шаблонов тренировок | ✅ |
| GET | `/api/templates/{id}` | Получение конкретного шаблона | ✅ |
| POST | `/api/templates` | Создание шаблона тренировки | ✅ |
| PUT | `/api/templates/{id}` | Обновление шаблона тренировки | ✅ |
| DELETE | `/api/templates/{id}` | Удаление шаблона тренировки | ✅ |
| POST | `/api/templates/{id}/duplicate` | Дублирование шаблона | ✅ |
| GET | `/api/templates/shared/{code}` | Получение шаблона по share code | ❌ |

### Сессии тренировок
| Метод | Endpoint | Описание | Требует токен |
|-------|----------|----------|---------------|
| GET | `/api/sessions` | Получение сессий тренировок | ✅ |
| GET | `/api/sessions/{id}` | Получение конкретной сессии | ✅ |
| POST | `/api/sessions` | Создание сессии тренировки | ✅ |
| PUT | `/api/sessions/{id}` | Обновление сессии тренировки | ✅ |
| DELETE | `/api/sessions/{id}` | Удаление сессии тренировки | ✅ |
| GET | `/api/sessions/{id}/sets` | Получение подходов сессии | ✅ |
| POST | `/api/sessions/{id}/sets` | Добавление подхода к сессии | ✅ |

### Системные endpoints
| Метод | Endpoint | Описание | Требует токен |
|-------|----------|----------|---------------|
| GET | `/api/health` | Проверка здоровья системы | ❌ |
| GET | `/api/` | Корневой endpoint (информация о API) | ❌ |
| POST | `/api/status` | Создание статус-чека | ✅ |
| GET | `/api/status` | Получение статус-чеков | ✅ |
| POST | `/api/waitlist` | Добавление в лист ожидания | ❌ |
| GET | `/api/waitlist` | Получение листа ожидания (админ) | ✅ |

## Примеры использования

### Полный цикл работы с пользователем

```python
import requests

BASE_URL = "https://hawklets.com/api"
API_KEY = "ваш_api_ключ"

# 1. Регистрация
response = requests.post(
    f"{BASE_URL}/auth/register",
    json={
        "email": "test@example.com",
        "display_name": "Test User",
        "password": "TestPassword123!"
    },
    headers={"X-API-Key": API_KEY}
)
user_data = response.json()

# 2. Вход
response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "email": "test@example.com",
        "password": "TestPassword123!"
    },
    headers={"X-API-Key": API_KEY}
)
tokens = response.json()
access_token = tokens["access_token"]
refresh_token = tokens["refresh_token"]

# 3. Получение информации о пользователе
response = requests.get(
    f"{BASE_URL}/auth/me",
    headers={
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
)
user_info = response.json()

# 4. Обновление аккаунта
response = requests.put(
    f"{BASE_URL}/auth/update",
    json={"display_name": "Updated Name"},
    headers={
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
)
updated_user = response.json()

# 5. Обновление токена
response = requests.post(
    f"{BASE_URL}/auth/refresh",
    json={"refresh_token": refresh_token},
    headers={"X-API-Key": API_KEY}
)
new_tokens = response.json()

# 6. Удаление аккаунта
response = requests.delete(
    f"{BASE_URL}/auth/delete",
    json={"confirm": True},
    headers={
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
)
deletion_result = response.json()
```

### Работа с упражнениями

```python
# Получение глобальных упражнений
response = requests.get(
    f"{BASE_URL}/exercises/global",
    headers={"X-API-Key": API_KEY}
)
exercises = response.json()

# Создание пользовательского упражнения
response = requests.post(
    f"{BASE_URL}/exercises/user",
    json={
        "name": "Custom Exercise",
        "muscle_groups": ["chest", "shoulders"],
        "equipment": "dumbbells"
    },
    headers={
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
)
custom_exercise = response.json()
```

### Работа с шаблонами тренировок

```python
# Создание шаблона
response = requests.post(
    f"{BASE_URL}/templates",
    json={
        "title": "Push Day",
        "description": "Chest and triceps workout",
        "visibility": "private",
        "items": [
            {
                "exercise_id": "exercise_uuid",
                "order_index": 0,
                "target_sets": 3,
                "target_reps_min": 8,
                "target_reps_max": 12,
                "rest_sec": 90
            }
        ]
    },
    headers={
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {access_token}"
    }
)
template = response.json()
```

## Часто задаваемые вопросы (FAQ)

### Q: Как получить API ключ?
**A:** API ключ предоставляется администратором системы. Для разработки используйте ключ из `.env` файла.

### Q: Почему запрос возвращает 401 ошибку?
**A:** Возможные причины:
1. Отсутствует или неверный заголовок `X-API-Key`
2. Истек срок действия access token
3. Неверный refresh token
4. Пользователь удален или заблокирован

### Q: Как обновить истекший токен?
**A:** Используйте endpoint `/api/auth/refresh` с валидным refresh token.

### Q: Какие поля обязательны при регистрации?
**A:** Обязательные поля: `email`, `display_name`, `password`.

### Q: Как удалить свой аккаунт?
**A:** Используйте endpoint `DELETE /api/auth/delete` с заголовком Authorization и телом `{"confirm": true}`.

### Q: Поддерживается ли пагинация?
**A:** Да, многие endpoints поддерживают пагинацию через параметры `page` и `page_size`.

### Q: Как получить общие упражнения?
**A:** Используйте `GET /api/exercises/global` - этот endpoint не требует аутентификации.

## Дальнейшее развитие

1. Добавление WebSocket для real-time обновлений
2. Интеграция с wearable devices
3. ML анализ IMU данных
4. Экспорт данных в CSV/JSON
5. GraphQL endpoint
6. Webhook поддержка для интеграций