#!/bin/bash
# Скрипт для деплоя исправлений аутентификации

echo "=== Deploying authentication fixes ==="

# 1. Проверяем текущий статус
echo "1. Checking current deployment status..."
docker-compose ps

# 2. Останавливаем и удаляем контейнеры
echo -e "\n2. Stopping and removing containers..."
docker-compose down

# 3. Пересобираем образ бэкенда (важно!)
echo -e "\n3. Rebuilding backend image..."
docker-compose build backend

# 4. Запускаем контейнеры
echo -e "\n4. Starting containers..."
docker-compose up -d

# 5. Ждем запуска
echo -e "\n5. Waiting for backend to start (10 seconds)..."
sleep 10

# 6. Проверяем логи
echo -e "\n6. Checking backend logs..."
docker-compose logs backend --tail=20

# 7. Проверяем, что контейнеры запущены
echo -e "\n7. Final status check..."
docker-compose ps

echo -e "\n=== Deployment complete ==="
echo "To test the fixes, run: python test_auth_simple.py"
echo "Or check the API directly at: https://hawklets.com/api/auth/login"