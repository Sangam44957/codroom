# 🚀 CodRoom Quick Start Guide

Get CodRoom running in **2 minutes** with zero external dependencies!

## 🎯 Choose Your Setup

### 1. **Development Mode** (Recommended for testing)
```bash
# One command setup - installs everything you need
./setup-dev.sh

# Start development servers
npm run dev:all
```
**Access:** http://localhost:3000

### 2. **Local Production Mode** (Full production simulation)
```bash
# Start production environment locally
./start-production.sh
```
**Access:** http://localhost (load balanced) or http://localhost:3000

### 3. **Cloud Production** (Real deployment)
```bash
# Railway (fastest cloud deployment)
npm install -g @railway/cli
railway login
railway up

# Or use our automated scripts
./scripts/deploy.sh production
```

## 🔧 What Each Setup Includes

| Feature | Development | Local Production | Cloud Production |
|---------|-------------|------------------|------------------|
| **Database** | PostgreSQL | PostgreSQL | Managed PostgreSQL |
| **Cache** | Redis | Redis | Managed Redis |
| **Load Balancer** | ❌ | Nginx | ALB/CloudFlare |
| **SSL** | ❌ | ❌ | ✅ Auto-renewing |
| **Monitoring** | Basic | Full Stack | Enterprise |
| **Auto-scaling** | ❌ | ❌ | ✅ 3-10 pods |
| **Backups** | ❌ | ❌ | ✅ Automated |

## 🎮 Quick Test Drive

After setup, try these features:

1. **Register** a new account
2. **Create a room** with JavaScript
3. **Share the invite link** (open in incognito)
4. **Code together** in real-time
5. **Run code** with test cases
6. **End interview** and get AI report

## 🔑 API Keys (Optional)

Add these to your `.env` for full functionality:

```bash
# AI Code Evaluation
GROQ_API_KEY="gsk_your_key_here"

# Email Features  
BREVO_API_KEY="xkeysib_your_key_here"
BREVO_SENDER_EMAIL="noreply@yourdomain.com"
```

**Get API Keys:**
- Groq: https://console.groq.com/ (Free tier available)
- Brevo: https://app.brevo.com/ (Free 300 emails/day)

## 🚨 Troubleshooting

### Docker Issues
```bash
# Install Docker if missing
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Fix permissions
sudo usermod -aG docker $USER
newgrp docker
```

### Port Conflicts
```bash
# Kill processes on ports 3000, 3001, 5432, 6379
sudo lsof -ti:3000,3001,5432,6379 | xargs kill -9

# Or use different ports in .env
```

### Database Connection
```bash
# Reset database
docker compose -f docker-compose.dev.yml down -v
./setup-dev.sh
```

## 📊 Monitoring (Optional)

Start full monitoring stack:
```bash
# Prometheus + Grafana + Alerting
npm run monitoring:up

# Access dashboards
# Grafana: http://localhost:3030 (admin/admin123)
# Prometheus: http://localhost:9090
```

## 🎯 Next Steps

1. **Customize** the interview problems in `/problems`
2. **Brand** the UI with your colors/logo
3. **Configure** email templates
4. **Set up** your domain and SSL
5. **Deploy** to production

## 💡 Pro Tips

- Use **incognito mode** to test candidate experience
- **Code execution** requires Docker running
- **Video calls** work better with TURN servers
- **AI evaluation** needs Groq API key
- **Email verification** needs Brevo API key

## 🆘 Need Help?

- **Logs:** `docker compose logs -f` or `npm run dev:all`
- **Health:** `curl http://localhost:3000/api/health`
- **Database:** `npx prisma studio` (GUI)
- **Redis:** `redis-cli -h localhost -p 6379`

---

**Ready to conduct amazing technical interviews!** 🎉