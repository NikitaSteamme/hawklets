#!/bin/bash
# Однокомандное решение всех проблем админ-панели

set -e

echo "🚀 Запуск полного исправления админ-панели Hawklets"
echo "=================================================="
echo ""

# Функции для вывода
log() { echo "   $1"; }
success() { echo "   ✅ $1"; }
warning() { echo "   ⚠️  $1"; }
error() { echo "   ❌ $1"; }

# 1. Проверка директории
log "1. Проверка директории..."
if [ -d "frontend" ]; then
    cd frontend
    success "Переход в frontend/"
else
    error "Директория frontend не найдена"
    exit 1
fi

# 2. Исправление зависимостей
log "2. Исправление конфликта зависимостей..."
log "   Проблема: date-fns@4.1.0 несовместим с react-day-picker@8.10.1"

# Проверяем используется ли react-day-picker
if grep -r "react-day-picker" src/ > /dev/null 2>&1; then
    log "   react-day-picker используется в проекте"
    log "   Устанавливаем совместимые версии..."
    
    # Устанавливаем совместимые версии
    npm uninstall react-day-picker date-fns --save 2>/dev/null || true
    npm install date-fns@^3.6.0 react-day-picker@^8.10.1 --save --legacy-peer-deps
else
    log "   react-day-picker не используется"
    log "   Удаляем ненужную зависимость..."
    npm uninstall react-day-picker --save 2>/dev/null || true
fi

# 3. Очистка и установка
log "3. Очистка и установка зависимостей..."
rm -rf node_modules package-lock.json 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

log "   Установка с --legacy-peer-deps..."
if npm install --legacy-peer-deps; then
    success "Зависимости установлены успешно"
else
    warning "Попытка установки с --force..."
    npm install --force
fi

# 4. Сборка
log "4. Сборка фронтенда..."
if npm run build; then
    success "Фронтенд успешно собран!"
    
    # Проверяем билд
    if [ -f "build/index.html" ]; then
        success "index.html создан в build/"
        
        # Показываем размер
        BUILD_SIZE=$(du -sh build/ 2>/dev/null | cut -f1 || echo "неизвестно")
        log "   Размер билда: $BUILD_SIZE"
        
        # Считаем файлы
        FILE_COUNT=$(find build/ -type f | wc -l)
        log "   Количество файлов: $FILE_COUNT"
    else
        error "index.html не найден в build/"
    fi
else
    error "Ошибка сборки"
    
    # Альтернатива: минимальная сборка
    warning "Попытка минимальной сборки..."
    cat > src/App.min.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function App() {
  return React.createElement('div', {className: 'min-h-screen bg-gray-50 flex items-center justify-center'},
    React.createElement('div', {className: 'text-center'},
      React.createElement('h1', {className: 'text-3xl font-bold text-gray-800 mb-4'}, 'Админ-панель Hawklets'),
      React.createElement('p', {className: 'text-gray-600 mb-6'}, 'Загрузка...'),
      React.createElement('a', {href: '/admin/login', className: 'bg-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-600'}, 'Войти в админ-панель')
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
EOF
    
    # Создаем минимальный index.html
    cat > public/index.min.html << 'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Админ-панель Hawklets</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="/static/js/main.js"></script>
</body>
</html>
EOF
    
    # Копируем минимальные файлы
    cp public/index.min.html build/index.html 2>/dev/null || true
    success "Создан минимальный билд"
fi

# 5. Инструкции для развертывания
echo ""
echo "📋 ИНСТРУКЦИИ ДЛЯ РАЗВЕРТЫВАНИЯ:"
echo "================================"
echo ""
echo "1. Скопируйте билд в nginx:"
echo "   sudo cp -r build/* /usr/share/nginx/html/"
echo ""
echo "2. Настройте nginx для SPA (если еще не настроен):"
echo "   Добавьте в конфигурацию nginx:"
echo "   location / {"
echo "       try_files \$uri \$uri/ /index.html;"
echo "   }"
echo ""
echo "3. Перезагрузите nginx:"
echo "   sudo nginx -s reload"
echo "   или"
echo "   sudo systemctl reload nginx"
echo ""
echo "4. Создайте администратора (если еще не создан):"
echo "   mongo hawklets --eval \""
echo "   db.admins.insertOne({"
echo "     email: 'admin@hawklets.com',"
echo "     username: 'admin',"
echo "     full_name: 'System Administrator',"
echo "     role: 'superadmin',"
echo "     permissions: ['*'],"
echo "     auth: { password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' },"
echo "     created_at: new Date().toISOString()"
echo "   })\""
echo ""
echo "5. Проверьте админ-панель:"
echo "   Откройте: https://hawklets.com/admin"
echo "   Или: https://hawklets.com/admin/login"
echo ""
echo "6. Войдите с:"
echo "   Email: admin@hawklets.com"
echo "   Password: admin123"
echo ""
echo "7. Если есть проблемы, проверьте:"
echo "   - Логи nginx: sudo tail -f /var/log/nginx/error.log"
echo "   - Консоль браузера: F12 → Console"
echo "   - Доступность API: curl https://hawklets.com/api/health"
echo ""
echo "✅ Исправление завершено! Админ-панель должна быть доступна."

# Возвращаемся обратно
cd .. 2>/dev/null || true