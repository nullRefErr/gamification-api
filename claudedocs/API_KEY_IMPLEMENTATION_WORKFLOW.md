# API Key Implementation Workflow

**Source Document**: API_KEY_GUIDE.md
**Strategy**: Systematic Implementation
**Complexity**: Enterprise-Grade
**Est. Duration**: 20-30 hours
**Status**: Ready for Implementation

---

## 📋 Workflow Overview

### Implementation Phases
1. **Phase 1**: Database & Schema (3-4 hours)
2. **Phase 2**: Core Services (5-6 hours)
3. **Phase 3**: Authentication & Security (4-5 hours)
4. **Phase 4**: API Endpoints (4-5 hours)
5. **Phase 5**: Testing & Validation (3-4 hours)
6. **Phase 6**: Documentation & Deployment (1-2 hours)

### Dependencies Graph
```
Phase 1 (Database & Schema)
    ↓
Phase 2 (Core Services)
    ↓
Phase 3 (Authentication & Security) ←→ Phase 4 (API Endpoints)
    ↓
Phase 5 (Testing & Validation)
    ↓
Phase 6 (Documentation & Deployment)
```

---

## 🎯 Phase 1: Database & Schema

**Duration**: 3-4 hours
**Priority**: Critical
**Dependencies**: None

### Tasks

#### 1.1 Create API Key Schema
**File**: `apps/account/src/schemas/api-key.schema.ts`
**Estimated**: 1 hour

```typescript
// Implementation checklist:
- [ ] Create ApiKey schema with Mongoose
- [ ] Define Permission interface
- [ ] Add virtual fields (keyPrefix display)
- [ ] Add instance methods (isExpired, isRevoked, canAccess)
- [ ] Add static methods (findByKey, findActiveKeys)
- [ ] Configure schema options (timestamps, toJSON)
```

**Key Fields**:
- Identity: id, key (hashed), keyPrefix
- Ownership: accountId, name, description
- Permissions: type, permissions[], scopes[]
- Rate limiting: requestsPerMinute, requestsPerDay, requestsPerMonth
- Usage: lastUsedAt, lastUsedIp, usageCount
- Lifecycle: createdAt, expiresAt, revoked, revokedAt, revokedReason
- Security: allowedIps[], allowedDomains[]
- Metadata: flexible metadata object

#### 1.2 Create Database Indexes
**File**: `apps/account/src/schemas/api-key.schema.ts`
**Estimated**: 30 minutes

```javascript
// Required indexes:
- [ ] Unique index: { key: 1 }
- [ ] Query index: { accountId: 1 }
- [ ] Prefix index: { keyPrefix: 1 }
- [ ] TTL index: { expiresAt: 1 } with expireAfterSeconds
- [ ] Active keys: { accountId: 1, revoked: 1 }
- [ ] Usage tracking: { lastUsedAt: 1 }
```

#### 1.3 Create API Key Usage Tracking Schema
**File**: `apps/account/src/schemas/api-key-usage.schema.ts`
**Estimated**: 1 hour

```typescript
// Implementation checklist:
- [ ] Create ApiKeyUsage schema
- [ ] Track: timestamp, endpoint, method, statusCode, responseTime
- [ ] Add ipAddress, userAgent tracking
- [ ] Configure TTL for automatic cleanup (90 days retention)
- [ ] Create indexes for analytics queries
```

#### 1.4 Update Account Module
**File**: `apps/account/src/modules/account.module.ts`
**Estimated**: 30 minutes

```typescript
// Updates:
- [ ] Import ApiKey and ApiKeyUsage schemas
- [ ] Add to MongooseModule.forFeature()
- [ ] Export schemas for use in services
```

**Validation**:
```bash
# Verify schema compilation
npx nx build account --skip-nx-cache
```

---

## 🔧 Phase 2: Core Services

**Duration**: 5-6 hours
**Priority**: Critical
**Dependencies**: Phase 1

### Tasks

#### 2.1 Create API Key Service
**File**: `apps/account/src/services/api-key.service.ts`
**Estimated**: 3 hours

```typescript
// Core methods to implement:
- [ ] generateApiKey(accountId, createDto): Promise<{ key, apiKey }>
  - Generate cryptographically secure key
  - Format: gam_{env}_{type}_{32-char-hex}
  - Hash key with SHA-256
  - Store hashed key in database
  - Return plain key (only once!)

- [ ] findByKey(key: string): Promise<ApiKey>
  - Hash provided key
  - Lookup in database
  - Validate not revoked, not expired
  - Update lastUsedAt timestamp

- [ ] listApiKeys(accountId: string): Promise<ApiKey[]>
  - Return keys without sensitive data
  - Include usage statistics
  - Filter by status (active, revoked, expired)

- [ ] revokeApiKey(keyId: string, reason: string): Promise<void>
  - Set revoked = true
  - Record revokedAt, revokedReason
  - Log security event

- [ ] regenerateApiKey(keyId: string): Promise<{ key, apiKey }>
  - Generate new key
  - Schedule old key revocation (7 days grace period)
  - Return new plain key

- [ ] validatePermissions(key: ApiKey, resource: string, action: string): boolean
  - Check permission matrix
  - Validate scope access

- [ ] checkRateLimit(keyId: string): Promise<boolean>
  - Query usage in time windows
  - Compare against limits
  - Return true if within limits
```

**Dependencies**:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SecurityService } from './security.service';
```

#### 2.2 Create API Key Usage Service
**File**: `apps/account/src/services/api-key-usage.service.ts`
**Estimated**: 2 hours

```typescript
// Tracking methods:
- [ ] trackUsage(keyId, endpoint, metadata): Promise<void>
  - Record API call
  - Store request metadata
  - Async/non-blocking

- [ ] getUsageStats(keyId, period): Promise<UsageStats>
  - Aggregate usage by time period
  - Calculate metrics: total, average, peak
  - Top endpoints analysis
  - Error rate calculation

- [ ] detectAnomalies(keyId): Promise<Anomaly[]>
  - Unusual usage patterns
  - New IP addresses
  - High error rates
  - Spike detection
```

#### 2.3 Update Account Service
**File**: `apps/account/src/services/account.service.ts`
**Estimated**: 30 minutes

```typescript
// Add helper methods:
- [ ] canCreateApiKey(accountId): Promise<boolean>
  - Check subscription tier limits
  - Enforce max keys per account

- [ ] getApiKeyQuota(accountId): Promise<Quota>
  - Return max keys allowed
  - Current key count
```

**Validation**:
```bash
# Test service methods
npx nx test account --testPathPattern=api-key.service
```

---

## 🛡️ Phase 3: Authentication & Security

**Duration**: 4-5 hours
**Priority**: Critical
**Dependencies**: Phase 2

### Tasks

#### 3.1 Create API Key Authentication Guard
**File**: `apps/account/src/guards/api-key-auth.guard.ts`
**Estimated**: 2 hours

```typescript
// Implementation:
- [ ] Extract X-API-Key header
- [ ] Validate key format
- [ ] Lookup and validate key (ApiKeyService)
- [ ] Check expiration and revocation
- [ ] Validate IP whitelist
- [ ] Check rate limits
- [ ] Attach key to request context
- [ ] Log authentication attempt
```

**Guard Logic**:
```typescript
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) return false;

    const key = await this.apiKeyService.findByKey(apiKey);
    if (!key) throw new UnauthorizedException('Invalid API key');

    // Validation checks
    if (key.revoked) throw new UnauthorizedException('API key revoked');
    if (key.isExpired()) throw new UnauthorizedException('API key expired');
    if (!this.validateIp(request.ip, key.allowedIps)) {
      throw new ForbiddenException('IP not allowed');
    }

    // Rate limiting
    const withinLimit = await this.apiKeyService.checkRateLimit(key.id);
    if (!withinLimit) throw new TooManyRequestsException('Rate limit exceeded');

    // Attach to request
    request.apiKey = key;
    request.accountId = key.accountId;

    // Track usage (async)
    this.apiKeyUsageService.trackUsage(key.id, request.url, {...});

    return true;
  }
}
```

#### 3.2 Create API Key Permission Guard
**File**: `apps/account/src/guards/api-key-permission.guard.ts`
**Estimated**: 1.5 hours

```typescript
// Permission validation:
- [ ] Create @RequiresPermission() decorator
- [ ] Extract required permissions from decorator
- [ ] Get API key from request context
- [ ] Validate permissions against key's granted permissions
- [ ] Return 403 if insufficient permissions
```

**Example Usage**:
```typescript
@RequiresPermission({ resource: 'achievements', action: 'write' })
@UseGuards(ApiKeyAuthGuard, ApiKeyPermissionGuard)
@Post('/achievements')
createAchievement() { }
```

#### 3.3 Create Rate Limiter
**File**: `apps/account/src/services/rate-limiter.service.ts`
**Estimated**: 1 hour

```typescript
// Rate limiting implementation:
- [ ] Use Redis for distributed rate limiting
- [ ] Sliding window algorithm
- [ ] Multiple time windows (minute, day, month)
- [ ] Per-key rate limits
- [ ] Return remaining quota in headers
```

**Validation**:
```bash
# Test authentication flow
npx nx test account --testPathPattern=api-key-auth.guard
```

---

## 🔌 Phase 4: API Endpoints

**Duration**: 4-5 hours
**Priority**: High
**Dependencies**: Phases 2, 3

### Tasks

#### 4.1 Create DTOs
**File**: `apps/account/src/dto/api-key.dto.ts`
**Estimated**: 1 hour

```typescript
// DTOs to create:
- [ ] CreateApiKeyDto
  - name, description, type
  - permissions[], scopes[]
  - rateLimit settings
  - expiresAt, allowedIps[], allowedDomains[]

- [ ] UpdateApiKeyDto
  - name, description
  - rateLimit updates
  - allowedIps[], allowedDomains[]

- [ ] RevokeApiKeyDto
  - reason: string

- [ ] ApiKeyResponseDto
  - Transform for safe output
  - Never include full hashed key
  - Include usage stats
```

**Validation**:
```typescript
import { IsString, IsEnum, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
```

#### 4.2 Create API Key Controller
**File**: `apps/account/src/controllers/api-key.controller.ts`
**Estimated**: 3 hours

```typescript
// Endpoints to implement:

- [ ] POST /api/v1/accounts/api-keys
  @UseGuards(JwtAuthGuard)
  async createApiKey(@CurrentAccount() account, @Body() createDto)
  - Validate subscription limits
  - Generate API key
  - Return key (ONLY TIME!)
  - Log security event

- [ ] GET /api/v1/accounts/api-keys
  @UseGuards(JwtAuthGuard)
  async listApiKeys(@CurrentAccount() account, @Query() query)
  - List all keys for account
  - Filter by status
  - Include usage stats
  - Pagination support

- [ ] GET /api/v1/accounts/api-keys/:keyId
  @UseGuards(JwtAuthGuard)
  async getApiKey(@CurrentAccount() account, @Param('keyId') keyId)
  - Get key details
  - Verify ownership
  - Include usage analytics

- [ ] DELETE /api/v1/accounts/api-keys/:keyId
  @UseGuards(JwtAuthGuard)
  async revokeApiKey(@CurrentAccount() account, @Param('keyId') keyId, @Body() revokeDto)
  - Revoke key
  - Record reason
  - Log security event
  - Send notification email

- [ ] POST /api/v1/accounts/api-keys/:keyId/regenerate
  @UseGuards(JwtAuthGuard)
  async regenerateApiKey(@CurrentAccount() account, @Param('keyId') keyId)
  - Generate new key
  - Schedule old key revocation (7 days)
  - Return new key
  - Send notification email

- [ ] GET /api/v1/accounts/api-keys/:keyId/usage
  @UseGuards(JwtAuthGuard)
  async getUsageStats(@CurrentAccount() account, @Param('keyId') keyId, @Query() query)
  - Period filter (7d, 30d, 90d)
  - Usage statistics
  - Top endpoints
  - Error rates
```

**Swagger Documentation**:
```typescript
@ApiTags('API Keys')
@Controller('api/v1/accounts/api-keys')
@ApiBearerAuth()
export class ApiKeyController { }
```

#### 4.3 Update Module Configuration
**File**: `apps/account/src/modules/account.module.ts`
**Estimated**: 30 minutes

```typescript
// Updates:
- [ ] Import ApiKeyController
- [ ] Import ApiKeyService, ApiKeyUsageService, RateLimiterService
- [ ] Import guards (ApiKeyAuthGuard, ApiKeyPermissionGuard)
- [ ] Add to controllers array
- [ ] Add to providers array
- [ ] Export services for gateway integration
```

**Validation**:
```bash
# Test endpoint compilation
npx nx build account --skip-nx-cache

# Test API routes
npx nx serve account
curl http://localhost:3000/api/docs
```

---

## 🧪 Phase 5: Testing & Validation

**Duration**: 3-4 hours
**Priority**: High
**Dependencies**: Phases 1-4

### Tasks

#### 5.1 Unit Tests
**Files**: `apps/account/src/**/*.spec.ts`
**Estimated**: 2 hours

```typescript
// Test suites to create:
- [ ] api-key.service.spec.ts
  - Key generation
  - Key validation
  - Permission checking
  - Rate limiting

- [ ] api-key-usage.service.spec.ts
  - Usage tracking
  - Statistics calculation
  - Anomaly detection

- [ ] api-key-auth.guard.spec.ts
  - Authentication flow
  - Error scenarios
  - IP validation
  - Rate limit enforcement

- [ ] api-key.controller.spec.ts
  - All endpoints
  - Authorization checks
  - Error responses
```

**Test Coverage Target**: >85%

#### 5.2 Integration Tests
**File**: `apps/account/test/api-key.e2e.spec.ts`
**Estimated**: 1.5 hours

```typescript
// E2E test scenarios:
- [ ] Full API key lifecycle
  - Create → Use → Regenerate → Revoke

- [ ] Authentication scenarios
  - Valid key → Success
  - Invalid key → 401
  - Expired key → 401
  - Revoked key → 401
  - Rate limit → 429
  - IP not allowed → 403

- [ ] Permission scenarios
  - Read permission → GET works
  - Write permission → POST works
  - No permission → 403

- [ ] Usage tracking
  - Request counted
  - Statistics accurate
```

#### 5.3 Manual Testing Checklist
**Estimated**: 30 minutes

```bash
# Test checklist:
- [ ] Create API key via POST /api/v1/accounts/api-keys
- [ ] Use key in X-API-Key header
- [ ] List keys GET /api/v1/accounts/api-keys
- [ ] Get usage stats GET /api/v1/accounts/api-keys/:id/usage
- [ ] Regenerate key POST /api/v1/accounts/api-keys/:id/regenerate
- [ ] Revoke key DELETE /api/v1/accounts/api-keys/:id
- [ ] Verify rate limiting works
- [ ] Test IP whitelist
- [ ] Test permission validation
- [ ] Check error responses
```

**Validation**:
```bash
# Run all tests
npx nx test account
npx nx e2e account-e2e

# Check coverage
npx nx test account --codeCoverage
```

---

## 📚 Phase 6: Documentation & Deployment

**Duration**: 1-2 hours
**Priority**: Medium
**Dependencies**: Phase 5

### Tasks

#### 6.1 Update API Documentation
**Files**: Multiple
**Estimated**: 30 minutes

```markdown
# Documentation updates:
- [ ] Update ACCOUNT_SERVICE_IMPLEMENTATION_SUMMARY.md
  - Add API key endpoints (6 new)
  - Update statistics
  - Add security features

- [ ] Update DEPLOYMENT_GUIDE.md
  - Add environment variables
  - API key configuration
  - Redis for rate limiting

- [ ] API_KEY_GUIDE.md status update
  - Change from "Design" to "Implemented"
  - Add production notes
```

#### 6.2 Environment Configuration
**File**: `apps/account/.env.template`
**Estimated**: 15 minutes

```bash
# Add API key configuration:
- [ ] API_KEY_HASH_ALGORITHM=sha256
- [ ] API_KEY_DEFAULT_EXPIRY_DAYS=365
- [ ] API_KEY_GRACE_PERIOD_DAYS=7
- [ ] API_KEY_MAX_KEYS_FREE=3
- [ ] API_KEY_MAX_KEYS_PRO=10
- [ ] API_KEY_MAX_KEYS_ENTERPRISE=50
```

#### 6.3 Swagger Documentation
**Estimated**: 30 minutes

```typescript
// Enhance Swagger docs:
- [ ] Add API key security scheme
- [ ] Document all endpoints
- [ ] Add example requests/responses
- [ ] Document error codes
- [ ] Add rate limit headers
```

**Validation**:
```bash
# Verify Swagger docs
npx nx serve account
open http://localhost:3000/api/docs
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit + integration)
- [ ] Code coverage >85%
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Redis configured for rate limiting
- [ ] MongoDB indexes created

### Deployment Steps
1. **Staging Environment**
   - [ ] Deploy to staging
   - [ ] Run smoke tests
   - [ ] Test API key creation
   - [ ] Verify rate limiting
   - [ ] Test permission system
   - [ ] Monitor for 24 hours

2. **Production Rollout**
   - [ ] Gradual rollout (10% → 50% → 100%)
   - [ ] Monitor error rates
   - [ ] Track API key creation
   - [ ] Monitor rate limit violations
   - [ ] Check performance metrics

3. **Post-Deployment**
   - [ ] Send announcement email to users
   - [ ] Update API documentation portal
   - [ ] Monitor for 7 days
   - [ ] Gather user feedback
   - [ ] Create migration guide (JWT → API key)

---

## 📊 Success Metrics

### Performance Targets
- API key authentication: <50ms latency
- Rate limiter check: <10ms latency
- Key creation: <500ms total time
- Database queries: <100ms

### Quality Targets
- Test coverage: >85%
- Zero critical security issues
- Error rate: <0.1%
- Uptime: >99.9%

### Adoption Targets
- Week 1: 10% of active users create API key
- Month 1: 25% adoption rate
- Month 3: 50% of server-to-server apps using API keys

---

## ⚠️ Risk Management

### Identified Risks

**High Risk**:
1. **Key Leakage**
   - Mitigation: Clear documentation, warnings, security best practices
   - Detection: Monitor for unusual usage patterns

2. **Rate Limit Bypass**
   - Mitigation: Distributed rate limiting with Redis
   - Detection: Monitor for multiple keys from same IP

**Medium Risk**:
1. **Performance Impact**
   - Mitigation: Caching, optimized queries, Redis
   - Monitoring: Track authentication latency

2. **Database Growth**
   - Mitigation: TTL indexes, usage data retention policies
   - Monitoring: Track collection sizes

**Low Risk**:
1. **Adoption Resistance**
   - Mitigation: Gradual rollout, support both JWT and API keys
   - Communication: Clear migration guides

---

## 🔄 Rollback Plan

### Rollback Triggers
- Error rate >5%
- Authentication latency >200ms
- Critical security vulnerability discovered
- Database performance degradation

### Rollback Steps
1. Disable API key authentication guard
2. Fallback to JWT-only authentication
3. Investigate root cause
4. Fix issues in staging
5. Gradual re-rollout

---

## 📅 Implementation Timeline

### Week 1: Core Implementation
- **Days 1-2**: Phase 1 (Database & Schema)
- **Days 3-4**: Phase 2 (Core Services)
- **Day 5**: Phase 3 (Authentication & Security)

### Week 2: API & Testing
- **Days 1-2**: Phase 4 (API Endpoints)
- **Days 3-4**: Phase 5 (Testing & Validation)
- **Day 5**: Phase 6 (Documentation)

### Week 3: Deployment & Monitoring
- **Days 1-2**: Staging deployment & testing
- **Days 3-4**: Production gradual rollout
- **Day 5**: Monitoring & optimization

---

## 🎯 Quick Start Commands

```bash
# Development
npx nx serve account              # Start dev server
npx nx test account --watch       # Run tests in watch mode
npx nx build account              # Build for production

# Testing
npx nx test account               # Run unit tests
npx nx test account --codeCoverage # With coverage
npx nx e2e account-e2e            # Run E2E tests

# Database
npm run migration:create api-keys # Create migration
npm run migration:run             # Run migrations

# Deployment
docker build -t account-service .
docker-compose up -d
kubectl apply -f k8s/
```

---

**Workflow Status**: Ready for Implementation
**Next Action**: Begin Phase 1 - Database & Schema
**Est. Completion**: 2-3 weeks with testing
**Last Updated**: December 7, 2025
