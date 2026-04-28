# 🚀 CodRoom Production Deployment Guide

Complete production-ready setup with full automation, monitoring, and security.

## 🏗️ Infrastructure Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Load Balancer │────▶│  Kubernetes/ECS   │────▶│  PostgreSQL │
│   (ALB/Nginx)   │     │  (Auto-scaling)   │     │  (RDS/HA)   │
└─────────────────┘     └────────┬─────────┘     └─────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   CDN/CloudFlare│     │     Redis        │     │  Monitoring │
│   (Static Assets)│     │  (ElastiCache)   │     │ (Prometheus)│
└─────────────────┘     └──────────────────┘     └─────────────┘
```

## 🚀 Quick Production Setup

### 1. Prerequisites
```bash
# Install required tools
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 2. Environment Setup
```bash
# Copy production environment
cp .env.production .env

# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('INTERNAL_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Update .env with your values
```

### 3. Infrastructure Deployment

#### Option A: AWS with Terraform
```bash
cd terraform
terraform init
terraform plan -var="domain_name=yourdomain.com"
terraform apply
```

#### Option B: Kubernetes
```bash
# Update k8s/production.yaml with your values
kubectl apply -f k8s/production.yaml
```

#### Option C: Railway (Fastest)
```bash
npm install -g @railway/cli
railway login
railway up
```

### 4. Automated Deployment
```bash
# Deploy to staging
./scripts/deploy.sh staging v1.0.0

# Deploy to production
./scripts/deploy.sh production v1.0.0
```

## 🔧 Production Configuration

### Database Setup (PostgreSQL)
```sql
-- Create production database
CREATE DATABASE codroom;
CREATE USER codroom_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE codroom TO codroom_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### Redis Configuration
```redis
# redis.conf production settings
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

### Nginx Configuration
```nginx
upstream codroom_app {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

upstream codroom_socket {
    server socket1:3001;
    server socket2:3001;
}

server {
    listen 443 ssl http2;
    server_name codroom.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/codroom.crt;
    ssl_certificate_key /etc/ssl/private/codroom.key;
    
    location / {
        proxy_pass http://codroom_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name socket.codroom.yourdomain.com;
    
    location / {
        proxy_pass http://codroom_socket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 📊 Monitoring & Observability

### Start Monitoring Stack
```bash
# Start Prometheus, Grafana, and alerting
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: http://localhost:3030 (admin/admin123)
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

### Key Metrics to Monitor
- **Application**: Response time, error rate, throughput
- **Infrastructure**: CPU, memory, disk, network
- **Database**: Connection pool, query performance, locks
- **Redis**: Memory usage, hit rate, connections
- **Business**: Active rooms, concurrent users, AI evaluations

### Alerting Rules
```yaml
# Critical alerts
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 5m
  
- alert: DatabaseConnectionsHigh
  expr: pg_stat_database_numbackends > 80
  for: 2m
  
- alert: RedisMemoryHigh
  expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
  for: 5m
```

## 🔒 Security Hardening

### SSL/TLS Configuration
```bash
# Generate SSL certificate with Let's Encrypt
certbot certonly --webroot -w /var/www/html -d codroom.yourdomain.com -d socket.codroom.yourdomain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Security Headers
```javascript
// Already implemented in middleware
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### Firewall Rules
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
The production pipeline includes:
- ✅ Security scanning (SAST, dependency check)
- ✅ Automated testing with coverage
- ✅ Multi-arch Docker builds
- ✅ Staging deployment with smoke tests
- ✅ Production deployment with health checks
- ✅ Automatic rollback on failure
- ✅ Slack notifications

### Deployment Environments
1. **Development**: Feature branches, auto-deploy to dev environment
2. **Staging**: `develop` branch, full production simulation
3. **Production**: `main` branch and tags, manual approval required

## 📈 Performance Optimization

### Application Level
```javascript
// Already implemented optimizations:
- Connection pooling (Prisma)
- Redis caching and pub/sub
- Circuit breakers for external APIs
- Rate limiting per user/IP
- Code splitting and lazy loading
- Image optimization with Next.js
```

### Infrastructure Level
```yaml
# Kubernetes HPA configuration
spec:
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Optimization
```sql
-- Performance indexes (already in migrations)
CREATE INDEX CONCURRENTLY idx_rooms_status ON rooms(status);
CREATE INDEX CONCURRENTLY idx_interviews_created_at ON interviews(created_at);
CREATE INDEX CONCURRENTLY idx_code_snapshots_interview_id ON code_snapshots(interview_id);
```

## 🔧 Maintenance & Operations

### Backup Strategy
```bash
# Automated daily backups
#!/bin/bash
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://codroom-backups/

# Retention: Keep 30 days, then weekly for 1 year
```

### Log Management
```yaml
# Centralized logging with ELK stack
elasticsearch:
  cluster.name: codroom-logs
  
logstash:
  input:
    beats:
      port: 5044
      
kibana:
  server.host: "0.0.0.0"
  elasticsearch.hosts: ["http://elasticsearch:9200"]
```

### Health Checks
```bash
# Application health endpoint
curl -f https://codroom.yourdomain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": { "status": "healthy", "latency": "12ms" },
    "redis": { "status": "healthy", "latency": "2ms" },
    "socket": { "status": "healthy", "connections": 150 }
  }
}
```

## 🚨 Incident Response

### Runbook for Common Issues

#### High CPU Usage
```bash
# Check top processes
kubectl top pods -n codroom
# Scale up if needed
kubectl scale deployment codroom-app --replicas=6 -n codroom
```

#### Database Connection Issues
```bash
# Check connection pool
kubectl logs deployment/codroom-app -n codroom | grep "connection"
# Restart if needed
kubectl rollout restart deployment/codroom-app -n codroom
```

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli -h $REDIS_HOST ping
# Failover if needed (handled automatically by ElastiCache)
```

### Emergency Contacts
- **On-call Engineer**: +1-xxx-xxx-xxxx
- **DevOps Team**: devops@yourdomain.com
- **Slack Channel**: #codroom-alerts

## 📋 Production Checklist

### Pre-Launch
- [ ] SSL certificates configured and auto-renewing
- [ ] DNS records pointing to load balancer
- [ ] Database backups configured and tested
- [ ] Monitoring and alerting active
- [ ] Security scanning passed
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] Team trained on incident response

### Post-Launch
- [ ] Monitor error rates and performance
- [ ] Verify backup restoration process
- [ ] Test auto-scaling behavior
- [ ] Validate monitoring alerts
- [ ] Review security logs
- [ ] Update documentation

## 🎯 Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Response Time | < 200ms | > 500ms |
| Error Rate | < 0.1% | > 1% |
| Uptime | 99.9% | < 99.5% |
| Database Latency | < 50ms | > 100ms |
| Redis Latency | < 5ms | > 20ms |

## 🔗 Useful Commands

```bash
# View application logs
kubectl logs -f deployment/codroom-app -n codroom

# Scale application
kubectl scale deployment codroom-app --replicas=5 -n codroom

# Update configuration
kubectl edit configmap codroom-config -n codroom

# Database migration
kubectl run migration --image=codroom-app:latest --rm -it -- npx prisma migrate deploy

# Redis CLI access
kubectl exec -it deployment/redis -- redis-cli

# Performance testing
k6 run scripts/load-test.js

# Security scan
docker run --rm -v $(pwd):/app securecodewarrior/docker-security-scan /app
```

Your CodRoom platform is now production-ready with enterprise-grade automation, monitoring, and security! 🚀