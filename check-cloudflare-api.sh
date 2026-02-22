#!/bin/bash

echo "=== Диагностика проблемы с API через Cloudflare ==="
echo

# Получаем IP сервера
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "1. IP сервера: $SERVER_IP"
echo

echo "2. Проверка API напрямую (минуя Cloudflare):"
echo "   curl http://$SERVER_IP:8000/api/health"
curl -s http://$SERVER_IP:8000/api/health | head -c 200
echo
echo

echo "3. Проверка через nginx (локально):"
echo "   curl http://localhost/api/health"
curl -s http://localhost/api/health 2>/dev/null | head -c 200 || echo "   ❌ Не доступно"
echo
echo

echo "4. Проверка через домен (если настроен DNS):"
echo "   curl -k https://hawklets.com/api/health"
echo "   (это проверит, доходит ли запрос через Cloudflare)"
echo
echo

echo "=== ВОЗМОЖНЫЕ ПРИЧИНЫ И РЕШЕНИЯ ==="
echo
echo "🔴 ПРИЧИНА 1: Cloudflare блокирует /api запросы"
echo "   РЕШЕНИЕ: В Cloudflare Dashboard:"
echo "   1. Зайти в Security → WAF → Custom rules"
echo "   2. Проверить нет ли правил блокирующих /api"
echo "   3. Или создать правило разрешающее /api*"
echo
echo "🔴 ПРИЧИНА 2: Cloudflare не проксирует API правильно"
echo "   РЕШЕНИЕ: В Cloudflare Dashboard:"
echo "   1. Зайти в DNS → Records"
echo "   2. Для hawklets.com изменить Proxy status на 'DNS only' (серое облако)"
echo "   3. ИЛИ создать отдельную запись api.hawklets.com → $SERVER_IP (DNS only)"
echo
echo "🔴 ПРИЧИНА 3: Проблема с HTTPS → HTTP"
echo "   РЕШЕНИЕ: В Cloudflare Dashboard:"
echo "   1. Зайти в SSL/TLS → Overview"
echo "   2. Изменить режим с 'Flexible' на 'Full' или 'Full (strict)'"
echo "   3. Или настроить SSL сертификат на сервере"
echo
echo "=== БЫСТРОЕ РЕШЕНИЕ ==="
echo
echo "1. Создать поддомен для API (рекомендуется):"
echo "   - В Cloudflare: добавить запись A:"
echo "     api.hawklets.com → $SERVER_IP (DNS only - серое облако)"
echo "   - Тогда API будет доступно по: https://api.hawklets.com"
echo
echo "2. Или отключить прокси для основного домена:"
echo "   - В Cloudflare: для hawklets.com изменить на 'DNS only'"
echo "   - Тогда весь трафик пойдет напрямую на сервер"
echo
echo "3. Или настроить nginx на HTTPS (более сложно):"
echo "   - Установить SSL сертификат Let's Encrypt"
echo "   - Настроить nginx на порт 443"
echo
echo "=== ПРОВЕРКА ==="
echo "После изменений в Cloudflare подождите 1-5 минут для распространения DNS"
echo "Затем проверьте:"
echo "  curl https://hawklets.com/api/health"
echo "  или"
echo "  curl https://api.hawklets.com/health"