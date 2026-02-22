#!/bin/bash

# Скрипт установки Docker и Docker Compose на Ubuntu
set -e

echo "=== Установка Docker и Docker Compose ==="
echo

echo "1. Обновление пакетов..."
apt-get update

echo "2. Установка зависимостей..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

echo "3. Добавление GPG ключа Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "4. Добавление репозитория Docker..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "5. Установка Docker..."
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

echo "6. Установка Docker Compose..."
apt-get install -y docker-compose

echo "7. Проверка установки..."
docker --version
docker-compose --version

echo "8. Настройка прав для текущего пользователя..."
usermod -aG docker $USER

echo
echo "=== УСТАНОВКА ЗАВЕРШЕНА ==="
echo "Docker и Docker Compose успешно установлены!"
echo
echo "Для применения изменений прав выполните:"
echo "  newgrp docker"
echo "ИЛИ перезайдите в систему"
echo
echo "Для проверки работы Docker:"
echo "  docker run hello-world"
echo
echo "Для установки Hawklets выполните:"
echo "  ./deploy.sh"