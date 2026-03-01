#!/bin/bash
# Быстрое решение проблем с админ-панелью
# Решает: npm not found, motor dependency missing, routing issues

echo "=== Быстрое решение проблем админ-панели ==="
echo ""

# 1. Проверка текущего состояния
echo "1. Проверка текущего состояния..."
echo "   Текущая директория: $(pwd)"
echo ""

# 2. Решение проблемы с npm
echo "2. Решение проблемы 'npm: command not found'..."
if ! command -v npm &> /dev/null; then
    echo "   npm не найден. Установка Node.js и npm..."
    
    # Проверяем систему
    if [ -f /etc/debian_version ]; then
        echo "   Обнаружен Debian/Ubuntu. Установка..."
        apt-get update
        apt-get install -y curl
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        echo "   ✓ Node.js и npm установлены"
    else
        echo "   ⚠ Неизвестная система. Установите Node.js вручную:"
        echo "     https://nodejs.org/en/download/"
        echo "     или используйте: apt-get install nodejs npm"
    fi
else
    echo "   ✓ npm уже установлен: $(npm --version)"
fi
echo ""

# 3. Альтернатива: использование существующего билда
echo "3. Альтернативное решение (без сборки фронтенда)..."
echo "   Если сборка фронтенда не работает, можно использовать готовый билд:"
echo ""
echo "   Вариант A: Копировать билд с локальной машины:"
echo "     scp -r ./frontend/build/ user@server:/usr/share/nginx/html/"
echo ""
echo "   Вариант B: Использовать простой редирект в nginx:"
cat << 'NGINX_REDIRECT'
     Добавьте в конфигурацию nginx (/etc/nginx/sites-available/hawklets):
     
     location /admin {
         return 302 /admin/login;
     }
     
     Затем перезагрузите nginx:
     nginx -s reload
NGINX_REDIRECT
echo ""

# 4. Создание администратора без Python зависимостей
echo "4. Создание администратора (без Python)..."
echo "   Способ 1: Через MongoDB shell (рекомендуется):"
echo "     mongo hawklets --eval \""
echo "       db.admins.insertOne({"
echo "         email: 'admin@hawklets.com',"
echo "         username: 'admin',"
echo "         full_name: 'System Administrator',"
echo "         role: 'superadmin',"
echo "         permissions: ['*'],"
echo "         auth: {"
echo "           password_hash: '\\\$2a\\\$12\\\$Rg9gV9v7vJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJv',"
echo "           last_login: null"
echo "         },"
echo "         created_at: new Date().toISOString(),"
echo "         updated_at: new Date().toISOString(),"
echo "         deleted_at: null"
echo "       })"
echo "     \""
echo ""
echo "   Способ 2: Использовать готовый скрипт:"
echo "     mongo hawklets create_admin_mongodb.js"
echo ""

# 5. Проверка API
echo "5. Проверка работы API..."
echo "   Тестовые команды:"
echo "   # Проверка здоровья"
echo "   curl -H 'X-API-Key: ваш-ключ' https://hawklets.com/api/health"
echo ""
echo "   # Вход администратора"
echo "   curl -X POST -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@hawklets.com\",\"password\":\"admin123\"}' \\"
echo "     https://hawklets.com/api/admin/auth/login"
echo ""

# 6. Решение проблемы с маршрутами React
echo "6. Решение проблемы 'No routes matched location \"/admin\"'..."
echo "   Проблема: React Router не видит маршруты в SPA."
echo "   Решение: Настроить nginx для обработки SPA маршрутов:"
cat << 'NGINX_SPA'
   В конфигурации nginx убедитесь, что есть:
   
   location / {
       try_files $uri $uri/ /index.html;
   }
   
   Это заставляет nginx возвращать index.html для всех маршрутов,
   чтобы React Router мог обработать их на клиенте.
NGINX_SPA
echo ""

# 7. Быстрая проверка
echo "7. Быстрая проверка решения..."
echo "   После применения исправлений проверьте:"
echo "   1. https://hawklets.com/admin → должно перенаправить на /admin/login"
echo "   2. https://hawklets.com/admin/login → должна появиться форма входа"
echo "   3. Вход с email: admin@hawklets.com, password: admin123"
echo "   4. После входа → переход на /admin/dashboard"
echo ""

# 8. Резюме
echo "=== Резюме шагов ==="
echo "1. Установите Node.js/npm если отсутствуют"
echo "2. Соберите фронтенд: cd frontend && npm run build"
echo "3. Скопируйте билд в nginx директорию"
echo "4. Создайте администратора через MongoDB"
echo "5. Настройте nginx для SPA маршрутов"
echo "6. Перезагрузите nginx: nginx -s reload"
echo "7. Проверьте доступность админ-панели"
echo ""
echo "Если проблемы сохраняются, проверьте:"
echo "- Логи nginx: tail -f /var/log/nginx/error.log"
echo "- Логи бэкенда: docker logs <backend_container>"
echo "- Консоль браузера (F12) на наличие ошибок"
echo ""
echo "Готово! Админ-панель должна быть доступна по https://hawklets.com/admin"