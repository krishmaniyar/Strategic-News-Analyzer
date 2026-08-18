# Strategic News Analyzer — Deployment Guide
## v3-native-backend: FastAPI + APScheduler + Ollama (native) + Nginx on AWS EC2 t2.micro

---

## Prerequisites

Before starting, you need:
- An **AWS account** (free tier eligible for 12 months — `t2.micro` is free)
- A **domain name** with an A record pointed at your EC2 Elastic IP
  - Free options: [duckdns.org](https://www.duckdns.org/), [nip.io](https://nip.io), or [freenom.com](https://freenom.com)
- A **Supabase project** with the schema from `backend/migrations.sql` applied
- A **Groq API key** from [console.groq.com](https://console.groq.com)
- (Optional) API keys for NewsAPI, GNews, MediaStack

---

## Step 0 — AWS EC2 Setup

### 0.1 Launch EC2 Instance

1. Go to **EC2 Console** → **Launch Instance**
2. Settings:
   - **Name**: `strategic-news-api`
   - **AMI**: Ubuntu Server 24.04 LTS (HVM, SSD) — search "ubuntu 24.04"
   - **Instance type**: `t2.micro` (**Free tier eligible** ✅)
   - **Key pair**: Create a new key pair (RSA, .pem format) → download and save it
   - **Storage**: 30 GB gp2 (free tier includes 30 GB)

3. **Network settings** → Edit:
   - Create a new security group named `strategic-news-sg`
   - Add inbound rules:

     | Type | Port | Source | Reason |
     |------|------|--------|--------|
     | SSH | 22 | My IP (or 0.0.0.0/0 if dynamic IP) | Admin access |
     | HTTP | 80 | 0.0.0.0/0 | Let's Encrypt ACME challenge |
     | HTTPS | 443 | 0.0.0.0/0 | API traffic |

   > ⚠️ Port **8000 is intentionally NOT opened** — FastAPI binds to `127.0.0.1` only. Nginx is the only external entry point.

4. Click **Launch Instance**

### 0.2 Reserve an Elastic IP (static IP)

1. EC2 Console → **Elastic IPs** → **Allocate Elastic IP address** → Allocate
2. Select the new IP → **Actions → Associate Elastic IP address**
3. Choose your `strategic-news-api` instance → Associate
4. Copy the Elastic IP address — you'll need it for DNS

> **Cost**: Elastic IPs are **free while attached to a running instance**. If the instance is stopped, you'll be charged ~$0.005/hour for the IP. Keep the instance running or release the IP when not needed.

### 0.3 Connect to your instance

```bash
# Fix key permissions (required on Mac/Linux)
chmod 400 ~/Downloads/your-key.pem

# SSH in
ssh -i ~/Downloads/your-key.pem ubuntu@YOUR_ELASTIC_IP
```

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
scp -i ~/Downloads/your-key.pem .env.production ubuntu@YOUR_ELASTIC_IP:/tmp/.env.production
```

> **Security**: `/tmp/.env.production` is temporary — `provision.sh` moves it to
> `/opt/strategic-news/.env.production` with `chmod 600` and correct ownership.
> Delete from `/tmp` after provisioning:
> ```bash
> rm -f /tmp/.env.production
> ```

---

## Step 4 — Run provision.sh

SSH into the VM and run:

```bash
ssh -i ~/Downloads/your-key.pem ubuntu@YOUR_ELASTIC_IP

# Download the provisioning script from the repo
curl -fsSL https://raw.githubusercontent.com/krishmaniyar/Strategic-News-Analyzer/v3-native-backend/backend/deploy/provision.sh -o provision.sh

# Run with your domain
sudo bash provision.sh --domain api.yourdomain.com
```

This takes **~8-12 minutes** (mostly pulling the `nomic-embed-text` Ollama model).
It is **idempotent** — safe to re-run if it fails partway through.

What it does:
1. Creates `strategic-news` non-root system user
2. Installs Python 3.11, Nginx, Certbot, build tools
3. Installs Ollama (native) with `MemoryMax=500M`
4. Sets up 2 GB swap file
5. Configures UFW firewall
6. Clones the repo → creates venv → installs pinned dependencies
7. Sets `.env.production` permissions to `chmod 600`
8. Installs and enables systemd units
9. Starts all services + pulls `nomic-embed-text` model

---

## Step 5 — Point DNS to your Elastic IP

In your domain registrar / DNS provider:
- Add an **A record**: `api.yourdomain.com` → `YOUR_ELASTIC_IP`
- TTL: 300 seconds (5 minutes) for fast propagation

Verify DNS propagated:
```bash
nslookup api.yourdomain.com
# Should return your Elastic IP
```

---

## Step 6 — Get TLS Certificate

After DNS has propagated (usually 5-15 minutes):

```bash
sudo certbot --nginx -d api.yourdomain.com \
  --non-interactive \
  --agree-tos \
  -m your@email.com
```

Certbot auto-renews via a systemd timer (installed automatically by certbot).

---

## Step 7 — Verify Everything

```bash
# All 3 services running
sudo systemctl status strategic-news-api ollama nginx

# Health check over HTTPS
curl -s https://api.yourdomain.com/health | python3 -m json.tool

# Expected response:
# {
#   "status": "healthy",
#   "version": "3.0.0",
#   "database": "connected",
#   "scheduler": "running",
#   "next_ingestion_ist": "2026-08-19 00:00:00+05:30"   ← midnight IST
# }

# Memory check (idle should be < 600 MB)
free -h

# Trigger a test ingestion run (replace with your actual token)
curl -X POST https://api.yourdomain.com/internal/trigger-ingestion \
  -H "Authorization: Bearer YOUR_INTERNAL_TRIGGER_TOKEN"

# Watch logs live
sudo journalctl -u strategic-news-api -f
```

---

## Step 8 — Update Vercel Frontend

In your Vercel project settings → Environment variables:
```
NEXT_PUBLIC_API_BASE_URL = https://api.yourdomain.com
NEXT_PUBLIC_WS_URL       = wss://api.yourdomain.com/ws/feed
```

Redeploy the frontend after setting these.

---

## AWS vs GCP — What's Different

| | GCP e2-micro | AWS t2.micro |
|-|-------------|-------------|
| vCPU | 1 (burstable) | 1 (burstable, CPU credits) |
| RAM | 1 GB | 1 GB |
| Free tier | Always free (with limits) | 12 months free |
| After free tier | ~$6/month | ~$8.50/month on-demand |
| Static IP | Free (when attached) | Free (when attached) |
| Default user | varies | `ubuntu` |
| SSH key format | Browser SSH or .pem | .pem required |

> **After 12 months**: Consider switching to **AWS Lightsail $5/month** (1 GB RAM, simpler, fixed price) or keeping EC2 at ~$8.50/month.

---

## Day-2 Operations

### Manual ingestion trigger
```bash
curl -X POST https://api.yourdomain.com/internal/trigger-ingestion \
  -H "Authorization: Bearer YOUR_INTERNAL_TRIGGER_TOKEN"
```

### Check ingestion status (Supabase JWT)
```bash
curl https://api.yourdomain.com/api/v2/admin/ingestion-status \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT"
```

### View logs
```bash
sudo journalctl -u strategic-news-api -f          # live tail
sudo journalctl -u strategic-news-api -n 100      # last 100 lines
sudo journalctl -u strategic-news-api -p err -n 50 # errors only
sudo journalctl -u ollama -n 50
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
watch -n 2 free -h
systemctl status strategic-news-api ollama | grep Memory
```

---

## Memory Budget Reference

| Component | Idle | Peak (during ingestion) |
|-----------|------|------------------------|
| FastAPI + APScheduler | ~80 MB | ~350 MB (numpy/sklearn HDBSCAN) |
| Ollama (nomic-embed-text loaded) | ~350 MB | ~450 MB |
| Nginx | ~25 MB | ~25 MB |
| OS + kernel | ~100 MB | ~100 MB |
| **Total** | **~555 MB** | **~925 MB** |
| Swap (safety net) | 2 GB | — |

> Ollama unloads the model after `OLLAMA_KEEP_ALIVE=5m`. Peak RAM only occurs during the ~30-minute ingestion window at midnight IST.

---

## Ingestion Schedule

| Time (UTC) | Time (IST) | Event |
|------------|-----------|-------|
| 18:30 UTC | 00:00 IST | Ingestion job fires |
| 18:30–19:00 UTC | 00:00–00:30 IST | Article fetch (5 sources) + Groq analysis + Ollama embeddings |
| 19:00–19:15 UTC | 00:30–00:45 IST | HDBSCAN clustering + Groq event generation |
| 19:15 UTC | 00:45 IST | Token budget flushed to Postgres; Ollama unloads model after 5m |

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| `strategic-news-api` fails to start | `journalctl -u strategic-news-api -n 50` — usually a bad `.env.production` value |
| Ingestion job doesn't fire | `curl /health` → check `scheduler: running`; verify `next_ingestion_ist` is showing |
| OOM kill during ingestion | `dmesg \| grep -i oom`; the 2GB swap should absorb spikes — if not, check Ollama model size |
| Ollama not responding | `systemctl restart ollama`; wait 30s; `curl http://localhost:11434/api/tags` |
| TLS cert expired | `certbot renew --dry-run` then `certbot renew` |
| DB unreachable | Check `DATABASE_URL` in `.env.production`; Supabase pauses free projects after 1 week of inactivity — visit the dashboard to unpause |
| EC2 instance stopped | Check AWS billing alerts; free tier is 750 hrs/month (enough for 1 instance running continuously) |
