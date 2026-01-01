This folder contains a simple Docker Compose setup for hawklets.com (frontend, backend, and a MongoDB container).

Quick start
1. Copy example env and edit secrets:
   cp .env.example .env
   Edit .env and set a strong MONGO_INITDB_ROOT_PASSWORD.

2. Build and run the stack (from project root):
   docker compose up -d --build

Notes & recommendations
- MongoDB runs in a container with a persistent volume `mongo-data`.
- For production, avoid exposing MongoDB to the public (the `ports` section is commented out).
- TLS: This compose serves HTTP on port 80. To secure with HTTPS you can:
  - Option A (recommended): use a reverse proxy like Traefik (letsencrypt) or nginx-proxy + companion for automatic TLS.
  - Option B: Run certbot on the VPS and mount `/etc/letsencrypt` into the frontend nginx container.
- Scaling: Use 1 worker for Uvicorn on a 2GB VPS; consider increasing workers on larger VPS.

Useful commands
- docker compose logs -f
- docker compose ps
- docker compose down -v  (removes volumes if you want a fresh start)

Security
- Create strong passwords. Keep `.env` out of version control.
- Consider configuring a normal MongoDB user (not root) and more restrictive network rules.
