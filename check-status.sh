#!/bin/bash

echo "=== Проверка статуса Hawklets после сборки ==="
echo

# Проверка контейнеров
echo "1. Статус контейнеров:"
docker-compose -f docker-compose.prod.yml ps

echo
echo "2. Логи последних 10 строк каждого сервиса:"
echo "--- MongoDB ---"
docker-compose -f docker-compose.prod.yml logs mongo --tail=10 2>/dev/null || echo "MongoDB логов нет"
echo
echo "--- PostgreSQL ---"
docker-compose -f docker-compose.prod.yml logs postgres --tail=10 2>/dev/null || echo "PostgreSQL логов нет"
echo
echo "--- Redis ---"
docker-compose -f docker-compose.prod.yml logs redis --tail=10 2>/dev/null || echo "Redis логов нет"
echo
echo "--- Backend ---"
docker-compose -f docker-compose.prod.yml logs backend --tail=10 2>/dev/null || echo "Backend логов нет"
echo
echo "--- Frontend ---"
docker-compose -f docker-compose.prod.yml logs frontend --tail=10 2>/dev/null || echo "Frontend логов нет"

echo
echo "3. Проверка доступности сервисов:"
echo "--- Backend Health Check ---"
if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend работает: http://localhost:8000/api/health"
else
    echo "❌ Backend не отвечает"
fi

echo "--- Frontend Check ---"
if curl -s -I http://localhost 2>/dev/null | grep -q "200 OK\|200"; then
    echo "✅ Frontend работает: http://localhost"
else
    echo "⚠ Frontend может быть в процессе запуска"
fi

echo
echo "4. Использование ресурсов:"
docker stats --no-stream 2>/dev/null || echo "Docker stats недоступен"

echo
echo "=== Инструкции ==="
echo "Для просмотра всех логов: docker-compose -f docker-compose.prod.yml logs -f"
echo "Для остановки: docker-compose -f docker-compose.prod.yml down"
echo "Для перезапуска: docker-compose -f docker-compose.prod.yml restart"