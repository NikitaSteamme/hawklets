#!/bin/bash

# Простой скрипт для запуска Hawklets на production
echo "=== Запуск Hawklets на Production ==="
echo

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    echo "Установите Docker: sudo apt-get install docker.io"
    exit 1
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    echo "Установите: sudo apt-get install docker-compose"
    exit 1
fi

echo "✓ Docker и Docker Compose установлены"

# Создание директорий для данных
echo "Создание директорий для данных..."
mkdir -p data/mongo data/postgres data/redis

# Проверка .env файла
if [ ! -f ".env" ]; then
    echo "⚠ .env файл не найден"
    echo "Создаю из примера..."
    cp .env.example .env
    echo "=========================================="
    echo "ОТРЕДАКТИРУЙТЕ .env ФАЙЛ ПЕРЕД ПРОДОЛЖЕНИЕМ"
    echo "Ключевые настройки:"
    echo "  - JWT_SECRET_KEY (сгенерируйте случайный ключ)"
    echo "  - MONGO_INITDB_ROOT_PASSWORD"
    echo "  - POSTGRES_PASSWORD"
    echo "=========================================="
    echo "После редактирования запустите скрипт снова"
    exit 1
fi

echo "✓ .env файл настроен"

# Остановка старых контейнеров
echo "Остановка старых контейнеров..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Запуск контейнеров
echo "Запуск контейнеров (это может занять несколько минут)..."
docker-compose -f docker-compose.prod.yml up -d --build

echo
echo "⏳ Ожидание запуска сервисов (30 секунд)..."
sleep 30

# Проверка статуса
echo
echo "=== СТАТУС КОНТЕЙНЕРОВ ==="
docker-compose -f docker-compose.prod.yml ps

echo
echo "=== ПРОВЕРКА РАБОТОСПОСОБНОСТИ ==="

# Проверка MongoDB
if docker-compose -f docker-compose.prod.yml exec -T mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✓ MongoDB работает"
else
    echo "✗ MongoDB не отвечает"
fi

# Проверка PostgreSQL
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U hawklets > /dev/null 2>&1; then
    echo "✓ PostgreSQL работает"
else
    echo "✗ PostgreSQL не отвечает"
fi

# Проверка Backend
if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✓ Backend API работает"
else
    echo "✗ Backend API не отвечает"
fi

# Проверка Frontend
if curl -s -I http://localhost 2>/dev/null | grep -q "200 OK\|200"; then
    echo "✓ Frontend работает"
else
    echo "⚠ Frontend может быть в процессе запуска"
fi

echo
echo "=== ИНФОРМАЦИЯ ==="
echo "Frontend доступен по: http://localhost"
echo "Backend API доступен по: http://localhost:8000"
echo "API Health check: http://localhost:8000/api/health"
echo
echo "Для просмотра логов: docker-compose -f docker-compose.prod.yml logs -f"
echo "Для остановки: docker-compose -f docker-compose.prod.yml down"
echo "Для перезапуска: docker-compose -f docker-compose.prod.yml restart"
echo
echo "✅ Hawklets запущен!"