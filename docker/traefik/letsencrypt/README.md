This folder stores Let's Encrypt data for Traefik. The `acme.json` file will be created automatically by Traefik when it obtains certificates.

NOTE: Ensure the folder is writable by the Docker process. Example:

sudo mkdir -p docker/traefik/letsencrypt
sudo touch docker/traefik/letsencrypt/acme.json
sudo chmod 600 docker/traefik/letsencrypt/acme.json

If you need to migrate or backup certificates, copy the acme.json file safely and keep permissions intact.