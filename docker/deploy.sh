#!/usr/bin/env bash
set -euo pipefail

# Quick deploy script (use from project root)
# 1) Copy .env.example -> .env and edit the values
# 2) Run this script: ./docker/deploy.sh

if [ ! -f ".env" ]; then
  echo ".env file not found. Copy .env.example and edit it before running this script."
  exit 1
fi

docker compose pull || true

docker compose up -d --build

echo "Services started. Check logs with: docker compose logs -f"
