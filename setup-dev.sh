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

# Check if running in project directory
if [[ ! -f "package.json" ]]; then
    log_error "Please run this script from the CodRoom project root directory"
    exit 1
fi

log_info "🚀 Setting up CodRoom for local development..."

# 1. Install Docker Compose if not available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    log_warning "Docker Compose not found. Installing..."
    
    if command -v docker &> /dev/null; then
        log_info "Using Docker Compose V2 (docker compose)"
        DOCKER_COMPOSE="docker compose"
    else
        log_error "Docker is not installed. Please install Docker first:"
        echo "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
        exit 1
    fi
else
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    else
        DOCKER_COMPOSE="docker compose"
    fi
fi

# 2. Setup environment file
if [[ ! -f ".env" ]]; then
    log_info "Creating development environment file..."
    cat > .env << 'EOF'
# Development Environment
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codroom_dev"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/codroom_dev"
REDIS_URL="redis://localhost:6379"
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
    log_success "Created .env file with development settings"
else
    log_info "Using existing .env file"
fi

# 3. Start local services (PostgreSQL + Redis)
log_info "Starting local PostgreSQL and Redis..."

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
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    restart: unless-stopped

volumes:
  postgres_dev_data:
  redis_dev_data:
EOF

$DOCKER_COMPOSE -f docker-compose.dev.yml up -d

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 10

# Check if PostgreSQL is ready
for i in {1..30}; do
    if pg_isready -h localhost -p 5432 -U postgres &> /dev/null; then
        log_success "PostgreSQL is ready"
        break
    fi
    if [[ $i -eq 30 ]]; then
        log_error "PostgreSQL failed to start"
        exit 1
    fi
    sleep 2
done

# Check if Redis is ready
for i in {1..30}; do
    if redis-cli -h localhost -p 6379 ping &> /dev/null; then
        log_success "Redis is ready"
        break
    fi
    if [[ $i -eq 30 ]]; then
        log_error "Redis failed to start"
        exit 1
    fi
    sleep 2
done

# 4. Install dependencies
log_info "Installing Node.js dependencies..."
npm install

# 5. Setup database
log_info "Setting up database..."
npx prisma generate
npx prisma migrate deploy

# Optional: Seed database
read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Seeding database..."
    npm run seed
fi

# 6. Build TypeScript sandbox image
log_info "Building TypeScript sandbox Docker image..."
if command -v docker &> /dev/null; then
    docker build -t codroom-ts -f Dockerfile.sandbox-ts . || log_warning "Failed to build TypeScript sandbox image"
else
    log_warning "Docker not available - TypeScript code execution will not work"
fi

log_success "🎉 CodRoom development environment is ready!"
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