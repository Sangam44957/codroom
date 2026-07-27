#!/bin/bash
# ─────────────────────────────────────────────────────────
# CodRoom — EC2 Setup Script
# Run on a fresh Ubuntu 22.04 t2.micro instance
# Usage: chmod +x scripts/ec2-setup.sh && sudo ./scripts/ec2-setup.sh
# ─────────────────────────────────────────────────────────

set -euo pipefail

echo "═══════════════════════════════════════════"
echo "  CodRoom — EC2 Bootstrap"
echo "═══════════════════════════════════════════"

# ── 1. System updates ───────────────────────────────────
echo ""
echo "📦 Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── 2. Node.js 20 ──────────────────────────────────────
echo ""
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "  ✅ Node.js $(node -v) installed"
echo "  ✅ npm $(npm -v) installed"

# ── 3. Docker ──────────────────────────────────────────
echo ""
echo "🐳 Installing Docker..."
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu
echo "  ✅ Docker $(docker --version | awk '{print $3}') installed"

# ── 4. Pull sandbox images ──────────────────────────────
echo ""
echo "🐳 Pulling Docker sandbox images (this takes a few minutes)..."
docker pull node:20-alpine &
docker pull python:3.12-alpine &
docker pull gcc:13 &
docker pull golang:1.22-alpine &
docker pull rust:1.77-alpine &
docker pull openjdk:21-slim &
wait
echo "  ✅ Sandbox images pulled"

# ── 5. Redis ──────────────────────────────────────────
echo ""
echo "📦 Installing Redis..."
apt-get install -y redis-server
# Configure Redis: bind to localhost only, set max memory
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^# maxmemory .*/maxmemory 64mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server
echo "  ✅ Redis $(redis-server --version | awk '{print $3}') installed"

# ── 6. PM2 ──────────────────────────────────────────
echo ""
echo "📦 Installing PM2..."
npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu
echo "  ✅ PM2 $(pm2 -v) installed"

# ── 7. Nginx (reverse proxy + future SSL) ────────────
echo ""
echo "📦 Installing Nginx..."
apt-get install -y nginx
cat > /etc/nginx/sites-available/codroom-socket << 'NGINX'
server {
    listen 3001;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout settings
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/codroom-socket /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl restart nginx
echo "  ✅ Nginx installed and configured"

# ── 8. Swap (extra memory for t2.micro) ──────────────
echo ""
echo "📦 Creating 1GB swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Tune swappiness — use swap only when necessary
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl vm.swappiness=10
    echo "  ✅ 1GB swap created"
else
    echo "  ✅ Swap already exists"
fi

# ── 9. Firewall ─────────────────────────────────────
echo ""
echo "🔒 Configuring UFW firewall..."
ufw allow OpenSSH
ufw allow 3001/tcp    # Socket.IO (via Nginx)
ufw allow 443/tcp     # Future HTTPS
ufw --force enable
echo "  ✅ Firewall configured"

# ── 10. Create app directory ─────────────────────────
echo ""
echo "📁 Creating app directory..."
mkdir -p /home/ubuntu/codroom
chown -R ubuntu:ubuntu /home/ubuntu/codroom
echo "  ✅ /home/ubuntu/codroom created"

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ EC2 Setup Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "  1. Log out and back in (for Docker group)"
echo "  2. cd /home/ubuntu/codroom"
echo "  3. Clone your repo or SCP the server files"
echo "  4. Create .env file"
echo "  5. npm install && pm2 start ecosystem.config.cjs"
echo ""
