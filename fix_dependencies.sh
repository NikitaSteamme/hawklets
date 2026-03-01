#!/bin/bash
# Скрипт для исправления проблем с зависимостями фронтенда

echo "=== Исправление проблем с зависимостями фронтенда ==="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}✓ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "ℹ $1"; }

# Проверяем что мы в правильной директории
if [ ! -f "package.json" ]; then
    if [ -d "frontend" ]; then
        cd frontend
        info "Переход в директорию frontend"
    else
        error "package.json не найден. Запустите скрипт из директории frontend"
        exit 1
    fi
fi

# Проверяем npm
if ! command -v npm &> /dev/null; then
    error "npm не найден. Установите Node.js и npm"
    exit 1
fi

info "Текущая версия npm: $(npm --version)"

# 1. Очистка кэша и node_modules
info "Очистка кэша npm и node_modules..."
rm -rf node_modules package-lock.json
npm cache clean --force

# 2. Установка с --legacy-peer-deps для обхода конфликтов
info "Установка зависимостей с --legacy-peer-deps..."
if npm install --legacy-peer-deps; then
    success "Зависимости успешно установлены"
else
    warning "Попытка установки с --force..."
    npm install --force
fi

# 3. Проверка конфликтующих зависимостей
info "Проверка конфликтующих зависимостей..."
CONFLICTS=$(npm ls 2>&1 | grep -E "ERR!|conflict|missing" || true)

if [ -n "$CONFLICTS" ]; then
    warning "Обнаружены конфликты зависимостей:"
    echo "$CONFLICTS"
    
    # Предлагаем конкретные исправления
    info "Рекомендуемые исправления:"
    echo "1. Обновление date-fns до версии 3.x:"
    echo "   npm install date-fns@^3.6.0 --save"
    echo ""
    echo "2. Или использование фиксированных версий:"
    echo "   npm install react-day-picker@8.10.1 date-fns@^3.6.0 --save"
else
    success "Конфликты зависимостей не обнаружены"
fi

# 4. Сборка проекта
info "Попытка сборки проекта..."
if npm run build; then
    success "Проект успешно собран!"
    
    # Проверяем билд
    if [ -f "build/index.html" ]; then
        success "index.html найден в build/"
        info "Директория сборки: $(pwd)/build"
        
        # Размер билда
        BUILD_SIZE=$(du -sh build/ | cut -f1)
        info "Размер билда: $BUILD_SIZE"
    else
        error "index.html не найден в build/"
    fi
else
    error "Ошибка сборки проекта"
    
    # Альтернативные решения
    info "Альтернативные решения:"
    echo "1. Используйте более стабильные версии:"
    echo "   npm uninstall react-day-picker date-fns"
    echo "   npm install react-day-picker@8.7.1 date-fns@^2.30.0 --save"
    echo ""
    echo "2. Или удалите ненужные зависимости:"
    echo "   npm uninstall react-day-picker"
    echo "   # если react-day-picker не используется в проекте"
    echo ""
    echo "3. Или используйте yarn вместо npm:"
    echo "   npm install -g yarn"
    echo "   yarn install"
    echo "   yarn build"
fi

# 5. Проверка используемых зависимостей в проекте
info "Проверка использования зависимостей в проекте..."
if grep -r "react-day-picker" src/ > /dev/null 2>&1; then
    info "react-day-picker используется в проекте"
else
    warning "react-day-picker не найден в исходном коде"
    info "Можно безопасно удалить: npm uninstall react-day-picker"
fi

if grep -r "date-fns" src/ > /dev/null 2>&1; then
    info "date-fns используется в проекте"
else
    warning "date-fns не найден в исходном коде"
    info "Можно безопасно удалить: npm uninstall date-fns"
fi

# 6. Финальные инструкции
echo ""
echo "=== ФИНАЛЬНЫЕ ИНСТРУКЦИИ ==="
echo ""
echo "Если сборка успешна:"
echo "1. Скопируйте билд в nginx:"
echo "   sudo cp -r build/* /usr/share/nginx/html/"
echo ""
echo "2. Проверьте конфигурацию nginx:"
echo "   sudo nginx -t"
echo "   sudo nginx -s reload"
echo ""
echo "Если есть проблемы:"
echo "1. Удалите конфликтующие зависимости:"
echo "   npm uninstall react-day-picker date-fns"
echo ""
echo "2. Установите совместимые версии:"
echo "   npm install react-day-picker@8.7.1 date-fns@^2.30.0 --save"
echo ""
echo "3. Или используйте yarn:"
echo "   npm install -g yarn"
echo "   rm -rf node_modules"
echo "   yarn install"
echo "   yarn build"
echo ""
echo "Готово! Проверьте админ-панель по адресу: https://hawklets.com/admin"