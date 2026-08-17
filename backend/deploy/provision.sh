#!/usr/bin/env bash
# provision.sh — Idempotent VM provisioning for Strategic News Analyzer
# Target OS: Ubuntu 24.04 LTS on GCP e2-micro (us-central1 / us-east1 / us-west1)
#
# Usage:
#   1. SCP .env.production to /tmp/.env.production on the VM first
#   2. Run: sudo bash provision.sh
#
# Safe to re-run — all steps check before acting.
# Estimated time: 8-12 minutes on a fresh VM (mostly Ollama model pulls)

set -euo pipefail

REPO_URL="https://github.com/krishmaniyar/Strategic-News-Analyzer.git"
BRANCH="v3-native-backend"
INSTALL_DIR="/opt/strategic-news"
APP_USER="strategic-news"
VENV_DIR="${INSTALL_DIR}/venv"
ENV_FILE="${INSTALL_DIR}/.env.production"
DOMAIN=""  # Set via --domain flag or edit here

# ─── Parse args ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

echo "═══════════════════════════════════════════════"
echo " Strategic News Analyzer — VM Provisioning"
echo " Branch: ${BRANCH}"
echo " Install dir: ${INSTALL_DIR}"
echo "═══════════════════════════════════════════════"

# ─── 1. System user ──────────────────────────────────────────────────────────
echo "[1/9] Creating service user..."
if ! id "${APP_USER}" &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "${APP_USER}"
    echo "  Created user: ${APP_USER}"
else
    echo "  User already exists: ${APP_USER} (skipped)"
fi

# ─── 2. System packages ──────────────────────────────────────────────────────
echo "[2/9] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    build-essential \
    libpq-dev \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    ufw \
    logrotate
echo "  System packages installed."

# ─── 3. Ollama ───────────────────────────────────────────────────────────────
echo "[3/9] Installing Ollama..."
if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
    echo "  Ollama installed."
else
    echo "  Ollama already installed (skipped)."
fi

# Edit the Ollama unit to add memory limits and keep-alive
# (edit the generated unit via drop-in override, not by replacing the unit)
OLLAMA_OVERRIDE_DIR="/etc/systemd/system/ollama.service.d"
mkdir -p "${OLLAMA_OVERRIDE_DIR}"
cat > "${OLLAMA_OVERRIDE_DIR}/memory-limits.conf" <<'EOF'
[Service]
# Keep model in RAM for 5 minutes after last use, then unload.
# This prevents nomic-embed-text from competing with the API's 350M budget.
Environment="OLLAMA_KEEP_ALIVE=5m"
# Hard RAM limit — Ollama is OOM-killed if it exceeds this.
MemoryMax=500M
MemoryHigh=450M
EOF
systemctl daemon-reload
echo "  Ollama memory limits applied."

# ─── 4. Swap file ────────────────────────────────────────────────────────────
echo "[4/9] Setting up 2GB swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  Swap file created and enabled."
else
    echo "  Swap file already exists (skipped)."
fi

# ─── 5. Firewall ─────────────────────────────────────────────────────────────
echo "[5/9] Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP (Nginx → Let's Encrypt)"
ufw allow 443/tcp  comment "HTTPS (Nginx)"
# Port 8000 is intentionally NOT opened — FastAPI binds to 127.0.0.1 only
ufw --force enable
echo "  UFW configured: 22, 80, 443 open. Port 8000 NOT exposed."

# ─── 6. Clone repo + venv + deps ─────────────────────────────────────────────
echo "[6/9] Cloning repo and setting up Python environment..."
if [ -d "${INSTALL_DIR}/.git" ]; then
    echo "  Repo already cloned — pulling latest..."
    git -C "${INSTALL_DIR}" fetch origin
    git -C "${INSTALL_DIR}" checkout "${BRANCH}"
    git -C "${INSTALL_DIR}" pull origin "${BRANCH}"
else
    git clone --branch "${BRANCH}" "${REPO_URL}" "${INSTALL_DIR}"
fi

python3.11 -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --upgrade pip --quiet
"${VENV_DIR}/bin/pip" install -r "${INSTALL_DIR}/backend/requirements.txt" --quiet
echo "  Python venv created and dependencies installed."

# ─── 7. .env.production ──────────────────────────────────────────────────────
echo "[7/9] Setting up .env.production..."
if [ -f /tmp/.env.production ]; then
    cp /tmp/.env.production "${ENV_FILE}"
    chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    echo "  .env.production installed with secure permissions (chmod 600)."
else
    echo "  WARNING: /tmp/.env.production not found! Copy it to the VM and re-run."
    echo "  Template is at: ${INSTALL_DIR}/backend/deploy/env.production.template"
fi

# Set ownership of the entire install directory
chown -R "${APP_USER}:${APP_USER}" "${INSTALL_DIR}"

# ─── 8. systemd units ────────────────────────────────────────────────────────
echo "[8/9] Installing systemd units..."

# FastAPI service
cp "${INSTALL_DIR}/backend/deploy/strategic-news-api.service" \
   /etc/systemd/system/strategic-news-api.service

# Health check service + timer
cat > /etc/systemd/system/api-healthcheck.service <<EOF
[Unit]
Description=Strategic News API Health Check
[Service]
Type=oneshot
ExecStart=/opt/strategic-news/check-health.sh
EOF

cat > /etc/systemd/system/api-healthcheck.timer <<EOF
[Unit]
Description=Run API health check every 5 minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
[Install]
WantedBy=timers.target
EOF

# Health check script
cat > /opt/strategic-news/check-health.sh <<'HEALTHSCRIPT'
#!/usr/bin/env bash
# Restart the API service if /health fails 3 consecutive times
MAX_FAILS=3
FAIL_COUNT=0
for i in $(seq 1 $MAX_FAILS); do
    if curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
        exit 0  # healthy
    fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
    sleep 2
done
# All attempts failed
systemd-cat -t api-healthcheck echo "Health check failed ${MAX_FAILS} times — restarting strategic-news-api"
systemctl restart strategic-news-api.service
HEALTHSCRIPT
chmod +x /opt/strategic-news/check-health.sh

systemctl daemon-reload
systemctl enable ollama strategic-news-api nginx api-healthcheck.timer
echo "  systemd units installed and enabled."

# ─── 9. Start services + pull Ollama models ───────────────────────────────────
echo "[9/9] Starting services and pulling Ollama models..."
systemctl start ollama
echo "  Waiting for Ollama to be ready..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "  Ollama is ready."
        break
    fi
    sleep 2
done

ollama pull nomic-embed-text
# qwen2.5:7b NOT pulled — event generation now routes through Groq API
echo "  Ollama model pulled: nomic-embed-text"

systemctl start strategic-news-api
systemctl start nginx

# ─── Nginx config ────────────────────────────────────────────────────────────
if [ -n "${DOMAIN}" ]; then
    NGINX_CONF_SRC="${INSTALL_DIR}/backend/deploy/nginx-strategic-news.conf"
    NGINX_CONF_DST="/etc/nginx/sites-available/strategic-news"
    sed "s/YOUR_DOMAIN_HERE/${DOMAIN}/g" "${NGINX_CONF_SRC}" > "${NGINX_CONF_DST}"
    ln -sf "${NGINX_CONF_DST}" /etc/nginx/sites-enabled/strategic-news
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo "  Nginx configured for domain: ${DOMAIN}"
    echo ""
    echo "  Next step: run Certbot to get TLS cert:"
    echo "    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m your@email.com"
else
    echo "  No domain provided — Nginx not configured. Run with --domain your.domain.com"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo " Provisioning complete!"
echo "═══════════════════════════════════════════════"
echo " Services status:"
systemctl is-active --quiet strategic-news-api && echo "  ✓ strategic-news-api: running" || echo "  ✗ strategic-news-api: NOT running"
systemctl is-active --quiet ollama && echo "  ✓ ollama: running" || echo "  ✗ ollama: NOT running"
systemctl is-active --quiet nginx && echo "  ✓ nginx: running" || echo "  ✗ nginx: NOT running"
echo ""
echo " Memory check:"
free -h
echo ""
echo " Verify with: curl http://127.0.0.1:8000/health"
echo " Trigger test: curl -X POST http://127.0.0.1:8000/internal/trigger-ingestion \\"
echo "   -H 'Authorization: Bearer YOUR_INTERNAL_TRIGGER_TOKEN'"
echo ""
echo " See DEPLOY.md for DNS, GCP firewall, and Certbot steps."
