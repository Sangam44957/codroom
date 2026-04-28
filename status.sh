#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 CodRoom Development Status Check${NC}"
echo "=================================="

# Check Next.js App
echo -n "Next.js App (port 3000): "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

# Check Socket.IO Server
echo -n "Socket.IO Server (port 3001): "
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

# Check PostgreSQL
echo -n "PostgreSQL (port 5433): "
if docker exec codroom-postgres-1 pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

# Check Redis
echo -n "Redis (port 6380): "
if docker exec codroom-redis-1 redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

echo ""
echo -e "${BLUE}📊 Database Status:${NC}"
echo -n "Problems seeded: "
PROBLEM_COUNT=$(docker exec codroom-postgres-1 psql -U postgres -d codroom_dev -t -c "SELECT COUNT(*) FROM problems;" 2>/dev/null | xargs)
if [[ "$PROBLEM_COUNT" =~ ^[0-9]+$ ]] && [ "$PROBLEM_COUNT" -gt 0 ]; then
    echo -e "${GREEN}$PROBLEM_COUNT problems${NC}"
else
    echo -e "${YELLOW}No problems found${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "• Main App: http://localhost:3000"
echo "• Socket Server: http://localhost:3001"
echo "• Database: localhost:5433"
echo "• Redis: localhost:6380"

echo ""
echo -e "${BLUE}🛠️ Quick Commands:${NC}"
echo "• View logs: docker compose -f docker-compose.dev.yml logs -f"
echo "• Stop services: docker compose -f docker-compose.dev.yml down"
echo "• Restart: npm run dev:all"
echo "• Database GUI: npx prisma studio"