# Настройка Production сервера для Hawklets

## Быстрый старт

Если Docker уже установлен (проверьте: `docker --version` и `docker-compose --version`):

```bash
# 1. Клонировать репозиторий
git clone <ваш-репозиторий> hawklets
cd hawklets

# 2. Настроить окружение
cp .env.example .env
nano .env  # отредактировать пароли

# 3. Запустить развертывание
chmod +x deploy.sh
./deploy.sh
```

## Если Docker не установлен

### Установка Docker на Ubuntu 22.04:

```bash
# Способ 1: Используя скрипт
chmod +x install-docker.sh
sudo ./install-docker.sh

# Способ 2: Вручную
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
# Перезайдите в систему или выполните:
newgrp docker
```

## Проверка установки

```bash
# Проверить Docker
docker --version
# Должно быть: Docker version 20.10+ или выше

# Проверить Docker Compose
docker-compose --version
# Должно быть: docker-compose version 1.29+

# Проверить работу Docker
docker run hello-world
```

## Запуск Hawklets

### Вариант A: Использовать скрипт развертывания (рекомендуется)
```bash
./deploy.sh
```

### Вариант B: Запустить вручную
```bash
# 1. Создать директории для данных
mkdir -p data/mongo data/postgres data/redis

# 2. Настроить .env файл
cp .env.example .env
# Отредактируйте .env, установите пароли:
# - JWT_SECRET_KEY (сгенерируйте случайный ключ)
# - MONGO_INITDB_ROOT_PASSWORD
# - POSTGRES_PASSWORD

# 3. Запустить контейнеры
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Проверить статус
docker-compose -f docker-compose.prod.yml ps

# 5. Просмотреть логи
docker-compose -f docker-compose.prod.yml logs -f
```

## Проверка работоспособности

После запуска проверьте:

1. **Frontend**: Откройте в браузере `http://IP_ВАШЕГО_СЕРВЕРА`
2. **Backend API**: `http://IP_ВАШЕГО_СЕРВЕРА:8000/api/health`
3. **Статус контейнеров**: `docker-compose -f docker-compose.prod.yml ps`

## Решение проблем

### 1. MongoDB не запускается (ошибка 132)
```bash
# Увеличить swap файл
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Перезапустить MongoDB
docker-compose -f docker-compose.prod.yml restart mongo
```

### 2. Недостаточно места на диске
```bash
# Очистить Docker кэш
docker system prune -a --volumes

# Проверить свободное место
df -h
```

### 3. Порт 80 занят
```bash
# Проверить, что слушает порт 80
sudo netstat -tulpn | grep :80

# Если занят nginx/apache, остановите их
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### 4. Проблемы с правами Docker
```bash
# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Применить изменения
newgrp docker
# ИЛИ перезайдите в систему
```

## Мониторинг и обслуживание

### Просмотр логов
```bash
# Все логи
docker-compose -f docker-compose.prod.yml logs

# Логи конкретного сервиса
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs mongo

# Логи в реальном времени
docker-compose -f docker-compose.prod.yml logs -f
```

### Остановка приложения
```bash
docker-compose -f docker-compose.prod.yml down
```

### Перезапуск
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Обновление приложения
```bash
# Получить последние изменения
git pull origin main

# Пересобрать и перезапустить
docker-compose -f docker-compose.prod.yml up -d --build
```

## Конфигурация для production

### Настройка домена
1. Настройте DNS запись A на IP вашего сервера
2. Обновите `.env` файл:
   ```
   CORS_ORIGINS=https://ваш-домен.com
   ```
3. Перезапустите приложение

### Настройка SSL (HTTPS)
Для production рекомендуется использовать:
- Traefik (уже настроен в `docker-compose.yml`)
- Nginx с Let's Encrypt
- Cloudflare

### Резервное копирование
```bash
# Бэкап MongoDB
docker exec hawklets-project-mongo-1 mongodump \
  --username admin \
  --password ваш-пароль \
  --out /tmp/mongo-backup

# Бэкап PostgreSQL
docker exec hawklets-project-postgres-1 pg_dump \
  -U hawklets \
  hawklets > backup_$(date +%Y%m%d).sql
```

## Контакты и поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose -f docker-compose.prod.yml logs`
2. Проверьте статус контейнеров: `docker-compose -f docker-compose.prod.yml ps`
3. Убедитесь, что есть достаточно памяти и места на диске

Приложение оптимизировано для работы на VPS с 2GB RAM и 10GB диска.