# Исправление проблем админ-панели Hawklets

## Проблемы
1. `npm: command not found` - Node.js не установлен на продакшн сервере
2. `ModuleNotFoundError: No module named 'motor'` - Python зависимости отсутствуют
3. `No routes matched location "/admin"` - React Router не видит маршруты в SPA

## Быстрое решение

### Вариант 1: Однокомандное исправление (рекомендуется)
```bash
# На продакшн сервере
cd /path/to/hawklets
bash fix_admin_one_command.sh
```

Скрипт автоматически:
1. Установит Node.js/npm если отсутствуют
2. Соберет фронтенд
3. Создаст администратора в MongoDB
4. Проверит конфигурацию nginx
5. Даст инструкции для завершения

### Вариант 2: Ручные шаги

#### Шаг 1: Установка Node.js
```bash
# Для Debian/Ubuntu
apt-get update
apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Проверка
node --version
npm --version
```

#### Шаг 2: Сборка фронтенда
```bash
cd frontend
npm install
npm run build

# Проверьте что билд создан
ls build/
# Должен быть index.html
```

#### Шаг 3: Копирование билда в nginx
```bash
# Скопируйте содержимое build/ в директорию nginx
sudo cp -r build/* /usr/share/nginx/html/
```

#### Шаг 4: Создание администратора
```bash
# Способ A: Через MongoDB shell
mongo hawklets --eval "
db.admins.insertOne({
  email: 'admin@hawklets.com',
  username: 'admin',
  full_name: 'System Administrator',
  role: 'superadmin',
  permissions: ['*'],
  auth: {
    password_hash: '\$2a\$12\$Rg9gV9v7vJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJvJv',
    last_login: null
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null
})"

# Способ B: Используйте готовый скрипт
mongo hawklets create_admin_mongodb.js
```

#### Шаг 5: Настройка nginx для SPA
Убедитесь, что в конфигурации nginx есть:
```nginx
server {
    # ... другие настройки ...
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Перезагрузите nginx:
```bash
sudo nginx -s reload
# или
sudo systemctl reload nginx
```

#### Шаг 6: Проверка
1. Откройте https://hawklets.com/admin
2. Должна появиться форма входа
3. Войдите с:
   - Email: `admin@hawklets.com`
   - Password: `admin123`

## Проверка API

### Проверка здоровья
```bash
curl -H "X-API-Key: ваш-ключ" https://hawklets.com/api/health
```

### Вход администратора
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@hawklets.com","password":"admin123"}' \
  https://hawklets.com/api/admin/auth/login
```

### Получение пользователей (пагинация)
```bash
# После входа получите токен из ответа выше
TOKEN="ваш-токен"

# Получить первую страницу (50 пользователей)
curl -H "X-ADMIN-API-KEY: $TOKEN" \
  https://hawklets.com/api/admin/users/1
```

## Устранение неполадок

### Ошибка: "No routes matched location"
**Причина**: nginx не настроен для SPA (Single Page Application)
**Решение**: Добавьте в конфигурацию nginx:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Ошибка: "npm: command not found"
**Решение**: Установите Node.js как описано в Шаге 1

### Ошибка: "ModuleNotFoundError: No module named 'motor'"
**Решение**: Используйте MongoDB shell скрипты вместо Python

### Ошибка: 404 при доступе к /admin
**Решение**: 
1. Убедитесь что билд фронтенда скопирован в nginx директорию
2. Проверьте что index.html существует
3. Проверьте права доступа к файлам

## Файлы решения

1. `fix_admin_one_command.sh` - основной скрипт исправления
2. `create_admin_mongodb.js` - скрипт создания администратора
3. `quick_admin_fix_v2.sh` - альтернативный скрипт с подробными инструкциями
4. `deploy_admin_fix.sh` - полный скрипт развертывания

## Контакты для поддержки

Если проблемы сохраняются:
1. Проверьте логи nginx: `tail -f /var/log/nginx/error.log`
2. Проверьте консоль браузера (F12 → Console)
3. Проверьте доступность API: `curl https://hawklets.com/api/health`

---

**Админ-панель включает:**
- ✅ Аутентификация администраторов
- ✅ Дашборд со статистикой
- ✅ Управление пользователями (пагинация по 50)
- ✅ Боковое меню навигации
- ✅ Адаптивный дизайн
- ✅ API с JWT токенами

После исправления админ-панель будет доступна по https://hawklets.com/admin