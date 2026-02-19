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
POST /api/auth/register     - Регистрация пользователя
POST /api/auth/login        - Вход (получение токена)
POST /api/auth/refresh      - Обновление токена
GET  /api/auth/me           - Информация о текущем пользователе
```

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

## Дальнейшее развитие

1. Добавление WebSocket для real-time обновлений
2. Интеграция с wearable devices
3. ML анализ IMU данных
4. Экспорт данных в CSV/JSON
5. GraphQL endpoint
6. Webhook поддержка для интеграций