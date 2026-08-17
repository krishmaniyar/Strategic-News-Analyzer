# Strategic News Analyzer — Deployment Guide
## v3-native-backend: FastAPI + APScheduler + Ollama (native) + Nginx on GCP e2-micro

---

## Prerequisites

Before starting, you need:
- A **GCP e2-micro VM** (free tier) running **Ubuntu 24.04 LTS**
- A **static external IP** reserved in GCP (Networking → IP addresses → Reserve)
- A **domain name** with an A record pointed at that static IP
  - Or use a free subdomain from [nip.io](https://nip.io) or [duckdns.org](https://www.duckdns.org/)
- A **Supabase project** with the schema from `backend/migrations.sql` applied
- A **Groq API key** from [console.groq.com](https://console.groq.com)
- (Optional) API keys for NewsAPI, GNews, MediaStack

---

## Step 0 — GCP VM Setup

In the GCP Console:

1. **Create the VM**:
   - Machine type: `e2-micro`
   - Region: `us-central1`, `us-east1`, or `us-west1` (free tier eligible)
   - Boot disk: Ubuntu 24.04 LTS, 30 GB standard persistent disk
   - Firewall: ✅ Allow HTTP, ✅ Allow HTTPS

2. **Reserve a static IP**:
   - Go to: VPC Network → IP addresses → Reserve External Static Address
   - Attach to your VM instance

3. **GCP firewall rules** (Networking → Firewall):
   - Allow TCP 22 (SSH) from your IP or `0.0.0.0/0`
   - Allow TCP 80 (HTTP — needed for Let's Encrypt challenge)
   - Allow TCP 443 (HTTPS)
   - ⚠️ Port 8000 is **NOT opened** — FastAPI binds to `127.0.0.1` only; Nginx is the only external entry point

---

## Step 1 — Apply the Database Migration

In Supabase SQL editor, run the full `backend/migrations.sql` file.
This includes Migration 012 which adds `token_usage_log` (replaces Redis token tracking).

---

## Step 2 — Prepare .env.production

On your **local machine**:
```bash
cp backend/deploy/env.production.template .env.production
# Edit .env.production with your actual values
```

Fill in all required values:
- `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE`, `DATABASE_URL`
- `GROQ_API_KEY`
- `INTERNAL_TRIGGER_TOKEN` — generate a secure random value:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- `CORS_ORIGINS` — your Vercel app URL + custom domain if any
- News API keys (all optional)

---

## Step 3 — Copy .env.production to VM

```bash
# From your local machine
scp .env.production YOUR_VM_USER@YOUR_VM_IP:/tmp/.env.production
```

> **Security**: `/tmp/.env.production` is temporary — `provision.sh` moves it to
> `/opt/strategic-news/.env.production` with `chmod 600` and correct ownership.
> Delete `/tmp/.env.production` from the VM after provisioning:
> ```bash
> rm -f /tmp/.env.production
> ```

---

## Step 4 — Run provision.sh

SSH into the VM and run:

```bash
ssh YOUR_VM_USER@YOUR_VM_IP

# Download the provisioning script directly from the repo
curl -fsSL https://raw.githubusercontent.com/krishmaniyar/Strategic-News-Analyzer/v3-native-backend/backend/deploy/provision.sh -o provision.sh

# Run with your domain
sudo bash provision.sh --domain api.yourdomain.com
```

This takes ~8-12 minutes (mostly pulling the `nomic-embed-text` Ollama model).
It is **idempotent** — safe to re-run if it fails partway through.

What it does:
1. Creates `strategic-news` non-root system user
2. Installs Python 3.11, Nginx, Certbot, build tools
3. Installs Ollama (native) with `MemoryMax=500M`
4. Sets up 2 GB swap file
5. Configures UFW (22/80/443 only)
6. Clones the repo + creates venv + installs pinned dependencies
7. Sets `.env.production` permissions to `chmod 600`
8. Installs and enables systemd units
9. Starts all services + pulls `nomic-embed-text`

---

## Step 5 — Get TLS Certificate

After `provision.sh` completes and DNS has propagated:

```bash
sudo certbot --nginx -d api.yourdomain.com \
  --non-interactive \
  --agree-tos \
  -m your@email.com
```

Certbot auto-renews via a systemd timer (installed by certbot automatically).

---

## Step 6 — Verify Everything

```bash
# All 3 services running
sudo systemctl status strategic-news-api ollama nginx

# Health check
curl -s https://api.yourdomain.com/health | python3 -m json.tool

# Expected response:
# {
#   "status": "healthy",
#   "version": "3.0.0",
#   "database": "connected",
#   "scheduler": "running",
#   "next_ingestion_ist": "2026-08-18 00:00:00+05:30"   ← should be midnight IST
# }

# Memory check (should be < 600 MB idle, < 950 MB during ingestion)
free -h

# Trigger a test ingestion run (replace with your actual token)
curl -X POST https://api.yourdomain.com/internal/trigger-ingestion \
  -H "Authorization: Bearer YOUR_INTERNAL_TRIGGER_TOKEN"

# Watch the logs
sudo journalctl -u strategic-news-api -f

# After ~1-2 minutes, check Supabase for new articles
```

---

## Step 7 — Update Vercel Frontend

In your Vercel project settings → Environment variables:
```
NEXT_PUBLIC_API_BASE_URL = https://api.yourdomain.com
NEXT_PUBLIC_WS_URL       = wss://api.yourdomain.com/ws/feed
```

Redeploy the frontend.

---

## Day-2 Operations

### Manual ingestion trigger
```bash
curl -X POST https://api.yourdomain.com/internal/trigger-ingestion \
  -H "Authorization: Bearer YOUR_INTERNAL_TRIGGER_TOKEN"
```

### Check ingestion status (via Supabase JWT)
```bash
curl https://api.yourdomain.com/api/v2/admin/ingestion-status \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT"
```

### View logs
```bash
# Live tail
sudo journalctl -u strategic-news-api -f

# Last 100 lines
sudo journalctl -u strategic-news-api -n 100

# Ollama logs
sudo journalctl -u ollama -n 50

# Only errors
sudo journalctl -u strategic-news-api -p err -n 50
```

### Update to a new version
```bash
cd /opt/strategic-news
sudo -u strategic-news git pull origin v3-native-backend
sudo -u strategic-news /opt/strategic-news/venv/bin/pip install -r backend/requirements.txt --quiet
sudo systemctl restart strategic-news-api
sudo systemctl status strategic-news-api
```

### Memory monitoring during ingestion
```bash
# Watch memory in real-time
watch -n 2 free -h

# See per-service memory usage
systemctl status strategic-news-api ollama | grep Memory
```

---

## Memory Budget Reference

| Component | Idle | Peak (during ingestion) |
|-----------|------|------------------------|
| FastAPI + APScheduler | ~80 MB | ~350 MB (numpy/sklearn for HDBSCAN) |
| Ollama (nomic-embed-text loaded) | ~350 MB | ~450 MB |
| Nginx | ~25 MB | ~25 MB |
| OS + kernel | ~100 MB | ~100 MB |
| **Total** | **~555 MB** | **~925 MB** |
| Swap (safety net) | 2 GB available | — |

> ⚠️ Ollama unloads `nomic-embed-text` after `OLLAMA_KEEP_ALIVE=5m`.
> Peak RAM only occurs during the ~15-30 minute ingestion window at midnight IST.
> If you see OOM kills, check `journalctl -u strategic-news-api -p err` first.

---

## Ingestion Schedule

| Time | Event |
|------|-------|
| 18:30 UTC | Ingestion job fires (= 00:00 IST midnight) |
| 18:30–19:00 UTC | Article fetch, analysis (Groq), embedding (Ollama) |
| 19:00–19:15 UTC | HDBSCAN clustering + Groq event generation |
| 19:15 UTC | Token budget flushed to Postgres, Ollama keeps model 5min then unloads |

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| `strategic-news-api` fails to start | `journalctl -u strategic-news-api -n 50` — usually a bad .env value |
| Ingestion job doesn't fire | `curl /health` → check `scheduler: running`; check `next_ingestion_ist` |
| OOM kill during ingestion | `dmesg | grep -i oom`; reduce `GROQ_DAILY_TOKEN_BUDGET` or add more swap |
| Ollama not responding | `systemctl restart ollama`; wait 30s; `curl http://localhost:11434/api/tags` |
| TLS cert expired | `certbot renew --dry-run` then `certbot renew` |
| DB unreachable | Check `DATABASE_URL` in `.env.production`; Supabase pauses free projects after 1 week inactivity |
