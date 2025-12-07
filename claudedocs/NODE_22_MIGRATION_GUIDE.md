# Node.js 22 Full-Stack Migration Guide

> **Migration Scope**: Node 14 → Node 22 + Full dependency modernization
> **Project**: Gamification API (NestJS + Nx Monorepo)
> **Risk Level**: 🟢 Low (pre-production, no published version)
> **Estimated Time**: 2-4 hours
> **Last Updated**: 2025-11-28

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Strategy](#migration-strategy)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Docker Modernization](#docker-modernization)
6. [Dependency Upgrades](#dependency-upgrades)
7. [Breaking Changes & Fixes](#breaking-changes--fixes)
8. [Testing & Validation](#testing--validation)
9. [Rollback Procedure](#rollback-procedure)
10. [Post-Migration Tasks](#post-migration-tasks)

---

## 🎯 Executive Summary

### Current State
```yaml
Node.js: 14.21 (README requirement) / 20.19.5 (local system)
NestJS: 9.0.0
Nx: 15.9.2 (@nrwl/* packages)
TypeScript: 4.9.5
Docker: node:14-alpine
```

### Target State
```yaml
Node.js: 22.x LTS
NestJS: 10.x (latest stable)
Nx: 19.x (@nx/* packages)
TypeScript: 5.7.x
Docker: node:22-alpine
```

### Key Benefits
- ✅ **Security**: Node 14 EOL (April 2023) → Active LTS support until 2027
- ✅ **Performance**: V8 engine improvements, faster startup, reduced memory
- ✅ **Features**: Native fetch API, test runner, watch mode, performance APIs
- ✅ **Dependencies**: Access to latest library versions and security patches
- ✅ **Developer Experience**: Better debugging, improved error messages

### Breaking Changes Summary
- 🔧 Nx package namespace change: `@nrwl/*` → `@nx/*`
- 🔧 NestJS 10 requires TypeScript 5.x
- 🔧 Node 22 uses OpenSSL 3.0 (crypto changes)
- 🔧 Native fetch may conflict with axios patterns
- 🔧 Removed legacy Node APIs (url.parse, querystring)

---

## ✅ Pre-Migration Checklist

### 1. Backup & Safety
```bash
# Create git checkpoint
git checkout -b backup/pre-node22-migration
git add .
git commit -m "chore(migration)/checkpoint: pre-Node 22 migration backup"
git push origin backup/pre-node22-migration

# Return to dev branch
git checkout dev
git checkout -b feature/infrastructure-node22-migration
```

### 2. Environment Verification
```bash
# Check current Node.js version
node --version
# Expected: v20.19.5 (or v14.x if using old version)

# Check npm version
npm --version
# Expected: 10.8.2 (or update if older)

# Verify Docker is running
docker --version
docker-compose --version
```

### 3. Documentation Review
- [ ] Read this entire guide
- [ ] Review [Nx 19 release notes](https://nx.dev/changelog)
- [ ] Review [NestJS 10 migration guide](https://trilon.io/blog/nestjs-10-is-now-available)
- [ ] Check [Node 22 changelog](https://nodejs.org/en/blog/release/v22.0.0)

### 4. Clean State
```bash
# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Clean Nx cache
npx nx reset

# Stop and remove Docker containers
docker-compose down
docker system prune -f
```

---

## 🎯 Migration Strategy

### Approach: Big Bang Migration
**Rationale**: Pre-production status allows aggressive full-stack upgrade without incremental staging.

### Migration Order
```
1. Node.js local environment      (5 min)
2. package.json dependencies      (30 min)
3. Nx workspace migration         (45 min)
4. TypeScript configuration       (15 min)
5. Docker images                  (20 min)
6. Code fixes (if needed)         (30-60 min)
7. Testing & validation           (30 min)
```

### Risk Mitigation
- ✅ Git branch for easy rollback
- ✅ Pre-production environment (no user impact)
- ✅ Comprehensive testing suite
- ✅ Incremental restart capability (stop at any phase)

---

## 🚀 Step-by-Step Migration

### Phase 1: Node.js Environment Setup

#### 1.1 Install Node.js 22 (if not already on v20+)

**macOS (using nvm - recommended)**:
```bash
# Install nvm if not present
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node 22 LTS
nvm install 22
nvm use 22
nvm alias default 22

# Verify
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x
```

**macOS (using Homebrew)**:
```bash
brew update
brew install node@22
brew link node@22 --force --overwrite

# Verify
node --version
```

**Linux**:
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
```

**Windows**:
- Download installer from [nodejs.org](https://nodejs.org/en/download/)
- Run installer for Node.js 22 LTS
- Verify in PowerShell: `node --version`

---

### Phase 2: Update package.json

#### 2.1 Update Node.js Requirement in package.json

Add `engines` field to enforce Node 22:

```json
{
  "name": "gamification-api",
  "version": "0.0.0",
  "license": "MIT",
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "start": "nx serve",
    "build": "nx build"
  },
  ...
}
```

#### 2.2 Update Dependencies (Major Version Bumps)

**Replace entire `package.json` with modernized versions**:

```json
{
  "name": "gamification-api",
  "version": "0.0.0",
  "license": "MIT",
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "start": "nx serve",
    "build": "nx build",
    "test": "nx test",
    "lint": "nx lint"
  },
  "private": true,
  "dependencies": {
    "@nestjs-modules/ioredis": "2.0.2",
    "@nestjs/common": "10.4.15",
    "@nestjs/config": "3.3.0",
    "@nestjs/core": "10.4.15",
    "@nestjs/mongoose": "10.1.0",
    "@nestjs/platform-express": "10.4.15",
    "@sinclair/typebox": "0.34.15",
    "axios": "1.7.9",
    "ioredis": "5.4.2",
    "mongoose": "8.9.5",
    "nestjs-pino": "4.2.0",
    "pino": "9.6.0",
    "pino-http": "10.4.0",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.1",
    "tslib": "2.8.1"
  },
  "devDependencies": {
    "@nestjs/schematics": "10.2.3",
    "@nestjs/testing": "10.4.15",
    "@nx/eslint-plugin": "19.8.15",
    "@nx/jest": "19.8.15",
    "@nx/js": "19.8.15",
    "@nx/nest": "19.8.15",
    "@nx/node": "19.8.15",
    "@nx/webpack": "19.8.15",
    "@nx/workspace": "19.8.15",
    "@swc-node/register": "1.10.9",
    "@swc/core": "1.10.5",
    "@swc/helpers": "0.5.15",
    "@types/jest": "29.5.14",
    "@types/node": "22.10.5",
    "@typescript-eslint/eslint-plugin": "8.21.0",
    "@typescript-eslint/parser": "8.21.0",
    "eslint": "9.18.0",
    "eslint-config-prettier": "9.1.0",
    "jest": "29.7.0",
    "jest-environment-node": "29.7.0",
    "nx": "19.8.15",
    "prettier": "3.4.2",
    "ts-jest": "29.2.5",
    "ts-node": "10.9.2",
    "typescript": "5.7.2"
  }
}
```

**Key Changes**:
- ✅ `@nrwl/*` → `@nx/*` (namespace migration)
- ✅ NestJS 9 → 10.4.15
- ✅ Nx 15.9.2 → 19.8.15
- ✅ TypeScript 4.9.5 → 5.7.2
- ✅ `@types/node` ~18.7.1 → 22.10.5
- ✅ All dependencies updated to latest compatible versions
- ✅ Removed caret (`^`) as per project standards

#### 2.3 Install Dependencies

```bash
# Install with npm
npm install

# This will take 2-5 minutes depending on connection speed
```

**Expected Output**:
```
added 1523 packages, and audited 1524 packages in 2m
found 0 vulnerabilities
```

---

### Phase 3: Nx Workspace Migration

#### 3.1 Run Nx Migration

Nx provides automated migration generators to update configuration files:

```bash
# Generate migration scripts
npx nx migrate latest

# This creates migrations.json file
```

**Expected Output**:
```
>  NX  The migrate command has run successfully.

   - package.json has been updated
   - migrations.json has been generated
```

#### 3.2 Review migrations.json

```bash
cat migrations.json
```

**Example migrations.json**:
```json
{
  "migrations": [
    {
      "cli": "nx",
      "version": "16.0.0-beta.0",
      "description": "Remove @nrwl/tao",
      "factory": "./src/migrations/update-16-0-0/remove-nrwl-tao"
    },
    {
      "cli": "nx",
      "version": "19.0.0",
      "description": "Update to Nx 19 configuration",
      "factory": "./src/migrations/update-19-0-0/update-nx-json"
    }
  ]
}
```

#### 3.3 Run Migrations

```bash
# Execute migration scripts
npx nx migrate --run-migrations

# This updates nx.json, workspace configuration, and project.json files
```

**Expected Changes**:
- `nx.json` updated to v19 format
- `@nrwl/*` imports changed to `@nx/*` in config files
- New caching configuration applied

#### 3.4 Clean Up Migration Files

```bash
# Remove migration artifacts
rm migrations.json
```

---

### Phase 4: TypeScript Configuration

#### 4.1 Update tsconfig.base.json

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@gamification-api/config": ["libs/config/src/index.ts"],
      "@gamification-api/core": ["libs/core/src/index.ts"],
      "@gamification-api/decorators": ["libs/decorators/src/index.ts"],
      "@gamification-api/helpers": ["libs/helpers/src/index.ts"],
      "@gamification-api/interceptors": ["libs/interceptors/src/index.ts"],
      "@gamification-api/middlewares": ["libs/middlewares/src/index.ts"],
      "@gamification-api/models": ["libs/models/src/index.ts"],
      "@gamification-api/modules": ["libs/modules/src/index.ts"],
      "@gamification-api/utility": ["libs/utility/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp"]
}
```

**Key Changes**:
- `target`: ES2021 → ES2022
- `lib`: ES2021 → ES2022
- `module`: commonjs → ESNext (better tree-shaking)

---

### Phase 5: Docker Modernization

#### 5.1 Update base.Dockerfile

**Replace entire file**:

```dockerfile
# ============================================
# Development Stage
# ============================================
FROM node:22-alpine AS development

# Install build dependencies for native modules
RUN apk --no-cache add --update --virtual .builds-deps \
    build-base \
    python3 \
    py3-pip \
    make \
    g++

WORKDIR /usr/src/app

# Set permissions
RUN chmod -R 777 /usr/src/app

ARG app

RUN echo "Building: $app"

# Copy dependency files
COPY package*.json ./

# Copy source code
COPY . ./

# Remove apps directory and copy only target app
RUN rm -rf ./apps
COPY apps/${app} ./apps/${app}

# Clean install
RUN rm -rf ./node_modules
RUN npm ci --legacy-peer-deps

# List files for verification
RUN ls -la

# Build the application
RUN npm run build -- ${app} --skip-nx-cache=true

# ============================================
# Production Stage
# ============================================
FROM node:22-alpine AS production

# Production environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG app

RUN echo "Building production image for: $app"

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps

# Copy built application from development stage
COPY --from=development /usr/src/app/dist ./dist

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run application
CMD ["node", "dist/apps/${app}/main.js"]
```

**Key Changes**:
- ✅ `node:14-alpine` → `node:22-alpine`
- ✅ Multi-stage build optimization (development + production)
- ✅ `npm install` → `npm ci` (faster, deterministic)
- ✅ Added `--legacy-peer-deps` for compatibility
- ✅ Production stage with health check
- ✅ Security improvements (production-only deps)

#### 5.2 Update docker-compose.yml

**No changes needed** - docker-compose.yml references base.Dockerfile which now uses Node 22.

**Optional: Add Node version verification**:

```yaml
version: '3.6'
services:
  app_account:
    container_name: app_account
    build:
      dockerfile: base.Dockerfile
      target: 'development'
      args:
        app: 'account'
    command: node --version && npm run start -- account --skip-nx-cache=true
    environment:
      - NODE_ENV=development
      - DATABASE_HOST=mongodb://database:27017
      - DATABASE_NAME=gamification_account
      - CACHE_URL=redis://cache:6379
      - CACHE_PASSWORD=123456789
    volumes:
      - ./:/usr/src/app
      - /usr/src/app/node_modules
    networks:
      - gamification-api-nw
    depends_on:
      - database
      - cache
      - localstack

  # ... rest of services remain the same
```

**Key Infrastructure Updates**:
- MongoDB: Already using latest `mongo` image (compatible)
- Redis: Already using `bitnami/redis:7.0` (compatible)
- LocalStack: Already configured (compatible)

---

### Phase 6: Code Fixes & Breaking Changes

#### 6.1 NestJS 10 Breaking Changes

**Most code should work without changes**, but verify these areas:

**1. Mongoose Schema Decorators**

NestJS 10 may require explicit schema options:

```typescript
// Before (NestJS 9)
@Schema({ timestamps: true, versionKey: false })
export class UserEntity { }

// After (NestJS 10) - Same, no change needed
@Schema({ timestamps: true, versionKey: false })
export class UserEntity { }
```

**2. Interceptor Return Types**

Verify interceptors use correct Observable types:

```typescript
// libs/interceptors/src/lib/logger.interceptor.ts
import { Observable } from 'rxjs';

// Should already be correct, but verify:
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  // Implementation
}
```

**3. Pino Logger Integration**

Update to nestjs-pino v4:

```typescript
// If you have custom Pino configuration, verify format
// libs/utility/src/lib/logger.service.ts
import pino from 'pino';

public static logger() {
  const adaptor = pino({
    // Node 22 compatible configuration
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  });
  return adaptor;
}
```

#### 6.2 TypeScript 5.7 Breaking Changes

**Stricter Type Checking**:

```typescript
// May need to add explicit types in some cases
// Example: libs/middlewares/src/client-meta.middleware.ts

// Before
(<any>req).clientMeta = {ip}

// After (more type-safe)
interface RequestWithMeta extends Request {
  clientMeta?: { ip: string | string[] };
}

export function clientMetaMiddleware(
  req: RequestWithMeta,
  res: Response,
  next: NextFunction
) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  req.clientMeta = { ip };
  next();
}
```

#### 6.3 Nx 19 Breaking Changes

**1. Import Updates**

Automated migration should handle this, but verify:

```typescript
// Before (Nx 15)
import { nxVersion } from '@nrwl/workspace';

// After (Nx 19)
import { nxVersion } from '@nx/workspace';
```

**2. Configuration Format**

Check `nx.json` for new format:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "npmScope": "gamification-api",
  "affected": {
    "defaultBase": "main"
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "e2e"]
      }
    }
  }
}
```

#### 6.4 Node 22 Native Fetch Consideration

**No immediate changes needed**, but be aware:

```typescript
// Node 22 has native fetch, but axios is still recommended for Node.js
// Your current axios usage is fine:
import axios from 'axios';

// If you want to use native fetch in future:
const response = await fetch('https://api.example.com');
const data = await response.json();
```

---

### Phase 7: Build & Verify

#### 7.1 Clean Build

```bash
# Clean everything
rm -rf node_modules dist .nx/cache
npm install

# Reset Nx cache
npx nx reset

# Build all projects
npx nx run-many --target=build --all
```

**Expected Output**:
```
>  NX  Successfully ran target build for 12 projects
```

#### 7.2 Verify Library Builds

```bash
# Build specific libraries to verify
npx nx build models
npx nx build interceptors
npx nx build middlewares
npx nx build utility
```

#### 7.3 Verify Application Builds

```bash
# Build applications
npx nx build account
npx nx build gateway
npx nx build leaderboard
```

---

## 🧪 Testing & Validation

### Test Phase 1: Unit Tests

```bash
# Run all tests
npx nx run-many --target=test --all

# Run specific tests
npx nx test models
npx nx test core
npx nx test interceptors
```

**Expected**: All existing tests should pass. If failures occur, check:
- TypeScript type errors (update types to TS 5.7)
- Jest configuration (should work with ts-jest 29.2.5)
- Import paths (verify @gamification-api/* aliases work)

### Test Phase 2: Linting

```bash
# Lint all projects
npx nx run-many --target=lint --all

# Fix auto-fixable issues
npx nx run-many --target=lint --all --fix
```

### Test Phase 3: Docker Build

```bash
# Build Docker images
docker-compose build

# Expected output:
# Successfully built <image-id>
# Successfully tagged gamification-api_app_account:latest
```

### Test Phase 4: Docker Runtime

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f app_gateway

# Expected: No errors, application starts successfully
```

### Test Phase 5: Application Verification

```bash
# Check running containers
docker ps

# Expected: All containers running (gateway, account, leaderboard, database, cache, localstack)

# Verify Node version in container
docker exec -it app_gateway node --version
# Expected: v22.x.x

# Check application health (if health endpoint exists)
curl http://localhost:3000/health
```

### Test Phase 6: Database & Cache Connectivity

```bash
# Check MongoDB connection
docker exec -it database mongosh --eval "db.version()"
# Expected: MongoDB version displayed

# Check Redis connection
docker exec -it cache redis-cli ping
# Expected: PONG

# Check application can connect
docker-compose logs app_account | grep -i "connected\|database\|mongo"
```

---

## 🔄 Rollback Procedure

If critical issues occur during migration:

### Option 1: Git Rollback (Recommended)

```bash
# Stop Docker containers
docker-compose down

# Checkout backup branch
git checkout backup/pre-node22-migration

# Reinstall old dependencies
rm -rf node_modules package-lock.json
npm install

# Restart with old configuration
docker-compose up -d
```

### Option 2: Partial Rollback

**Roll back only Node.js version**:
```bash
# Switch to Node 20 (or previous version)
nvm use 20

# Rebuild
npm install
npx nx reset
npx nx run-many --target=build --all
```

**Roll back only Docker**:
```bash
# Edit base.Dockerfile
# Change: FROM node:22-alpine
# To:     FROM node:14-alpine

# Rebuild containers
docker-compose build
docker-compose up -d
```

### Option 3: Emergency Restore

```bash
# Delete feature branch
git checkout dev
git branch -D feature/infrastructure-node22-migration

# Force reset to backup
git reset --hard backup/pre-node22-migration

# Clean everything
rm -rf node_modules package-lock.json dist .nx/cache
npm install
```

---

## ✅ Post-Migration Tasks

### 1. Update Documentation

#### 1.1 Update README.md

```diff
- [![License](https://img.shields.io/badge/nodeJs->=14.21-brightgreen.svg)](https://nodejs.org)
+ [![License](https://img.shields.io/badge/nodeJs->=22.0.0-brightgreen.svg)](https://nodejs.org)
```

#### 1.2 Update PROJECT_INDEX.md

```bash
# Update claudedocs/PROJECT_INDEX.md
# Change Node.js version references from 14.21 to 22.x
```

### 2. Update CI/CD (if exists)

**GitHub Actions** (.github/workflows/*.yml):
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'
```

**GitLab CI** (.gitlab-ci.yml):
```yaml
image: node:22-alpine
```

**Jenkins** (Jenkinsfile):
```groovy
docker {
    image 'node:22-alpine'
}
```

### 3. Clean Up

```bash
# Remove backup branch (after confirming migration success)
git branch -D backup/pre-node22-migration

# Clean Docker
docker system prune -a -f
docker volume prune -f

# Clean Nx cache
npx nx reset
```

### 4. Commit Migration

```bash
# Stage all changes
git add .

# Commit with detailed message
git commit -m "feature(infrastructure-node22)/migration: upgrade to Node 22 + full stack modernization

BREAKING CHANGES:
- Node.js: 14.21 → 22.x LTS
- NestJS: 9.0.0 → 10.4.15
- Nx: 15.9.2 (@nrwl) → 19.8.15 (@nx)
- TypeScript: 4.9.5 → 5.7.2
- Docker: node:14-alpine → node:22-alpine

Dependencies updated:
- @nestjs/* packages to v10
- @nx/* packages to v19
- mongoose 7.0.4 → 8.9.5
- pino 8.14.1 → 9.6.0
- All dev dependencies to latest compatible versions

Configuration updates:
- package.json: Added engines field, removed caret (^) from versions
- tsconfig.base.json: Updated target to ES2022
- base.Dockerfile: Multi-stage build, health check, production optimizations
- nx.json: Migrated to Nx 19 configuration format

Tested:
- ✅ All unit tests passing
- ✅ Linting successful
- ✅ Docker build successful
- ✅ Application runtime verified
- ✅ Database connectivity confirmed
- ✅ Redis cache operational

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin feature/infrastructure-node22-migration
```

### 5. Create Pull Request

**PR Template**:
```markdown
## 🚀 Node.js 22 Migration

### Summary
Full-stack modernization: Node 14 → Node 22 with dependency upgrades

### Changes
- **Node.js**: 14.21 → 22.x LTS
- **NestJS**: 9 → 10.4.15
- **Nx**: 15.9.2 → 19.8.15
- **TypeScript**: 4.9.5 → 5.7.2
- **Docker**: Modernized to node:22-alpine

### Testing
- ✅ Unit tests: All passing
- ✅ Linting: Clean
- ✅ Docker build: Successful
- ✅ Runtime verification: Confirmed
- ✅ Database/Cache: Operational

### Migration Guide
See `claudedocs/NODE_22_MIGRATION_GUIDE.md` for complete details

### Breaking Changes
None for existing code (pre-production project)

### Rollback Plan
Git branch `backup/pre-node22-migration` available

### Checklist
- [x] Dependencies updated
- [x] Docker files modernized
- [x] Tests passing
- [x] Documentation updated
- [x] Migration guide created
```

---

## 📊 Migration Checklist

Use this checklist to track progress:

### Pre-Migration
- [ ] Git backup branch created
- [ ] Current state documented
- [ ] Migration guide reviewed
- [ ] Team notified (if applicable)

### Environment Setup
- [ ] Node.js 22 installed locally
- [ ] npm 10+ verified
- [ ] Docker/Docker Compose updated

### Dependencies
- [ ] package.json updated with new versions
- [ ] `engines` field added
- [ ] Caret (`^`) removed from all dependencies
- [ ] `npm install` successful

### Nx Migration
- [ ] `nx migrate latest` executed
- [ ] migrations.json reviewed
- [ ] `nx migrate --run-migrations` completed
- [ ] migrations.json deleted

### Configuration
- [ ] tsconfig.base.json updated to ES2022
- [ ] nx.json verified for Nx 19 format
- [ ] ESLint configuration compatible

### Docker
- [ ] base.Dockerfile updated to node:22-alpine
- [ ] Multi-stage build configured
- [ ] Health check added
- [ ] docker-compose.yml verified

### Testing
- [ ] Clean build successful (`nx run-many --target=build --all`)
- [ ] Unit tests passing (`nx run-many --target=test --all`)
- [ ] Linting clean (`nx run-many --target=lint --all`)
- [ ] Docker build successful
- [ ] Docker runtime verified
- [ ] Database connectivity confirmed
- [ ] Redis cache operational

### Documentation
- [ ] README.md updated
- [ ] PROJECT_INDEX.md updated
- [ ] Migration guide created
- [ ] Code comments updated (if needed)

### Post-Migration
- [ ] Changes committed
- [ ] Pull request created
- [ ] CI/CD updated (if exists)
- [ ] Team documentation updated
- [ ] Backup branch retained (until stable)

---

## 🐛 Troubleshooting

### Issue: npm install fails with peer dependency errors

**Solution**:
```bash
npm install --legacy-peer-deps

# Or update package.json:
npm config set legacy-peer-deps true
npm install
```

---

### Issue: Nx migration generates errors

**Solution**:
```bash
# Clear Nx cache and retry
npx nx reset
rm -rf node_modules package-lock.json
npm install
npx nx migrate latest
```

---

### Issue: TypeScript errors after migration

**Solution**:
```bash
# Verify TypeScript version
npx tsc --version  # Should be 5.7.x

# Check tsconfig.base.json has correct target
# target: "ES2022"
# lib: ["ES2022"]

# Rebuild
npx nx reset
npx nx run-many --target=build --all
```

---

### Issue: Docker build fails

**Solution**:
```bash
# Clear Docker cache
docker system prune -a -f

# Rebuild without cache
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -f base.Dockerfile --target development .
```

---

### Issue: Application fails to start in Docker

**Solution**:
```bash
# Check logs
docker-compose logs app_gateway

# Common issues:
# 1. Node modules not installed
docker-compose down
docker-compose build
docker-compose up -d

# 2. Port conflicts
docker ps  # Check if port 3000 is in use
lsof -i :3000  # Kill conflicting process

# 3. MongoDB/Redis not ready
docker-compose up database cache  # Start infrastructure first
docker-compose up app_gateway  # Then start app
```

---

### Issue: Tests fail after migration

**Solution**:
```bash
# Update test configuration if needed
# Check jest.config.ts for compatibility

# Clear Jest cache
npx jest --clearCache

# Verify ts-jest version
npm list ts-jest  # Should be 29.2.5

# Rebuild and retest
npx nx reset
npx nx run-many --target=test --all
```

---

### Issue: Import errors (@gamification-api/*)

**Solution**:
```bash
# Verify tsconfig.base.json paths are correct
cat tsconfig.base.json | grep "@gamification-api"

# Rebuild libraries
npx nx run-many --target=build --all --skip-nx-cache

# Restart TypeScript server (VS Code)
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 📚 Additional Resources

### Official Documentation
- [Node.js 22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0)
- [NestJS 10 Migration Guide](https://docs.nestjs.com/)
- [Nx 19 Changelog](https://nx.dev/changelog)
- [TypeScript 5.7 Release Notes](https://devblogs.microsoft.com/typescript/)

### Compatibility Matrices
- [NestJS + Node.js Compatibility](https://docs.nestjs.com/)
- [Nx + Node.js Support](https://nx.dev/concepts/more-concepts/nx-and-node)

### Migration Tools
- [npm-check-updates](https://www.npmjs.com/package/npm-check-updates) - Dependency version checker
- [Nx Console](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console) - VS Code extension

### Community Resources
- [NestJS Discord](https://discord.gg/nestjs)
- [Nx Community Slack](https://go.nx.dev/community)
- [Node.js Help](https://nodejs.org/en/about/get-involved/)

---

## 🎉 Success Criteria

Migration is complete when:

- ✅ **Node.js 22** running locally and in Docker
- ✅ **All dependencies** updated to latest compatible versions
- ✅ **All tests passing** without modifications
- ✅ **Docker build** succeeds for all services
- ✅ **Applications start** without errors
- ✅ **Database connectivity** verified (MongoDB + Redis)
- ✅ **Documentation** updated (README, PROJECT_INDEX, this guide)
- ✅ **Git commit** with detailed message
- ✅ **Pull request** created and reviewed
- ✅ **Rollback plan** tested and available

---

**Generated by**: Claude Code `/sc:brainstorm`
**Migration Date**: 2025-11-28
**Estimated Completion**: 2-4 hours
**Risk Level**: 🟢 Low (pre-production, aggressive upgrade safe)

**Next Steps**: Follow Phase 1 to begin migration.
