#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    log_error "Docker Compose not found. Please install Docker first."
    exit 1
fi

log_info "🚀 Starting CodRoom in production mode locally..."

# 1. Create production environment
if [[ ! -f ".env.local.prod" ]]; then
    log_info "Creating local production environment..."
    cat > .env.local.prod << 'EOF'
# Local Production Environment
NODE_ENV=production
DATABASE_URL="postgresql://postgres:strongpassword123@localhost:5433/codroom_prod"
DIRECT_URL="postgresql://postgres:strongpassword123@localhost:5433/codroom_prod"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="prod-jwt-secret-32-chars-minimum-length-here"
INTERNAL_SECRET="prod-internal-secret-32-chars-minimum-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
LOG_LEVEL="info"
SOCKET_PORT=3001
POSTGRES_PASSWORD=strongpassword123

# Add your production API keys here
# GROQ_API_KEY="your-groq-api-key"
# BREVO_API_KEY="your-brevo-api-key"
# BREVO_SENDER_EMAIL="noreply@yourdomain.com"
EOF
    log_success "Created .env.local.prod file"
fi

# 2. Create production docker-compose
cat > docker-compose.local-prod.yml << 'EOF'
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:strongpassword123@postgres:5432/codroom_prod
      - REDIS_URL=redis://redis:6379
      - NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
      - JWT_SECRET=prod-jwt-secret-32-chars-minimum-length-here
      - INTERNAL_SECRET=prod-internal-secret-32-chars-minimum-here
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  socket:
    build:
      context: .
      dockerfile: Dockerfile.socket
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:strongpassword123@postgres:5432/codroom_prod
      - REDIS_URL=redis://redis:6379
      - INTERNAL_SECRET=prod-internal-secret-32-chars-minimum-here
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=codroom_prod
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=strongpassword123
    ports:
      - "5433:5432"
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_prod_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.local.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
      - socket
    restart: unless-stopped

volumes:
  postgres_prod_data:
  redis_prod_data:
EOF

# 3. Create nginx configuration
cat > nginx.local.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    upstream socket {
        server socket:3001;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 80;
        server_name socket.localhost;

        location / {
            proxy_pass http://socket;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
}
EOF

# 4. Build and start services
log_info "Building Docker images..."
$DOCKER_COMPOSE -f docker-compose.local-prod.yml build

log_info "Starting production services..."
$DOCKER_COMPOSE -f docker-compose.local-prod.yml up -d

# 5. Wait for services and run migrations
log_info "Waiting for services to be ready..."
sleep 30

log_info "Running database migrations..."
$DOCKER_COMPOSE -f docker-compose.local-prod.yml exec app npx prisma migrate deploy

# 6. Health check
log_info "Running health checks..."
for i in {1..30}; do
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Application is healthy!"
        break
    fi
    if [[ $i -eq 30 ]]; then
        log_error "Health check failed"
        $DOCKER_COMPOSE -f docker-compose.local-prod.yml logs app
        exit 1
    fi
    sleep 5
done

log_success "🎉 CodRoom is running in production mode!"
echo
log_info "Access your application:"
echo "• Main App: http://localhost:3000"
echo "• Socket Server: http://localhost:3001"
echo "• Load Balanced: http://localhost (via Nginx)"
echo
log_info "To view logs:"
echo "$DOCKER_COMPOSE -f docker-compose.local-prod.yml logs -f"
echo
log_info "To stop:"
echo "$DOCKER_COMPOSE -f docker-compose.local-prod.yml down"