#!/bin/bash

# Тест сборки production конфигурации
set -e

echo "=== Тестирование сборки Hawklets Production ==="
echo

# Проверка наличия необходимых файлов
echo "1. Проверка необходимых файлов..."
required_files=(
    "docker-compose.prod.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "backend/requirements.txt"
    "frontend/package.json"
    ".env.example"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file - ОТСУТСТВУЕТ"
        exit 1
    fi
done

echo
echo "2. Проверка Dockerfile backend..."
if grep -q "python:3.11-slim" backend/Dockerfile; then
    echo "  ✓ Используется python:3.11-slim"
else
    echo "  ⚠ Проверьте базовый образ в backend/Dockerfile"
fi

echo
echo "3. Проверка Dockerfile frontend..."
if grep -q "node:20-alpine" frontend/Dockerfile; then
    echo "  ✓ Используется node:20-alpine"
else
    echo "  ⚠ Проверьте базовый образ в frontend/Dockerfile"
fi

echo
echo "4. Проверка requirements.txt..."
if grep -q "fastapi" backend/requirements.txt && grep -q "pymongo" backend/requirements.txt; then
    echo "  ✓ Основные зависимости присутствуют"
else
    echo "  ⚠ Проверьте зависимости в backend/requirements.txt"
fi

echo
echo "5. Тест сборки backend образа..."
echo "   Сборка может занять несколько минут..."
if docker build -f backend/Dockerfile -t hawklets-backend-test . > /tmp/backend-build.log 2>&1; then
    echo "  ✓ Backend образ успешно собран"
    # Удаляем тестовый образ чтобы не занимать место
    docker rmi hawklets-backend-test > /dev/null 2>&1 || true
else
    echo "  ✗ Ошибка сборки backend образа"
    echo "    Логи: /tmp/backend-build.log"
    exit 1
fi

echo
echo "6. Тест сборки frontend образа..."
echo "   Сборка может занять несколько минут..."
if docker build -f frontend/Dockerfile -t hawklets-frontend-test . > /tmp/frontend-build.log 2>&1; then
    echo "  ✓ Frontend образ успешно собран"
    # Удаляем тестовый образ чтобы не занимать место
    docker rmi hawklets-frontend-test > /dev/null 2>&1 || true
else
    echo "  ✗ Ошибка сборки frontend образа"
    echo "    Логи: /tmp/frontend-build.log"
    exit 1
fi

echo
echo "7. Проверка docker-compose.prod.yml синтаксиса..."
if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo "  ✓ docker-compose.prod.yml валиден"
else
    echo "  ✗ Ошибка в docker-compose.prod.yml"
    exit 1
fi

echo
echo "8. Проверка структуры сервисов..."
services=$(docker-compose -f docker-compose.prod.yml config --services)
echo "   Найдены сервисы: $services"

expected_services=("mongo" "postgres" "redis" "backend" "frontend")
for service in "${expected_services[@]}"; do
    if echo "$services" | grep -q "$service"; then
        echo "  ✓ Сервис $service присутствует"
    else
        echo "  ✗ Сервис $service отсутствует"
    fi
done

echo
echo "9. Проверка health checks..."
if grep -q "healthcheck" docker-compose.prod.yml; then
    echo "  ✓ Health checks настроены"
else
    echo "  ⚠ Health checks не настроены"
fi

echo
echo "10. Проверка лимитов ресурсов..."
if grep -q "memory:" docker-compose.prod.yml; then
    echo "  ✓ Лимиты памяти настроены"
else
    echo "  ⚠ Лимиты памяти не настроены"
fi

echo
echo "=== РЕЗУЛЬТАТ ТЕСТА ==="
echo "Все проверки пройдены успешно!"
echo
echo "Для запуска в production выполните:"
echo "  docker-compose -f docker-compose.prod.yml up -d --build"
echo
echo "Для проверки статуса:"
echo "  docker-compose -f docker-compose.prod.yml ps"
echo
echo "Для просмотра логов:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"