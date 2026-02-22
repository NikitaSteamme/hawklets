# Быстрый старт: Hawklets на Production

## Текущая ситуация
Вы переустановили VPS и теперь нужно развернуть Hawklets заново. Docker уже установлен, но нужно использовать `docker-compose` вместо `docker compose`.

## Команды для запуска

### 1. Проверка установки Docker
```bash
docker --version
docker-compose --version
```

### 2. Запуск Hawklets (самый простой способ)
```bash
# Сделать скрипты исполняемыми
chmod +x start-production.sh deploy.sh

# Запустить приложение
./start-production.sh
```

### 3. ИЛИ запустить вручную
```bash
# Создать директории для данных
mkdir -p data/mongo data/postgres data/redis

# Проверить/создать .env файл
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠ ОТРЕДАКТИРУЙТЕ .env ФАЙЛ!"
    echo "nano .env"
    exit 1
fi

# Запустить контейнеры
docker-compose -f docker-compose.prod.yml up -d --build

# Проверить статус
docker-compose -f docker-compose.prod.yml ps
```

## Что делает новая конфигурация

`docker-compose.prod.yml` включает:
- ✅ **Frontend** - React приложение на порту 80
- ✅ **Backend** - FastAPI API на порту 8000  
- ✅ **MongoDB** - с исправленной проблемой error 132
- ✅ **PostgreSQL** - для реляционных данных
- ✅ **Redis** - для кэширования
- ✅ **Health checks** - автоматический мониторинг
- ✅ **Лимиты памяти** - оптимизация для маленьких VPS

## Проверка работы

После запуска проверьте:
```bash
# Frontend
curl -I http://localhost

# Backend API
curl http://localhost:8000/api/health

# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps
```

## Решение проблем

### Если порт 80 занят
```bash
# Остановить другие веб-серверы
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### Если не хватает памяти
```bash
# Добавить swap
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Просмотр логов
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

## Полезные команды

```bash
# Остановить приложение
docker-compose -f docker-compose.prod.yml down

# Перезапустить
docker-compose -f docker-compose.prod.yml restart

# Обновить (после git pull)
docker-compose -f docker-compose.prod.yml up -d --build

# Мониторинг ресурсов
docker stats
```

## Готово!
Приложение будет доступно по `http://IP_ВАШЕГО_СЕРВЕРА` с полным фронтендом и исправленной проблемой MongoDB.