# Account Service Deployment Guide

**Version**: 1.0.0
**Date**: December 7, 2025
**Service**: Account Microservice

---

## 📋 Prerequisites

### Required Services
- **Node.js**: 22.21.1 or higher
- **MongoDB**: 8.0+ (standalone or MongoDB Atlas)
- **Redis**: 7.0+ (for sessions and caching)
- **SendGrid**: Account with API key (for emails)
- **Stripe**: Account with API keys (for subscriptions)

### Optional Services
- **OAuth Providers**: Client IDs and secrets for Google, Facebook, Apple, Discord, Steam
- **Docker**: For containerized deployment
- **Kubernetes**: For orchestration (optional)

---

## 🔧 Environment Configuration

### 1. Create Environment File

```bash
cp apps/account/.env.template apps/account/.env
```

### 2. Configure Required Variables

```env
# Application
APP_PORT=3000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/gamification?retryWrites=true&w=majority
REDIS_URL=redis://username:password@redis-host:6379

# JWT (CRITICAL - Use strong secrets)
JWT_SECRET=generate-a-strong-random-secret-min-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email - SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your App Name

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900
SESSION_EXPIRY=604800
MAX_SESSIONS_PER_ACCOUNT=10

# Two-Factor Authentication
TOTP_WINDOW=1
BACKUP_CODES_COUNT=10
ENCRYPTION_KEY=generate-another-strong-secret-for-totp-encryption

# Subscription - Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxx

# OAuth (Optional - Configure as needed)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/oauth/google/callback

# Facebook, Apple, Discord, Steam (similar pattern)
# ...
```

---

## 🚀 Deployment Methods

### Method 1: Direct Node.js Deployment

#### Install Dependencies

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build the application
npx nx build account
```

#### Start the Service

```bash
# Production mode
NODE_ENV=production npx nx serve account --prod

# Or use PM2 for process management
pm2 start dist/apps/account/main.js --name account-service
pm2 save
pm2 startup
```

### Method 2: Docker Deployment

#### Create Dockerfile

```dockerfile
# apps/account/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build application
RUN npx nx build account --prod

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist/apps/account ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["node", "main.js"]
```

#### Build and Run

```bash
# Build Docker image
docker build -t account-service:latest -f apps/account/Dockerfile .

# Run container
docker run -d \
  --name account-service \
  -p 3000:3000 \
  --env-file apps/account/.env \
  account-service:latest
```

### Method 3: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:8.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  account-service:
    build:
      context: .
      dockerfile: apps/account/Dockerfile
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://admin:password@mongodb:27017/gamification?authSource=admin
      REDIS_URL: redis://redis:6379
    env_file:
      - apps/account/.env
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

```bash
docker-compose up -d
```

### Method 4: Kubernetes Deployment

#### Create Kubernetes Manifests

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: account-service
  labels:
    app: account-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: account-service
  template:
    metadata:
      labels:
        app: account-service
    spec:
      containers:
      - name: account-service
        image: your-registry/account-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: account-service-secrets
        - configMapRef:
            name: account-service-config
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: account-service
spec:
  selector:
    app: account-service
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

```bash
# Apply manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
```

---

## 🔐 Security Checklist

### Before Production Deployment

- [ ] Change all default secrets and keys
- [ ] Generate strong JWT_SECRET (min 32 characters)
- [ ] Generate strong ENCRYPTION_KEY for TOTP
- [ ] Configure CORS with specific domains (not *)
- [ ] Enable HTTPS/TLS in production
- [ ] Set secure cookie flags
- [ ] Configure rate limiting appropriately
- [ ] Review and test all OAuth callback URLs
- [ ] Configure Stripe webhooks with proper secrets
- [ ] Set up MongoDB authentication and encryption
- [ ] Configure Redis password authentication
- [ ] Review firewall rules and network security groups
- [ ] Set up logging and monitoring
- [ ] Configure backup schedules for MongoDB
- [ ] Test account lockout and security features
- [ ] Review email templates and sender verification

---

## 📊 Health Checks & Monitoring

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/health
# Returns: { status: "ok", timestamp: "...", service: "account-service" }

# Readiness check (includes DB)
curl http://localhost:3000/health/ready
# Returns: { status: "ready", checks: { database: "connected" } }

# Liveness check
curl http://localhost:3000/health/live
# Returns: { status: "alive", uptime: 12345, memory: {...} }

# Metrics (internal)
curl http://localhost:3000/health/metrics
# Returns detailed account and system metrics
```

### Recommended Monitoring Setup

**Application Monitoring**:
- **APM**: New Relic, DataDog, or Elastic APM
- **Logging**: Winston + ELK Stack or CloudWatch
- **Metrics**: Prometheus + Grafana

**Infrastructure Monitoring**:
- **MongoDB**: MongoDB Atlas monitoring or Prometheus exporter
- **Redis**: Redis monitoring or Prometheus exporter
- **Node.js**: PM2 monitoring or Kubernetes metrics

### Key Metrics to Monitor

- Request rate and response times
- Error rates (4xx, 5xx)
- Database connection pool status
- Redis connection status
- Memory and CPU usage
- Active sessions count
- Failed login attempts
- Account creation rate
- Subscription conversion rate

---

## 🔄 Database Migrations & Indexes

### MongoDB Indexes

Indexes are automatically created by Mongoose schemas. Verify with:

```javascript
// Connect to MongoDB
db.accounts.getIndexes()
db.sessions.getIndexes()
db.security_log.getIndexes()
db.verification_tokens.getIndexes()
```

### TTL Indexes (Auto-cleanup)

- **sessions**: Expires based on `expiresAt` field
- **security_log**: Expires after 365 days
- **verification_tokens**: Expires based on `expiresAt` field

---

## 🧪 Testing Before Deployment

### 1. Run All Tests

```bash
# Unit tests
npx nx test account

# Integration tests
npx nx test account --configuration=integration

# E2E tests
npx nx e2e account-e2e
```

### 2. Test Critical Flows

- **Registration** → Email verification → Login
- **Login** → 2FA (if enabled) → Access protected route
- **Password reset** → Email → Token validation → Password change
- **OAuth login** → Link to existing account
- **Subscription** → Stripe checkout → Webhook handling
- **Account deletion** → Grace period → Cancellation

### 3. Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/health

# Using Artillery
artillery quick --count 100 --num 10 http://localhost:3000/api/v1/accounts/login
```

---

## 📈 Scaling Considerations

### Horizontal Scaling

- Use **Redis** for session storage (already configured)
- Enable **sticky sessions** if using multiple instances
- Use **MongoDB replica set** for high availability
- Configure **load balancer** (Nginx, AWS ALB, etc.)

### Vertical Scaling

- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Tune MongoDB connection pool size
- Adjust worker threads for CPU-intensive operations

### Caching Strategy

- **Redis**: Session storage, rate limiting
- **In-Memory**: Application-level caching for frequently accessed data
- **CDN**: Static assets, avatars, email templates

---

## 🚨 Troubleshooting

### Common Issues

**Issue**: Service won't start
- Check environment variables are set correctly
- Verify MongoDB and Redis connections
- Check port 3000 is available
- Review logs for startup errors

**Issue**: Authentication failing
- Verify JWT_SECRET is consistent across instances
- Check session storage in Redis
- Verify MongoDB connection

**Issue**: Emails not sending
- Check SendGrid API key and permissions
- Verify FROM_EMAIL is verified in SendGrid
- Check rate limits and quotas

**Issue**: Stripe webhooks not working
- Verify STRIPE_WEBHOOK_SECRET
- Check webhook endpoint is publicly accessible
- Review Stripe dashboard for webhook delivery logs
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/v1/accounts/subscription/webhook`

---

## 📝 Post-Deployment

### 1. Verify Deployment

```bash
# Check health
curl https://yourdomain.com/health

# Test registration
curl -X POST https://yourdomain.com/api/v1/accounts/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User","acceptTerms":true}'

# Check Swagger docs
open https://yourdomain.com/api/docs
```

### 2. Monitor Logs

```bash
# Docker
docker logs -f account-service

# PM2
pm2 logs account-service

# Kubernetes
kubectl logs -f deployment/account-service
```

### 3. Set Up Alerts

- Database connection failures
- High error rates (>5% of requests)
- High response times (>1s for 95th percentile)
- Failed login spikes (potential attack)
- Webhook delivery failures
- Memory/CPU thresholds

---

## 🔄 Backup & Recovery

### Database Backups

```bash
# MongoDB backup
mongodump --uri="mongodb://..." --out=/backup/$(date +%Y%m%d)

# Automated with cron
0 2 * * * mongodump --uri="mongodb://..." --out=/backup/$(date +%Y%m%d)
```

### Redis Backup

```bash
# Save snapshot
redis-cli SAVE

# Automated persistence
# Configure in redis.conf:
save 900 1
save 300 10
save 60 10000
```

---

## 📞 Support & Maintenance

### Log Locations

- **Application**: `stdout/stderr` or configured log directory
- **MongoDB**: `/var/log/mongodb/mongod.log`
- **Redis**: `/var/log/redis/redis-server.log`
- **Nginx**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

### Maintenance Windows

Recommended for:
- Database migrations
- Major version upgrades
- Schema changes
- Index rebuilds

### Rolling Updates (Zero Downtime)

```bash
# Kubernetes
kubectl set image deployment/account-service account-service=your-registry/account-service:v2

# Docker Compose
docker-compose up -d --no-deps --build account-service
```

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: December 7, 2025
**Maintainer**: Development Team
