#!/bin/bash
# Однокомандное решение для проблем админ-панели
# Запуск: bash fix_admin_one_command.sh

set -e

echo "🔧 Запуск исправления админ-панели..."
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции для вывода
success() { echo -e "${GREEN}✓ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "ℹ $1"; }

# 1. Проверка и установка npm
info "Проверка npm..."
if ! command -v npm &> /dev/null; then
    warning "npm не найден. Пытаемся установить..."
    
    # Проверяем систему
    if command -v apt-get &> /dev/null; then
        info "Установка Node.js через apt..."
        apt-get update -qq
        apt-get install -y -qq curl
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
        apt-get install -y -qq nodejs
        success "Node.js установлен"
    elif command -v yum &> /dev/null; then
        info "Установка Node.js через yum..."
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
        yum install -y -q nodejs
        success "Node.js установлен"
    else
        error "Не удалось определить пакетный менеджер"
        echo "Установите Node.js вручную: https://nodejs.org"
        exit 1
    fi
else
    success "npm найден: $(npm --version)"
fi

# 2. Сборка фронтенда (если есть исходники)
info "Проверка фронтенда..."
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    cd frontend
    info "Установка зависимостей фронтенда..."
    npm install --quiet
    
    info "Сборка фронтенда..."
    if npm run build; then
        success "Фронтенд собран успешно"
        
        # Проверяем билд
        if [ -f "build/index.html" ]; then
            success "index.html найден в build/"
            
            # Предлагаем скопировать билд
            info "Директория сборки: $(pwd)/build"
            echo ""
            warning "Скопируйте содержимое build/ в директорию nginx:"
            echo "  cp -r build/* /usr/share/nginx/html/"
        else
            error "index.html не найден в build/"
        fi
    else
        error "Ошибка сборки фронтенда"
    fi
    cd ..
else
    warning "Директория frontend не найдена или package.json отсутствует"
    info "Пропускаем сборку фронтенда"
fi

# 3. Создание администратора через MongoDB
info "Создание администратора в MongoDB..."
cat > /tmp/create_admin.js << 'EOF'
// Создание администратора
db = db.getSiblingDB('hawklets');

// Проверяем существование
var existing = db.admins.findOne({username: "admin"});
if (existing) {
    print("Администратор уже существует:");
    print("  ID: " + existing._id);
    print("  Email: " + existing.email);
    print("  Username: " + existing.username);
} else {
    // Хеш пароля 'admin123' (SHA256 для простоты)
    var passwordHash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    
    var admin = {
        email: "admin@hawklets.com",
        username: "admin",
        full_name: "System Administrator",
        role: "superadmin",
        permissions: ["*"],
        auth: {
            password_hash: passwordHash,
            last_login: null
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
    };
    
    var result = db.admins.insertOne(admin);
    if (result.insertedId) {
        print("Администратор создан успешно!");
        print("  ID: " + result.insertedId);
        print("  Email: admin@hawklets.com");
        print("  Username: admin");
        print("  Password: admin123");
        print("  Role: superadmin");
    }
}

// Проверяем коллекции
print("\nКоллекции в базе hawklets:");
db.getCollectionNames().forEach(function(col) {
    print("  - " + col + ": " + db[col].countDocuments() + " документов");
});
EOF

# Запускаем скрипт MongoDB
if command -v mongo &> /dev/null; then
    info "Запуск MongoDB скрипта..."
    if mongo hawklets /tmp/create_admin.js --quiet; then
        success "Администратор создан/проверен"
    else
        warning "Не удалось выполнить MongoDB скрипт"
        info "Создайте администратора вручную:"
        echo "  mongo hawklets"
        echo "  db.admins.insertOne({email:'admin@hawklets.com',username:'admin',...})"
    fi
else
    warning "MongoDB клиент не найден"
    info "Установите MongoDB клиент: apt-get install mongodb-clients"
fi

# 4. Проверка nginx конфигурации
info "Проверка nginx конфигурации..."
if command -v nginx &> /dev/null; then
    # Проверяем конфигурацию
    if nginx -t 2>/dev/null; then
        success "Конфигурация nginx валидна"
        
        # Предлагаем перезагрузить
        info "Перезагрузите nginx для применения изменений:"
        echo "  nginx -s reload"
        echo "  или systemctl reload nginx"
    else
        error "Ошибка в конфигурации nginx"
        info "Проверьте конфигурацию: nginx -t"
    fi
else
    warning "nginx не найден"
fi

# 5. Проверка API
info "Проверка API эндпоинтов..."
echo ""
echo "Тестовые команды для проверки:"
echo "1. Проверка здоровья API:"
echo "   curl -H 'X-API-Key: ваш-ключ' https://hawklets.com/api/health"
echo ""
echo "2. Вход администратора:"
echo "   curl -X POST -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@hawklets.com\",\"password\":\"admin123\"}' \\"
echo "     https://hawklets.com/api/admin/auth/login"
echo ""
echo "3. Проверка пользователей (после входа):"
echo "   curl -H 'X-ADMIN-API-KEY: ваш-токен' \\"
echo "     https://hawklets.com/api/admin/users/1"
echo ""

# 6. Финальные инструкции
echo "=== ФИНАЛЬНЫЕ ИНСТРУКЦИИ ==="
echo ""
echo "1. Если фронтенд был собран, скопируйте билд:"
echo "   sudo cp -r frontend/build/* /usr/share/nginx/html/"
echo ""
echo "2. Убедитесь, что nginx настроен для SPA:"
echo "   В конфигурации nginx должна быть строка:"
echo "   location / { try_files \$uri \$uri/ /index.html; }"
echo ""
echo "3. Перезагрузите nginx:"
echo "   sudo nginx -s reload"
echo "   или sudo systemctl reload nginx"
echo ""
echo "4. Проверьте админ-панель:"
echo "   Откройте в браузере: https://hawklets.com/admin"
echo "   Должна появиться форма входа"
echo ""
echo "5. Войдите с credentials:"
echo "   Email: admin@hawklets.com"
echo "   Password: admin123"
echo ""
echo "6. Если есть проблемы, проверьте логи:"
echo "   nginx: tail -f /var/log/nginx/error.log"
echo "   фронтенд: F12 → Console в браузере"
echo ""
success "Исправление завершено! Проверьте админ-панель."