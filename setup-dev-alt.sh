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

log_info "🚀 Setting up CodRoom for development (using alternative ports)..."

# Detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    log_error "Docker Compose not found. Please install Docker first."
    exit 1
fi

# 1. Stop any existing containers
log_info "Stopping any existing containers..."
$DOCKER_COMPOSE -f docker-compose.dev.yml down 2>/dev/null || true

# 2. Create development environment file
log_info "Creating development environment file..."
cat > .env << 'EOF'
# Development Environment (Alternative Ports)
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/codroom_dev"
DIRECT_URL="postgresql://postgres:postgres@localhost:5433/codroom_dev"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="dev-jwt-secret-32-chars-minimum-length"
INTERNAL_SECRET="dev-internal-secret-32-chars-minimum"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
LOG_LEVEL="debug"
SOCKET_PORT=3001

# Optional - Add your API keys for full functionality
# GROQ_API_KEY="your-groq-api-key"
# BREVO_API_KEY="your-brevo-api-key"
# BREVO_SENDER_EMAIL="test@example.com"
EOF

# 3. Create Docker Compose file with alternative ports
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: codroom_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"  # Use port 5433 instead of 5432
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"  # Use port 6380 instead of 6379
    volumes:
      - redis_dev_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_dev_data:
  redis_dev_data:
EOF

# 4. Start services
log_info "Starting PostgreSQL (port 5433) and Redis (port 6380)..."
$DOCKER_COMPOSE -f docker-compose.dev.yml up -d

# 5. Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 15

# Check PostgreSQL
for i in {1..30}; do
    if pg_isready -h localhost -p 5433 -U postgres &> /dev/null; then
        log_success "PostgreSQL is ready on port 5433"
        break
    fi
    if [[ $i -eq 30 ]]; then
        log_error "PostgreSQL failed to start"
        exit 1
    fi
    sleep 2
done

# Check Redis
for i in {1..30}; do
    if redis-cli -h localhost -p 6380 ping &> /dev/null; then
        log_success "Redis is ready on port 6380"
        break
    fi
    if [[ $i -eq 30 ]]; then
        log_error "Redis failed to start"
        exit 1
    fi
    sleep 2
done

# 6. Install dependencies
log_info "Installing Node.js dependencies..."
npm install

# 7. Setup database
log_info "Setting up database..."
npx prisma generate
npx prisma migrate deploy

# 8. Optional: Seed database
read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Seeding database..."
    npm run seed || log_warning "Seeding failed - continuing anyway"
fi

log_success "🎉 CodRoom development environment is ready!"
echo
log_info "Services running:"
echo "• PostgreSQL: localhost:5433"
echo "• Redis: localhost:6380"
echo
log_info "Next steps:"
echo "1. Start the development servers:"
echo "   npm run dev:all"
echo
echo "2. Open your browser:"
echo "   http://localhost:3000"
echo
echo "3. To stop services later:"
echo "   $DOCKER_COMPOSE -f docker-compose.dev.yml down"
echo
log_info "Optional: Add API keys to .env for full functionality:"
echo "- GROQ_API_KEY for AI evaluation"
echo "- BREVO_API_KEY for email features"