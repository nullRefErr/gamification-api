# Node.js 22 Migration Workflow

> **Workflow Type**: Sequential with validation gates
> **Total Duration**: 2-4 hours
> **Parallel Opportunities**: Testing phases can overlap
> **Risk Level**: 🟢 Low
> **Generated**: 2025-11-28

---

## 📋 Workflow Overview

This document provides a **step-by-step execution workflow** for the Node.js 22 migration. Use this alongside the [NODE_22_MIGRATION_GUIDE.md](./NODE_22_MIGRATION_GUIDE.md) for complete implementation.

### Workflow Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    MIGRATION WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 0: Preparation (15 min) ──────────────┐              │
│                                               ▼              │
│  Phase 1: Environment Setup (5 min) ─────────┤              │
│                                               ▼              │
│  Phase 2: Dependencies (30 min) ─────────────┤              │
│                                               ▼              │
│  Phase 3: Nx Migration (45 min) ─────────────┤              │
│                                               ▼              │
│  Phase 4: TypeScript (15 min) ───────────────┤              │
│                                               ▼              │
│  Phase 5: Docker (20 min) ───────────────────┤              │
│                                               ▼              │
│  Phase 6: Code Fixes (30-60 min) ────────────┤              │
│                                               ▼              │
│  Phase 7: Validation (30 min) ───────────────┤              │
│                                               ▼              │
│  Phase 8: Documentation (15 min) ────────────┤              │
│                                               ▼              │
│  Phase 9: Commit & PR (15 min) ──────────────┘              │
│                                                              │
│  [Validation Gates at each phase]                           │
│  [Rollback points marked with 🔄]                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Critical Path Analysis

### Sequential Dependencies
```yaml
Must Complete in Order:
  1. Phase 0 (Preparation) → Enables all subsequent phases
  2. Phase 1 (Environment) → Required for Phase 2
  3. Phase 2 (Dependencies) → Required for Phase 3
  4. Phase 3 (Nx Migration) → Required for Phase 4
  5. Phase 4 (TypeScript) → Required for Phase 6
  6. Phase 5 (Docker) → Independent, can parallel with 3-4
  7. Phase 6 (Code Fixes) → Required for Phase 7
  8. Phase 7 (Validation) → Required for Phase 8-9
```

### Parallel Opportunities
```yaml
Can Execute in Parallel:
  - Phase 5 (Docker) can run while Phase 3-4 execute
  - Testing sub-tasks in Phase 7 can run concurrently
  - Documentation updates in Phase 8 can parallel with final validation
```

---

## 📝 Phase-by-Phase Workflow

### Phase 0: Preparation (15 minutes)

**Objective**: Create safety checkpoints and clean environment

**Tasks**:
1. ✅ **Create Git Backup**
   ```bash
   git checkout -b backup/pre-node22-migration
   git add .
   git commit -m "chore(migration)/checkpoint: pre-Node 22 migration backup"
   git push origin backup/pre-node22-migration
   ```
   **Validation**: Verify backup branch exists remotely
   ```bash
   git branch -a | grep backup/pre-node22-migration
   ```

2. ✅ **Create Feature Branch**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/infrastructure-node22-migration
   ```
   **Validation**: Confirm on feature branch
   ```bash
   git branch --show-current  # Should show: feature/infrastructure-node22-migration
   ```

3. ✅ **Clean Environment**
   ```bash
   rm -rf node_modules package-lock.json
   npx nx reset
   docker-compose down
   docker system prune -f
   ```
   **Validation**: Verify clean state
   ```bash
   ls node_modules 2>/dev/null && echo "❌ FAIL" || echo "✅ PASS"
   docker ps -a | wc -l  # Should be 1 (header only)
   ```

4. ✅ **Environment Check**
   ```bash
   node --version  # Note current version
   npm --version   # Note current version
   docker --version
   docker-compose --version
   ```

**Exit Criteria**:
- [x] Backup branch created and pushed
- [x] Feature branch created
- [x] Environment clean (no node_modules, containers stopped)
- [x] Docker/npm/node versions noted

**Rollback Point** 🔄: N/A (preparation phase)

---

### Phase 1: Environment Setup (5 minutes)

**Objective**: Install Node.js 22 locally

**Tasks**:
1. ✅ **Install Node.js 22** (Choose method based on OS)

   **Option A: nvm (Recommended - macOS/Linux)**
   ```bash
   # Install nvm if needed
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc  # or ~/.zshrc

   # Install Node 22
   nvm install 22
   nvm use 22
   nvm alias default 22
   ```

   **Option B: Homebrew (macOS)**
   ```bash
   brew update
   brew install node@22
   brew link node@22 --force --overwrite
   ```

   **Option C: Direct Download (All OS)**
   - Download from [nodejs.org](https://nodejs.org/en/download/)
   - Run installer for Node.js 22 LTS

2. ✅ **Verify Installation**
   ```bash
   node --version   # Should show v22.x.x
   npm --version    # Should show 10.x.x
   ```

**Exit Criteria**:
- [x] Node.js 22.x installed
- [x] npm 10.x available
- [x] `node --version` outputs v22.x.x

**Validation Gate**:
```bash
# MUST PASS before proceeding
if [[ $(node --version) == v22* ]]; then
  echo "✅ Node 22 installed"
else
  echo "❌ Node 22 NOT installed - STOP and fix"
  exit 1
fi
```

**Rollback Point** 🔄:
```bash
# Switch back to previous Node version
nvm use 20  # or nvm use 14
```

---

### Phase 2: Dependencies Update (30 minutes)

**Objective**: Update package.json with modernized dependencies

**Tasks**:
1. ✅ **Backup Current package.json**
   ```bash
   cp package.json package.json.backup
   ```

2. ✅ **Update package.json**

   **Replace entire contents** with modernized version (see guide section 2.2):

   Key changes to apply:
   - Add `engines` field
   - Update all `@nrwl/*` → `@nx/*`
   - Update NestJS 9 → 10.4.15
   - Update Nx 15.9.2 → 19.8.15
   - Update TypeScript 4.9.5 → 5.7.2
   - Update `@types/node` to 22.10.5
   - Remove all caret (`^`) symbols

   **Quick verification checklist**:
   ```bash
   # After editing package.json, verify key changes:
   grep '"node": ">=22' package.json  # Should find engines field
   grep '@nx/' package.json | wc -l   # Should show multiple @nx packages
   grep '@nrwl/' package.json | wc -l # Should be 0
   grep '\^' package.json | wc -l     # Should be 0 (no carets)
   ```

3. ✅ **Install Dependencies**
   ```bash
   npm install
   ```

   **Expected duration**: 2-5 minutes

   **Common issue**: Peer dependency warnings
   ```bash
   # If errors occur, try:
   npm install --legacy-peer-deps
   ```

4. ✅ **Verify Installation**
   ```bash
   npm list --depth=0
   ```

**Exit Criteria**:
- [x] package.json updated with Node 22 requirements
- [x] `engines` field specifies Node >=22.0.0
- [x] All dependencies installed successfully
- [x] No caret (`^`) symbols in package.json
- [x] `@nrwl/*` packages replaced with `@nx/*`

**Validation Gate**:
```bash
# MUST PASS before proceeding
npm list @nx/workspace 2>/dev/null && echo "✅ Nx 19 installed" || echo "❌ FAIL"
npm list @nestjs/core 2>/dev/null | grep "10\." && echo "✅ NestJS 10 installed" || echo "❌ FAIL"
npm list typescript 2>/dev/null | grep "5\." && echo "✅ TypeScript 5 installed" || echo "❌ FAIL"
```

**Rollback Point** 🔄:
```bash
# Restore original package.json
cp package.json.backup package.json
rm -rf node_modules package-lock.json
npm install
```

**Time Checkpoint**: ~45 minutes elapsed (Prep 15 + Env 5 + Deps 30)

---

### Phase 3: Nx Workspace Migration (45 minutes)

**Objective**: Migrate Nx workspace from v15 to v19

**Tasks**:
1. ✅ **Generate Migration Scripts**
   ```bash
   npx nx migrate latest
   ```

   **Expected output**:
   ```
   >  NX  The migrate command has run successfully.
      - package.json has been updated
      - migrations.json has been generated
   ```

2. ✅ **Review migrations.json**
   ```bash
   cat migrations.json | head -20
   ```

   **Verify**: migrations.json contains update scripts for v16, v17, v18, v19

3. ✅ **Execute Migration Scripts**
   ```bash
   npx nx migrate --run-migrations
   ```

   **Expected duration**: 5-10 minutes

   **What happens**:
   - nx.json updated to v19 format
   - Project configurations updated
   - Import paths changed from `@nrwl/*` to `@nx/*`
   - Cache configuration modernized

4. ✅ **Review Changes**
   ```bash
   git diff nx.json
   git diff tsconfig.base.json
   ```

5. ✅ **Clean Up Migration Files**
   ```bash
   rm migrations.json
   ```

**Exit Criteria**:
- [x] `nx migrate latest` completed successfully
- [x] migrations.json generated and executed
- [x] nx.json updated to v19 format
- [x] No `@nrwl/*` imports in configuration files
- [x] migrations.json deleted

**Validation Gate**:
```bash
# MUST PASS before proceeding
npx nx --version | grep "19\." && echo "✅ Nx 19 active" || echo "❌ FAIL"
grep '@nrwl' nx.json && echo "❌ FAIL: Old @nrwl imports found" || echo "✅ PASS"
npx nx reset  # Clear cache with new version
```

**Rollback Point** 🔄:
```bash
# Restore package.json.backup and reinstall
cp package.json.backup package.json
rm -rf node_modules package-lock.json
npm install
npx nx reset
```

**Time Checkpoint**: ~90 minutes elapsed

---

### Phase 4: TypeScript Configuration (15 minutes)

**Objective**: Update TypeScript to 5.7 and configure for ES2022

**Tasks**:
1. ✅ **Backup tsconfig.base.json**
   ```bash
   cp tsconfig.base.json tsconfig.base.json.backup
   ```

2. ✅ **Update tsconfig.base.json**

   **Key changes**:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",        // Was: ES2021
       "module": "ESNext",         // Was: commonjs (optional)
       "lib": ["ES2022"],          // Was: ES2021
       // ... rest unchanged
     }
   }
   ```

3. ✅ **Verify TypeScript Version**
   ```bash
   npx tsc --version  # Should show 5.7.x
   ```

4. ✅ **Test Compilation**
   ```bash
   npx nx run-many --target=build --all --skip-nx-cache
   ```

   **Expected**: Clean compilation, no TypeScript errors

**Exit Criteria**:
- [x] TypeScript 5.7.x installed
- [x] tsconfig.base.json updated to ES2022
- [x] All projects compile without errors
- [x] No type checking failures

**Validation Gate**:
```bash
# MUST PASS before proceeding
npx tsc --version | grep "^Version 5\." && echo "✅ TypeScript 5.x" || echo "❌ FAIL"
npx nx run-many --target=build --all --skip-nx-cache && echo "✅ Build success" || echo "❌ FAIL"
```

**Rollback Point** 🔄:
```bash
cp tsconfig.base.json.backup tsconfig.base.json
```

**Time Checkpoint**: ~105 minutes elapsed

---

### Phase 5: Docker Modernization (20 minutes)

**Objective**: Update Docker images to Node 22

**Tasks**:
1. ✅ **Backup Dockerfile**
   ```bash
   cp base.Dockerfile base.Dockerfile.backup
   ```

2. ✅ **Update base.Dockerfile**

   **Replace entire file** with modernized version (see guide section 5.1):

   Key changes:
   - `FROM node:14-alpine` → `FROM node:22-alpine`
   - Add multi-stage build (development + production)
   - `npm install` → `npm ci --legacy-peer-deps`
   - Add health check
   - Production optimizations

3. ✅ **Verify Docker Compose**

   docker-compose.yml should work without changes (references base.Dockerfile)

   **Optional**: Add Node version verification to command:
   ```yaml
   command: node --version && npm run start -- account --skip-nx-cache=true
   ```

4. ✅ **Build Docker Images**
   ```bash
   docker-compose build
   ```

   **Expected duration**: 5-10 minutes (first build)

   **Expected output**:
   ```
   Successfully built <image-id>
   Successfully tagged gamification-api_app_account:latest
   Successfully tagged gamification-api_app_gateway:latest
   Successfully tagged gamification-api_app_leaderboard:latest
   ```

5. ✅ **Verify Node Version in Image**
   ```bash
   docker-compose build app_gateway
   docker run --rm gamification-api_app_gateway node --version
   # Should output: v22.x.x
   ```

**Exit Criteria**:
- [x] base.Dockerfile updated to node:22-alpine
- [x] Multi-stage build configured
- [x] Docker images build successfully
- [x] Node 22.x verified in container

**Validation Gate**:
```bash
# MUST PASS before proceeding
docker run --rm gamification-api_app_gateway node --version | grep "v22" && echo "✅ Node 22 in Docker" || echo "❌ FAIL"
```

**Rollback Point** 🔄:
```bash
cp base.Dockerfile.backup base.Dockerfile
docker-compose build
```

**Time Checkpoint**: ~125 minutes elapsed

**Parallel Opportunity** 🔀: Phase 5 can run concurrently with Phase 3-4 if desired.

---

### Phase 6: Code Fixes & Breaking Changes (30-60 minutes)

**Objective**: Fix any breaking changes from upgrades

**Tasks**:
1. ✅ **Run Full Build**
   ```bash
   npx nx reset
   npx nx run-many --target=build --all
   ```

   **Expected**: Most code compiles without changes

   **If errors occur**, categorize them:
   - TypeScript type errors → Fix with explicit types
   - Import path errors → Update to new paths
   - API changes → Consult migration guides

2. ✅ **Check Common Breaking Changes**

   **A. Middleware Type Safety** (libs/middlewares/*)
   ```typescript
   // May need to add explicit types
   interface RequestWithMeta extends Request {
     clientMeta?: { ip: string | string[] };
     reqMeta?: any;
   }

   export function clientMetaMiddleware(
     req: RequestWithMeta,
     res: Response,
     next: NextFunction
   ) { /* ... */ }
   ```

   **B. Pino Logger Configuration** (libs/utility/*)
   ```typescript
   // Verify pino v9 compatibility
   import pino from 'pino';

   public static logger() {
     const adaptor = pino({
       // Node 22 compatible config
     });
     return adaptor;
   }
   ```

   **C. NestJS 10 Decorators** (verify no changes needed)
   ```typescript
   // Should work as-is
   @Schema({ timestamps: true, versionKey: false })
   export class UserEntity { }
   ```

3. ✅ **Fix Any Errors**

   Track fixes made:
   ```bash
   # Create a log of changes
   echo "Code fixes applied:" > migration-fixes.log
   # Document each fix
   ```

4. ✅ **Re-run Build**
   ```bash
   npx nx run-many --target=build --all
   ```

**Exit Criteria**:
- [x] All projects build successfully
- [x] No TypeScript errors
- [x] No runtime import errors
- [x] Breaking changes documented

**Validation Gate**:
```bash
# MUST PASS before proceeding
npx nx run-many --target=build --all && echo "✅ All builds pass" || echo "❌ FAIL - Fix errors before continuing"
```

**Rollback Point** 🔄: Use git to revert code changes if needed

**Time Checkpoint**: ~155-185 minutes elapsed (varies by issues found)

---

### Phase 7: Validation & Testing (30 minutes)

**Objective**: Comprehensive validation across all systems

**Parallel Testing Opportunity** 🔀: Sub-tasks can run concurrently

**Tasks**:

**Sub-Task 7.1: Unit Tests** (10 min)
```bash
npx nx run-many --target=test --all
```

**Expected**: All tests pass
**If failures**: Debug and fix before proceeding

---

**Sub-Task 7.2: Linting** (5 min)
```bash
npx nx run-many --target=lint --all

# Auto-fix if possible
npx nx run-many --target=lint --all --fix
```

---

**Sub-Task 7.3: Docker Runtime** (10 min)
```bash
# Start infrastructure
docker-compose up -d database cache localstack

# Wait for services to be ready (30 seconds)
sleep 30

# Start applications
docker-compose up -d app_account app_gateway app_leaderboard

# Check logs for errors
docker-compose logs --tail=50 app_gateway
docker-compose logs --tail=50 app_account
```

**Verify**:
```bash
# Check all containers running
docker ps | grep -E "gateway|account|leaderboard|database|cache"

# Verify Node version in containers
docker exec app_gateway node --version  # Should be v22.x.x
docker exec app_account node --version   # Should be v22.x.x
```

---

**Sub-Task 7.4: Database Connectivity** (5 min)
```bash
# Check MongoDB
docker exec database mongosh --eval "db.version()"

# Check Redis
docker exec cache redis-cli ping

# Check application logs for connection messages
docker-compose logs app_account | grep -i "connected\|database"
```

---

**Sub-Task 7.5: Application Health** (if health endpoint exists)
```bash
# Test gateway
curl http://localhost:3000/health || echo "No health endpoint (expected)"

# Check application responds
docker-compose logs app_gateway | tail -20
```

**Exit Criteria**:
- [x] All unit tests passing
- [x] Linting clean
- [x] Docker images build and run
- [x] All containers healthy
- [x] Database connectivity confirmed
- [x] Redis connectivity confirmed
- [x] Applications start without errors

**Validation Gate**:
```bash
# MUST ALL PASS
npx nx run-many --target=test --all && echo "✅ Tests pass" || echo "❌ FAIL"
npx nx run-many --target=lint --all && echo "✅ Lint clean" || echo "❌ FAIL"
docker ps | grep -c "Up" | grep -q "6" && echo "✅ All containers up" || echo "❌ FAIL"
docker exec app_gateway node --version | grep -q "v22" && echo "✅ Node 22 in production" || echo "❌ FAIL"
```

**Rollback Point** 🔄: If validation fails, use git rollback or restore from backup branch

**Time Checkpoint**: ~185-215 minutes elapsed

---

### Phase 8: Documentation Updates (15 minutes)

**Objective**: Update project documentation to reflect changes

**Tasks**:
1. ✅ **Update README.md**
   ```bash
   # Edit README.md
   # Change Node.js badge from >=14.21 to >=22.0.0
   ```

   ```diff
   - [![License](https://img.shields.io/badge/nodeJs->=14.21-brightgreen.svg)](https://nodejs.org)
   + [![License](https://img.shields.io/badge/nodeJs->=22.0.0-brightgreen.svg)](https://nodejs.org)
   ```

2. ✅ **Update claudedocs/PROJECT_INDEX.md**

   Update technology stack section:
   ```diff
   ### Technology Stack
   - **Framework**: NestJS 9.x → NestJS 10.x
   - **Monorepo**: Nx 15.9.2 → Nx 19.8.15
   - **Runtime**: Node.js ≥14.21 → Node.js ≥22.0.0
   - **Language**: TypeScript 4.9.5 → TypeScript 5.7.2
   ```

3. ✅ **Update Any Other Version References**
   ```bash
   # Search for version references
   grep -r "14.21" claudedocs/
   grep -r "Node 14" claudedocs/
   grep -r "NestJS 9" claudedocs/
   grep -r "Nx 15" claudedocs/

   # Update found references
   ```

4. ✅ **Create Migration Summary** (optional)

   Add summary to claudedocs/PROJECT_INDEX.md or README.md:
   ```markdown
   ## Recent Updates

   **2025-11-28**: Node.js 22 Migration
   - Upgraded from Node 14 to Node 22 LTS
   - Updated NestJS 9 → 10, Nx 15 → 19, TypeScript 4.9 → 5.7
   - Modernized Docker images and dependencies
   - See [NODE_22_MIGRATION_GUIDE.md](claudedocs/NODE_22_MIGRATION_GUIDE.md)
   ```

**Exit Criteria**:
- [x] README.md updated with Node 22 requirement
- [x] PROJECT_INDEX.md updated with new versions
- [x] All version references consistent
- [x] Migration documented

**Time Checkpoint**: ~200-230 minutes elapsed

---

### Phase 9: Commit & Pull Request (15 minutes)

**Objective**: Create comprehensive commit and PR

**Tasks**:
1. ✅ **Stage All Changes**
   ```bash
   git add .
   ```

2. ✅ **Review Changes**
   ```bash
   git status
   git diff --staged --stat
   ```

3. ✅ **Create Detailed Commit**
   ```bash
   git commit -m "feature(infrastructure-node22)/migration: upgrade to Node 22 + full stack modernization

   BREAKING CHANGES:
   - Node.js: 14.21 → 22.x LTS
   - NestJS: 9.0.0 → 10.4.15
   - Nx: 15.9.2 (@nrwl) → 19.8.15 (@nx)
   - TypeScript: 4.9.5 → 5.7.2
   - Docker: node:14-alpine → node:22-alpine

   Dependencies updated:
   - @nestjs/* packages to v10
   - @nx/* packages to v19 (namespace change @nrwl → @nx)
   - mongoose 7.0.4 → 8.9.5
   - pino 8.14.1 → 9.6.0
   - ioredis 5.3.2 → 5.4.2
   - All dev dependencies to latest compatible versions

   Configuration updates:
   - package.json: Added engines field, removed caret (^) from versions
   - tsconfig.base.json: Updated target to ES2022
   - base.Dockerfile: Multi-stage build, health check, production optimizations
   - nx.json: Migrated to Nx 19 configuration format

   Testing completed:
   - ✅ All unit tests passing
   - ✅ Linting successful
   - ✅ Docker build successful
   - ✅ Application runtime verified
   - ✅ Database connectivity confirmed
   - ✅ Redis cache operational

   Migration guide: claudedocs/NODE_22_MIGRATION_GUIDE.md
   Workflow documentation: claudedocs/MIGRATION_WORKFLOW.md

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

4. ✅ **Push to Remote**
   ```bash
   git push origin feature/infrastructure-node22-migration
   ```

5. ✅ **Create Pull Request**

   **PR Title**: `Node.js 22 Migration + Full Stack Modernization`

   **PR Description**:
   ```markdown
   ## 🚀 Node.js 22 Migration

   ### Summary
   Full-stack modernization: Node 14 → Node 22 with comprehensive dependency upgrades

   ### Changes
   - **Node.js**: 14.21 → 22.x LTS (active support until 2027)
   - **NestJS**: 9.0.0 → 10.4.15
   - **Nx**: 15.9.2 → 19.8.15 (@nrwl/* → @nx/*)
   - **TypeScript**: 4.9.5 → 5.7.2
   - **Docker**: node:14-alpine → node:22-alpine
   - **Dependencies**: All updated to latest compatible versions

   ### Benefits
   - ✅ Security: Active LTS support (Node 14 was EOL April 2023)
   - ✅ Performance: V8 engine improvements, faster startup
   - ✅ Features: Native fetch, test runner, modern APIs
   - ✅ Developer Experience: Better debugging, error messages

   ### Testing
   - ✅ Unit tests: All passing (nx test)
   - ✅ Linting: Clean (nx lint)
   - ✅ Docker build: Successful
   - ✅ Runtime verification: Confirmed
   - ✅ Database/Cache: Operational

   ### Documentation
   - [Migration Guide](claudedocs/NODE_22_MIGRATION_GUIDE.md) - Complete step-by-step guide
   - [Migration Workflow](claudedocs/MIGRATION_WORKFLOW.md) - Execution workflow
   - README.md - Updated Node.js requirement
   - PROJECT_INDEX.md - Updated technology stack

   ### Breaking Changes
   None for existing code (pre-production project v0.0.0)

   ### Rollback Plan
   - Git branch `backup/pre-node22-migration` available
   - Rollback procedures documented in migration guide

   ### Checklist
   - [x] Dependencies updated and installed
   - [x] Docker files modernized
   - [x] Nx workspace migrated to v19
   - [x] TypeScript configuration updated
   - [x] All tests passing
   - [x] Linting clean
   - [x] Docker runtime verified
   - [x] Documentation updated
   - [x] Migration guide created
   - [x] Workflow documentation created

   ### Time Investment
   - Actual time: ~3 hours
   - Estimated time: 2-4 hours ✅

   ### Review Notes
   This is a comprehensive modernization with no production impact (v0.0.0). All validation gates passed successfully.
   ```

**Exit Criteria**:
- [x] All changes committed
- [x] Commit message detailed and follows conventions
- [x] Changes pushed to remote
- [x] Pull request created with complete description
- [x] Backup branch available for rollback

**Time Checkpoint**: ~215-245 minutes elapsed (Total: **3-4 hours** ✅)

---

## ✅ Validation Checklist

Use this master checklist to verify completion:

### Pre-Migration
- [ ] Backup branch created (`backup/pre-node22-migration`)
- [ ] Feature branch created (`feature/infrastructure-node22-migration`)
- [ ] Environment cleaned (no node_modules, containers stopped)
- [ ] Current versions documented

### Environment
- [ ] Node.js 22.x installed
- [ ] npm 10.x verified
- [ ] `node --version` shows v22.x.x

### Dependencies
- [ ] package.json updated (all @nrwl → @nx, versions bumped)
- [ ] `engines` field added
- [ ] All caret (^) symbols removed
- [ ] `npm install` successful
- [ ] Key packages verified (Nx 19, NestJS 10, TS 5.7)

### Nx Migration
- [ ] `nx migrate latest` executed
- [ ] migrations.json generated
- [ ] `nx migrate --run-migrations` completed
- [ ] nx.json updated to v19 format
- [ ] migrations.json deleted
- [ ] Nx cache cleared

### TypeScript
- [ ] tsconfig.base.json updated (ES2022 target)
- [ ] TypeScript 5.7.x verified
- [ ] All projects compile successfully

### Docker
- [ ] base.Dockerfile updated (node:22-alpine)
- [ ] Multi-stage build configured
- [ ] Docker images build successfully
- [ ] Node 22 verified in containers

### Code
- [ ] Full build successful (all projects)
- [ ] Breaking changes fixed (if any)
- [ ] No TypeScript errors
- [ ] No import errors

### Testing
- [ ] Unit tests passing (`nx test`)
- [ ] Linting clean (`nx lint`)
- [ ] Docker runtime successful
- [ ] All containers running
- [ ] Database connectivity verified
- [ ] Redis connectivity verified

### Documentation
- [ ] README.md updated (Node >=22.0.0)
- [ ] PROJECT_INDEX.md updated (versions)
- [ ] All version references consistent
- [ ] Migration documented

### Git
- [ ] All changes staged
- [ ] Detailed commit created
- [ ] Changes pushed to remote
- [ ] Pull request created
- [ ] Backup branch retained

---

## 🔄 Rollback Procedures

### Full Rollback
```bash
# Stop everything
docker-compose down
npx nx reset

# Switch to backup
git checkout backup/pre-node22-migration

# Clean and restore
rm -rf node_modules package-lock.json
npm install

# Verify old versions
node --version  # Should show pre-migration version
docker-compose build
```

### Partial Rollback (Dependencies Only)
```bash
cp package.json.backup package.json
rm -rf node_modules package-lock.json
npm install
npx nx reset
```

### Partial Rollback (Docker Only)
```bash
cp base.Dockerfile.backup base.Dockerfile
docker-compose build
```

---

## 📊 Success Metrics

Migration is **complete and successful** when:

- ✅ All validation gates passed
- ✅ All checklist items marked complete
- ✅ Zero test failures
- ✅ Zero linting errors
- ✅ Docker containers running Node 22
- ✅ Applications operational
- ✅ Database/Cache connected
- ✅ Documentation updated
- ✅ Pull request created
- ✅ Backup available for rollback

---

## 🎯 Quick Command Reference

**Phase 0 - Preparation**:
```bash
git checkout -b backup/pre-node22-migration && git add . && git commit -m "backup" && git push origin backup/pre-node22-migration
git checkout dev && git checkout -b feature/infrastructure-node22-migration
rm -rf node_modules package-lock.json && npx nx reset && docker-compose down && docker system prune -f
```

**Phase 1 - Environment**:
```bash
nvm install 22 && nvm use 22 && nvm alias default 22
node --version  # Verify v22.x.x
```

**Phase 2 - Dependencies**:
```bash
cp package.json package.json.backup
# Edit package.json (use guide section 2.2)
npm install
```

**Phase 3 - Nx Migration**:
```bash
npx nx migrate latest
npx nx migrate --run-migrations
rm migrations.json
npx nx reset
```

**Phase 4 - TypeScript**:
```bash
cp tsconfig.base.json tsconfig.base.json.backup
# Edit tsconfig.base.json (target: ES2022)
npx tsc --version  # Verify 5.7.x
npx nx run-many --target=build --all
```

**Phase 5 - Docker**:
```bash
cp base.Dockerfile base.Dockerfile.backup
# Replace base.Dockerfile (use guide section 5.1)
docker-compose build
```

**Phase 6 - Code Fixes**:
```bash
npx nx reset
npx nx run-many --target=build --all
# Fix any errors
```

**Phase 7 - Validation**:
```bash
npx nx run-many --target=test --all
npx nx run-many --target=lint --all
docker-compose up -d
docker ps
```

**Phase 8 - Documentation**:
```bash
# Update README.md, PROJECT_INDEX.md
grep -r "14.21" claudedocs/  # Find version references
```

**Phase 9 - Commit**:
```bash
git add .
git commit -m "feature(infrastructure-node22)/migration: upgrade to Node 22..."
git push origin feature/infrastructure-node22-migration
```

---

**Generated by**: Claude Code `/sc:workflow`
**Source**: [NODE_22_MIGRATION_GUIDE.md](./NODE_22_MIGRATION_GUIDE.md)
**Total Phases**: 10 (0-9)
**Estimated Duration**: 2-4 hours
**Complexity**: Moderate (well-documented, pre-production safety)
