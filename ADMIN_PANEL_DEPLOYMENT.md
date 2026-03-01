# Развертывание админ-панели Hawklets

## Проблема
После развертывания на продакшн сервере при переходе по `https://hawklets.com/admin` и `https://hawklets.com/admin/login` возникают ошибки:
1. `No routes matched location "/admin"` - React Router не находит маршрут
2. Ошибки Permissions-Policy header (не критично, связаны с браузерными функциями)

## Решение

### 1. Обновление фронтенда
Фронтенд был обновлен с новой структурой маршрутов:
- `/admin` → редирект на `/admin/login` или `/admin/dashboard`
- `/admin/login` → страница входа
- `/admin/dashboard` → основная админ-панель с боковым меню
- `/admin/dashboard/users` → управление пользователями
- `/admin/dashboard/stats` → статистика
- и т.д.

**Необходимые действия:**
```bash
cd frontend
npm run build
# Скопировать build/ на продакшн сервер
```

### 2. Проверка конфигурации nginx
Конфигурация nginx должна правильно обрабатывать SPA маршруты:

```nginx
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
```

**Проверьте:**
- Файл `index.html` существует в корневой директории
- Конфигурация nginx перезагружена: `nginx -s reload`
- Все статические файлы фронтенда доступны

### 3. Создание администратора по умолчанию
На сервере выполните:

```bash
cd backend
# Установите переменные окружения если нужно
export MONGO_URL=mongodb://localhost:27017
export DB_NAME=hawklets

# Создайте администратора
python create_admin.py
```

Или вручную через MongoDB:
```javascript
db.admins.insertOne({
  email: "admin@hawklets.com",
  username: "admin",
  full_name: "System Administrator",
  role: "superadmin",
  permissions: ["*"],
  auth: {
    password_hash: "$2b$12$...", // хеш пароля "admin123"
    last_login: null
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null
})
```

### 4. Проверка API эндпоинтов
Убедитесь, что API работает:

```bash
# Проверка здоровья API
curl -H "X-API-Key: ваш-ключ" https://hawklets.com/api/health

# Тестирование админ API
cd backend
python test_admin_api.py
```

### 5. Устранение ошибок Permissions-Policy
Ошибки `Permissions-Policy header: Unrecognized feature` не критичны и связаны с экспериментальными функциями браузера. Их можно игнорировать или удалить соответствующие заголовки из конфигурации nginx.

## Новые маршруты админ-панели

### Фронтенд:
- `https://hawklets.com/admin` → редирект (автоматический)
- `https://hawklets.com/admin/login` → страница входа
- `https://hawklets.com/admin/dashboard` → основная панель
- `https://hawklets.com/admin/dashboard/users` → пользователи (пагинация по 50)
- `https://hawklets.com/admin/dashboard/stats` → статистика

### Бэкенд API:
- `POST /api/admin/auth/login` → вход администратора
- `GET /api/admin/auth/me` → информация об администраторе
- `GET /api/admin/users/{page}` → пользователи (50 на страницу, флаг `is_last_page`)
- `GET /api/admin/users/count` → количество пользователей
- `GET /api/admin/stats` → общая статистика
- `GET /api/admin/admins` → список администраторов (суперадмины)

## Учетные данные по умолчанию
После создания администратора:
- **Логин**: `admin`
- **Пароль**: `admin123`
- **Email**: `admin@hawklets.com`

**ВАЖНО**: Смените пароль после первого входа!

## Проверка работоспособности

1. **Перейдите по адресу**: `https://hawklets.com/admin/login`
2. **Войдите с учетными данными**: admin / admin123
3. **Должны увидеть**: 
   - Дашборд со статистикой
   - Боковое меню навигации
   - Возможность перейти к управлению пользователями
   - Таблицу пользователей с пагинацией (50 на страницу)

## Если проблемы сохраняются

1. **Проверьте консоль браузера** (F12) на наличие ошибок JavaScript
2. **Проверьте сетевые запросы** во вкладке Network
3. **Убедитесь, что API отвечает** на запросы
4. **Проверьте CORS настройки** если запросы блокируются
5. **Очистите кэш браузера** и обновите страницу (Ctrl+F5)

## Контакты для поддержки
При возникновении проблем с развертыванием обратитесь к разработчику или проверьте логи:
- Логи nginx: `/var/log/nginx/error.log`
- Логи бэкенда: `backend/logs/` или вывод контейнера
- Логи фронтенда: консоль браузера