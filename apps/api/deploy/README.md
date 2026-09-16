# Deploying the API to a plain VPS

One-time setup for a fresh Ubuntu 22.04/24.04 server. Run everything below
over SSH as a non-root user with sudo.

## 1. DNS

Point `api.leadsuperstore.online` at the VPS's IP address (an A record) in
your domain registrar's DNS settings. Do this first — it can take a few
minutes to propagate, and Caddy needs it resolvable before it can get a
TLS certificate in step 4.

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## 3. Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

## 4. Deploy the API

```bash
git clone <your-repo-url> lead-superstore
cd lead-superstore/apps/api
cp .env.example .env
# edit .env with real production values — see .env.example for the list
nano .env

docker compose up -d --build
```

Check it's running:

```bash
curl http://127.0.0.1:8000/health
```

## 5. Wire up Caddy

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy automatically requests and renews a TLS certificate the first time
it sees a request for `api.leadsuperstore.online` — no certbot, no manual
renewal cron job.

## 6. Firewall

Only ports 80/443 (Caddy) need to be open to the internet. The API's own
port 8000 is bound to `127.0.0.1` in `docker-compose.yml`, so it's not
reachable directly even without a firewall — but it's still worth locking
down SSH access properly:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

## Verifying

```bash
curl https://api.leadsuperstore.online/health
```

Should return `{"status":"ok","environment":"production"}` — if
`environment` still says `development`, `.env`'s `ENVIRONMENT` wasn't
updated.

## Updating after a code change

```bash
cd lead-superstore
git pull
cd apps/api
docker compose up -d --build
```

Docker rebuilds the image and replaces the running container with zero
manual restart steps — `restart: unless-stopped` in docker-compose.yml
also means the container comes back on its own after a server reboot or
crash, without needing a separate systemd unit.

## Logs

```bash
docker compose logs -f
```
