#!/bin/bash
# Скрипт для развертывания админ-панели на продакшн сервере
# Решает проблемы: npm not found, motor dependency missing

set -e  # Выход при ошибке

echo "=== Развертывание админ-панели Hawklets ==="
echo "Текущая директория: $(pwd)"

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
  echo "Внимание: Скрипт запущен без прав root. Некоторые команды могут требовать sudo."
fi

# 1. Проверка и установка Node.js/npm
echo ""
echo "1. Проверка Node.js и npm..."
if ! command -v node &> /dev/null; then
    echo "Node.js не найден. Установка..."
    
    # Определяем дистрибутив
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y curl
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        echo "Неизвестный дистрибутив. Установите Node.js вручную:"
        echo "  https://nodejs.org/en/download/"
        exit 1
    fi
else
    echo "✓ Node.js уже установлен: $(node --version)"
fi

if ! command -v npm &> /dev/null; then
    echo "npm не найден. Установка..."
    if [ -f /etc/debian_version ]; then
        apt-get install -y npm
    elif [ -f /etc/redhat-release ]; then
        yum install -y npm
    fi
else
    echo "✓ npm уже установлен: $(npm --version)"
fi

# 2. Проверка и установка Python зависимостей
echo ""
echo "2. Проверка Python зависимостей..."
if ! command -v python3 &> /dev/null; then
    echo "Python3 не найден. Установка..."
    if [ -f /etc/debian_version ]; then
        apt-get install -y python3 python3-pip
    elif [ -f /etc/redhat-release ]; then
        yum install -y python3 python3-pip
    fi
else
    echo "✓ Python3 уже установлен: $(python3 --version)"
fi

# Установка pymongo и bcrypt (вместо motor)
echo "Установка Python зависимостей..."
pip3 install pymongo bcrypt --quiet

# 3. Создание администратора с помощью упрощенного скрипта
echo ""
echo "3. Создание администратора..."
cd backend

# Проверяем существование упрощенного скрипта
if [ -f "create_admin_simple.py" ]; then
    echo "Используем упрощенный скрипт (pymongo вместо motor)..."
    
    # Устанавливаем переменные окружения
    export MONGO_URL=${MONGO_URL:-"mongodb://localhost:27017"}
    export DB_NAME=${DB_NAME:-"hawklets"}
    export ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@hawklets.com"}
    export ADMIN_USERNAME=${ADMIN_USERNAME:-"admin"}
    export ADMIN_PASSWORD=${ADMIN_PASSWORD:-"admin123"}
    export ADMIN_FULL_NAME=${ADMIN_FULL_NAME:-"System Administrator"}
    
    echo "Параметры:"
    echo "  MONGO_URL: $MONGO_URL"
    echo "  DB_NAME: $DB_NAME"
    echo "  ADMIN_EMAIL: $ADMIN_EMAIL"
    echo "  ADMIN_USERNAME: $ADMIN_USERNAME"
    echo "  ADMIN_PASSWORD: $ADMIN_PASSWORD"
    
    python3 create_admin_simple.py
else
    echo "Скрипт create_admin_simple.py не найден. Создаем вручную..."
    
    # Создаем простой скрипт для создания администратора
    cat > create_admin_manual.py << 'EOF'
#!/usr/bin/env python3
import pymongo
import hashlib
from datetime import datetime

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "hawklets"

client = pymongo.MongoClient(MONGO_URL)
db = client[DB_NAME]

# Проверяем существование администратора
existing = db.admins.find_one({"username": "admin"})
if existing:
    print("Администратор уже существует:")
    print(f"  ID: {existing.get('_id')}")
    print(f"  Email: {existing.get('email')}")
    print(f"  Username: {existing.get('username')}")
else:
    # Создаем администратора
    admin_data = {
        "email": "admin@hawklets.com",
        "username": "admin",
        "full_name": "System Administrator",
        "role": "superadmin",
        "permissions": ["*"],
        "auth": {
            "password_hash": hashlib.sha256("admin123".encode()).hexdigest(),
            "last_login": None
        },
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "deleted_at": None
    }
    
    result = db.admins.insert_one(admin_data)
    print("Администратор создан успешно!")
    print(f"  ID: {result.inserted_id}")
    print(f"  Email: admin@hawklets.com")
    print(f"  Username: admin")
    print(f"  Password: admin123")
    print("  Внимание: Используется простой SHA256 хеш. Для продакшн установите bcrypt.")

client.close()
EOF
    
    python3 create_admin_manual.py
fi

cd ..

# 4. Сборка фронтенда
echo ""
echo "4. Сборка фронтенда..."
cd frontend

# Проверяем package.json
if [ ! -f "package.json" ]; then
    echo "Ошибка: package.json не найден в frontend/"
    exit 1
fi

echo "Установка зависимостей npm..."
npm install --quiet

echo "Сборка проекта..."
npm run build

if [ $? -eq 0 ]; then
    echo "✓ Фронтенд успешно собран"
    echo "  Директория сборки: $(pwd)/build"
    
    # Проверяем наличие index.html
    if [ -f "build/index.html" ]; then
        echo "✓ index.html найден в build/"
    else
        echo "⚠ index.html не найден в build/"
    fi
else
    echo "⚠ Ошибка сборки фронтенда"
    echo "  Проверьте ошибки выше и исправьте их"
fi

cd ..

# 5. Проверка конфигурации nginx
echo ""
echo "5. Проверка конфигурации nginx..."
echo "Рекомендуемая конфигурация nginx для SPA:"
cat << 'NGINX_CONFIG'
server {
    listen 80;
    server_name hawklets.com www.hawklets.com;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }
}
NGINX_CONFIG

echo ""
echo "=== Резюме ==="
echo "1. Node.js/npm: $(node --version 2>/dev/null || echo 'Не установлен')"
echo "2. Python зависимости: Установлены (pymongo, bcrypt)"
echo "3. Администратор: Создан (проверьте вывод выше)"
echo "4. Фронтенд: Собран в frontend/build/"
echo ""
echo "Следующие шаги:"
echo "1. Скопируйте содержимое frontend/build/ в директорию nginx (обычно /usr/share/nginx/html)"
echo "2. Обновите конфигурацию nginx как показано выше"
echo "3. Перезагрузите nginx: nginx -s reload"
echo "4. Проверьте доступность: https://hawklets.com/admin"
echo ""
echo "Для тестирования API:"
echo "  curl -H 'X-API-Key: ваш-ключ' https://hawklets.com/api/health"
echo "  curl -X POST -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@hawklets.com\",\"password\":\"admin123\"}' \\"
echo "    https://hawklets.com/api/admin/auth/login"
echo ""
echo "Развертывание завершено!"