# Развертывание Hawklets на Production сервере

## Текущая ситуация
- Сервер имеет ограниченный объем диска (4.4GB)
- MongoDB ранее падал с ошибкой 132 (segmentation fault)
- Фронтенд не был включен в минимальную конфигурацию

## Решение проблем

### 1. Проверка дискового пространства
Перед запуском убедитесь, что есть достаточно места:
```bash
df -h
```

Очистка кэша Docker если нужно:
```bash
docker system prune -a --volumes
```

### 2. Новая production конфигурация
Создана новая конфигурация `docker-compose.prod.yml` которая:
- Включает фронтенд
- Использует bind mounts вместо named volumes
- Устанавливает лимиты памяти для всех сервисов
- Добавляет health checks

### 3. Запуск в production

#### Шаг 1: Подготовка окружения
```bash
# Создать директории для данных
mkdir -p data/mongo data/postgres data/redis

# Скопировать .env файл (если нужно)
cp .env.example .env
# Отредактировать .env с реальными значениями
nano .env
```

#### Шаг 2: Запуск сервисов
```bash
# Запустить все сервисы
docker compose -f docker-compose.prod.yml up -d --build

# Проверить статус
docker compose -f docker-compose.prod.yml ps

# Просмотреть логи MongoDB (если есть проблемы)
docker compose -f docker-compose.prod.yml logs mongo
```

#### Шаг 3: Проверка работоспособности
```bash
# Проверить health checks
curl http://localhost:8000/api/health

# Проверить фронтенд
curl -I http://localhost
```

### 4. Решение проблем с MongoDB

Если MongoDB продолжает падать с ошибкой 132:

#### Вариант A: Увеличить swap файл
```bash
# Проверить текущий swap
free -h

# Создать swap файл 1GB
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Сделать постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Вариант B: Использовать MongoDB 4.4 (более легковесный)
Изменить в `docker-compose.prod.yml`:
```yaml
mongo:
  image: mongo:4.4
  # остальная конфигурация...
```

#### Вариант C: Запустить тест MongoDB
```bash
# Запустить тестовый контейнер MongoDB
docker compose -f docker-compose.mongo-test.yml up -d

# Проверить статус
docker compose -f docker-compose.mongo-test.yml ps

# Если работает - проблема в конфигурации
# Если не работает - проблема с системой
```

### 5. Мониторинг ресурсов
```bash
# Мониторинг использования памяти
docker stats

# Мониторинг диска
watch -n 5 df -h

# Логи в реальном времени
docker compose -f docker-compose.prod.yml logs -f
```

## Конфигурация для ограниченных ресурсов

### Минимальные требования:
- **Память**: 2GB RAM (1GB + 1GB swap)
- **Диск**: 2GB свободного места
- **CPU**: 2 ядра

### Оптимизированные настройки в `docker-compose.prod.yml`:
- MongoDB: 512MB лимит памяти
- PostgreSQL: 256MB лимит памяти  
- Redis: 128MB лимит памяти + политика LRU
- Backend: 512MB лимит памяти
- Frontend: 256MB лимит памяти

## Дополнительные настройки для production

### 1. Настройка firewall
```bash
# Разрешить порты 80 и 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Настройка домена (если есть)
1. Настроить DNS запись A на IP сервера
2. Обновить `.env` файл:
   ```
   CORS_ORIGINS=https://ваш-домен.com
   ```
3. Перезапустить сервисы

### 3. Резервное копирование
```bash
# Скрипт для бэкапа данных
#!/bin/bash
BACKUP_DIR="/backups/hawklets"
DATE=$(date +%Y%m%d_%H%M%S)

# Бэкап MongoDB
docker exec hawklets-project-mongo-1 mongodump \
  --username admin \
  --password ваш-пароль \
  --out /tmp/mongo-backup
docker cp hawklets-project-mongo-1:/tmp/mongo-backup $BACKUP_DIR/mongo_$DATE

# Бэкап PostgreSQL
docker exec hawklets-project-postgres-1 pg_dump \
  -U hawklets \
  hawklets > $BACKUP_DIR/postgres_$DATE.sql
```

## Устранение неполадок

### Фронтенд недоступен
1. Проверить, что контейнер frontend запущен:
   ```bash
   docker compose -f docker-compose.prod.yml ps frontend
   ```
2. Проверить логи:
   ```bash
   docker compose -f docker-compose.prod.yml logs frontend
   ```
3. Проверить, что nginx конфигурация правильная:
   ```bash
   docker exec hawklets-project-frontend-1 nginx -t
   ```

### Backend unhealthy
1. Проверить подключение к базам данных:
   ```bash
   # Проверить MongoDB
   docker exec hawklets-project-backend-1 python -c "
   from pymongo import MongoClient
   client = MongoClient('mongodb://admin:password@mongo:27017')
   print(client.admin.command('ping'))
   "
   
   # Проверить PostgreSQL
   docker exec hawklets-project-backend-1 python -c "
   import psycopg2
   conn = psycopg2.connect(
       host='postgres',
       database='hawklets',
       user='hawklets',
       password='hawklets_password'
   )
   print('PostgreSQL connected')
   conn.close()
   "
   ```

### Нехватка памяти
1. Уменьшить лимиты в `docker-compose.prod.yml`
2. Добавить swap файл
3. Рассмотреть использование SQLite вместо PostgreSQL для начального этапа

## Обновление приложения
```bash
# Получить последние изменения
git pull origin main

# Пересобрать и перезапустить
docker compose -f docker-compose.prod.yml up -d --build

# Применить миграции (если будут)
docker exec hawklets-project-backend-1 python -m alembic upgrade head