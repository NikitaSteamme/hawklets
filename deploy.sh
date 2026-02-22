#!/bin/bash

# Скрипт развертывания Hawklets на production сервере
set -e

echo "=== Развертывание Hawklets на Production ==="
echo

# Проверка, что мы на production сервере (не локально)
if [ -f "/etc/os-release" ]; then
    echo "1. Проверка окружения..."
    . /etc/os-release
    echo "   ОС: $PRETTY_NAME"
else
    echo "   ⚠ Не удалось определить ОС"
fi

echo
echo "2. Проверка дискового пространства..."
df -h /

echo
echo "3. Проверка свободной памяти..."
free -h

echo
echo "4. Создание директорий для данных..."
mkdir -p data/mongo data/postgres data/redis
echo "   ✓ Директории созданы"

echo
echo "5. Настройка окружения..."
if [ ! -f ".env" ]; then
    echo "   Создание .env файла из примера..."
    cp .env.example .env
    echo "   ⚠ ОТРЕДАКТИРУЙТЕ .env файл перед запуском!"
    echo "   nano .env"
    echo "   Ключевые переменные:"
    echo "   - JWT_SECRET_KEY (сгенерируйте случайный ключ)"
    echo "   - MONGO_INITDB_ROOT_PASSWORD"
    echo "   - POSTGRES_PASSWORD"
    exit 1
else
    echo "   ✓ .env файл уже существует"
fi

echo
echo "6. Проверка Docker..."
if command -v docker &> /dev/null; then
    echo "   ✓ Docker установлен"
    docker --version
else
    echo "   ✗ Docker не установлен"
    echo "   Установите Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

echo
echo "7. Проверка Docker Compose..."
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo "   ✓ Docker Compose доступен"
else
    echo "   ✗ Docker Compose не установлен"
    echo "   Установите Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo
echo "8. Очистка старых контейнеров (если есть)..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

echo
echo "9. Сборка и запуск контейнеров..."
echo "   Это может занять несколько минут..."
docker compose -f docker-compose.prod.yml up -d --build

echo
echo "10. Ожидание запуска сервисов..."
sleep 10

echo
echo "11. Проверка статуса контейнеров..."
docker compose -f docker-compose.prod.yml ps

echo
echo "12. Проверка health checks..."
echo "   Подождите 30 секунд для полного запуска..."
sleep 30

# Проверка health статусов
echo
echo "13. Финальная проверка..."
all_healthy=true

# Проверка MongoDB
if docker compose -f docker-compose.prod.yml exec -T mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "   ✓ MongoDB работает"
else
    echo "   ✗ MongoDB не отвечает"
    all_healthy=false
fi

# Проверка PostgreSQL
if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U hawklets > /dev/null 2>&1; then
    echo "   ✓ PostgreSQL работает"
else
    echo "   ✗ PostgreSQL не отвечает"
    all_healthy=false
fi

# Проверка Backend
if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "   ✓ Backend API работает"
else
    echo "   ✗ Backend API не отвечает"
    all_healthy=false
fi

# Проверка Frontend
if curl -s -I http://localhost 2>/dev/null | grep -q "200 OK\|200"; then
    echo "   ✓ Frontend работает"
else
    echo "   ⚠ Frontend может быть в процессе запуска"
fi

echo
echo "=== РЕЗУЛЬТАТ РАЗВЕРТЫВАНИЯ ==="
if [ "$all_healthy" = true ]; then
    echo "✅ Все основные сервисы запущены успешно!"
    echo
    echo "Доступные endpoints:"
    echo "  - Frontend: http://localhost"
    echo "  - Backend API: http://localhost:8000"
    echo "  - API Health: http://localhost:8000/api/health"
    echo
    echo "Для просмотра логов:"
    echo "  docker compose -f docker-compose.prod.yml logs -f"
    echo
    echo "Для остановки:"
    echo "  docker compose -f docker-compose.prod.yml down"
else
    echo "⚠ Некоторые сервисы могут иметь проблемы"
    echo
    echo "Для диагностики:"
    echo "  docker compose -f docker-compose.prod.yml logs"
    echo "  docker compose -f docker-compose.prod.yml ps"
    echo
    echo "Проверьте:"
    echo "  1. Достаточно ли памяти и дискового пространства"
    echo "  2. Правильность настроек в .env файле"
    echo "  3. Логи MongoDB (частая проблема на маленьких VPS)"
fi

echo
echo "=== ДОПОЛНИТЕЛЬНЫЕ ШАГИ ==="
echo "1. Настройте firewall если нужно:"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo "   sudo ufw enable"
echo
echo "2. Настройте домен (если есть):"
echo "   - Обновите DNS запись A на IP сервера"
echo "   - Обновите CORS_ORIGINS в .env файле"
echo "   - Перезапустите: docker compose -f docker-compose.prod.yml restart"
echo
echo "3. Настройте мониторинг:"
echo "   docker stats"
echo "   watch -n 5 df -h"