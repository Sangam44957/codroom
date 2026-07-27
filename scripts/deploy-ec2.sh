#!/bin/bash
# ─────────────────────────────────────────────────────────
# CodRoom — Deploy Socket.IO server to EC2
# Run from your local machine or from GitHub Actions
# Usage: ./scripts/deploy-ec2.sh
# ─────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ──
EC2_HOST="${EC2_HOST:?Set EC2_HOST env var (e.g. ubuntu@<elastic-ip>)}"
EC2_KEY="${EC2_KEY:-~/.ssh/codroom-ec2.pem}"
APP_DIR="/home/ubuntu/codroom"

echo "🚀 Deploying CodRoom Socket.IO to EC2..."
echo "   Host: $EC2_HOST"
echo "   Key:  $EC2_KEY"
echo ""

# ── 1. Sync server files ──
echo "📦 Syncing files to EC2..."
rsync -avz --delete \
  -e "ssh -i $EC2_KEY -o StrictHostKeyChecking=no" \
  --include="server/***" \
  --include="prisma/***" \
  --include="src/constants/***" \
  --include="src/lib/***" \
  --include="package.json" \
  --include="package-lock.json" \
  --include="ecosystem.config.cjs" \
  --include=".env" \
  --exclude="*" \
  ./ "$EC2_HOST:$APP_DIR/"

# ── 2. Install dependencies on EC2 ──
echo "📦 Installing dependencies on EC2..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_HOST" << 'REMOTE'
  cd /home/ubuntu/codroom
  mkdir -p logs
  npm install --production
  npx prisma generate
REMOTE

# ── 3. Restart the Socket.IO server ──
echo "🔄 Restarting Socket.IO server..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_HOST" << 'REMOTE'
  cd /home/ubuntu/codroom
  pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
  pm2 save
  sleep 3
  pm2 status
REMOTE

echo ""
echo "✅ Deployment complete!"
echo "   Socket.IO should be running at $EC2_HOST:3001"
echo "   Check logs: ssh -i $EC2_KEY $EC2_HOST 'pm2 logs codroom-socket'"
