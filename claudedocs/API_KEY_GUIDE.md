# API Key Management Guide

**Version**: 1.0.0
**Date**: December 7, 2025
**Status**: Design Document (Not Yet Implemented)

---

## 📋 Overview

This document outlines the design and best practices for API key management in the Gamification API platform. API keys enable secure server-to-server communication and third-party integrations.

**Current Status**: ⚠️ API key functionality is not yet implemented. This document serves as a design specification and future implementation guide.

---

## 🎯 Use Cases

### When to Use API Keys

✅ **Server-to-Server Communication**
- Backend services calling Gamification API
- Microservice authentication
- Scheduled jobs and background tasks
- Third-party integrations

✅ **Long-Lived Applications**
- Mobile apps (with caution, see security notes)
- Desktop applications
- CLI tools
- Automated scripts

❌ **When NOT to Use API Keys**

- Client-side web applications (use JWT tokens instead)
- User-facing authentication (use OAuth or JWT)
- Short-lived sessions (use session tokens)

---

## 🔑 API Key Format

### Key Structure
```
gam_{environment}_{random_string}

Examples:
gam_live_sk_1234567890abcdef1234567890abcdef
gam_test_sk_abcdef1234567890abcdef1234567890
```

### Components

| Component | Description | Example |
|-----------|-------------|---------|
| Prefix | Always `gam_` | `gam_` |
| Environment | `live` or `test` | `live` |
| Type | `sk` (secret key) or `pk` (public key) | `sk` |
| Random String | 32-character hex string | `1234567890abcdef...` |

### Key Types

**Secret Keys (`sk_`)**:
- Full API access
- Never expose in client-side code
- Store securely on server

**Public Keys (`pk_`)**:
- Read-only access
- Can be used in client-side code (with restrictions)
- Limited permissions

---

## 📊 Proposed Database Schema

### API Key Document Structure

```typescript
interface ApiKey {
  // Identity
  id: string;                    // key_1234567890
  key: string;                   // Hashed API key (SHA-256)
  keyPrefix: string;             // First 8 chars for identification

  // Ownership
  accountId: string;             // Owner account ID
  name: string;                  // Descriptive name
  description?: string;          // Optional description

  // Permissions
  type: 'secret' | 'public';     // Key type
  permissions: Permission[];     // Scoped permissions
  scopes: string[];             // API scopes (read, write, admin)

  // Rate Limiting
  rateLimit: {
    requestsPerMinute: number;   // Rate limit
    requestsPerDay: number;      // Daily limit
    requestsPerMonth: number;    // Monthly limit
  };

  // Usage Tracking
  lastUsedAt?: Date;             // Last usage timestamp
  lastUsedIp?: string;           // Last source IP
  usageCount: number;            // Total usage count

  // Lifecycle
  createdAt: Date;               // Creation timestamp
  expiresAt?: Date;              // Optional expiration
  revoked: boolean;              // Revocation status
  revokedAt?: Date;              // Revocation timestamp
  revokedReason?: string;        // Revocation reason

  // Security
  allowedIps?: string[];         // IP whitelist
  allowedDomains?: string[];     // Domain whitelist

  // Metadata
  metadata?: Record<string, any>; // Custom metadata
}

interface Permission {
  resource: string;              // Resource type (users, achievements, etc.)
  actions: string[];             // Allowed actions (read, write, delete)
}
```

### Indexes

```javascript
// Unique index on hashed key
db.api_keys.createIndex({ key: 1 }, { unique: true });

// Query by account
db.api_keys.createIndex({ accountId: 1 });

// Find by prefix (for display)
db.api_keys.createIndex({ keyPrefix: 1 });

// Auto-cleanup expired keys
db.api_keys.createIndex({ expiresAt: 1 }, {
  expireAfterSeconds: 0,
  partialFilterExpression: { expiresAt: { $exists: true } }
});

// Find active keys
db.api_keys.createIndex({ accountId: 1, revoked: 1 });
```

---

## 🛡️ Security Best Practices

### 1. Key Storage

**✅ DO**:
```bash
# Environment variables
export GAMIFICATION_API_KEY="gam_live_sk_xxx"

# .env files (never commit!)
GAMIFICATION_API_KEY=gam_live_sk_xxx

# Secret management services
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
# - Google Cloud Secret Manager
```

**❌ DON'T**:
```javascript
// NEVER hardcode in source code
const apiKey = "gam_live_sk_1234..."; // ❌ BAD

// NEVER commit to git
// config.json with API keys // ❌ BAD

// NEVER expose in client-side code
<script>
  const key = "gam_live_sk_..."; // ❌ BAD
</script>
```

### 2. Key Rotation

**Recommended Schedule**:
- Production keys: Rotate every 90 days
- Development keys: Rotate every 180 days
- Compromised keys: Revoke immediately

**Rotation Process**:
1. Generate new API key
2. Update application configuration
3. Test new key functionality
4. Monitor for errors
5. Revoke old key after grace period (7-30 days)

### 3. Access Control

**Principle of Least Privilege**:
```javascript
// ✅ Good: Minimal permissions
{
  permissions: [
    { resource: 'achievements', actions: ['read'] },
    { resource: 'leaderboards', actions: ['read'] }
  ]
}

// ❌ Bad: Excessive permissions
{
  permissions: [
    { resource: '*', actions: ['*'] }  // Full access
  ]
}
```

**IP Whitelisting**:
```javascript
{
  allowedIps: [
    '203.0.113.10',      // Production server
    '198.51.100.5'       // Backup server
  ]
}
```

### 4. Rate Limiting

**Default Limits** (Proposed):
```javascript
{
  rateLimit: {
    requestsPerMinute: 60,    // 1 req/second
    requestsPerDay: 10000,    // ~7 req/minute average
    requestsPerMonth: 300000  // ~10K/day average
  }
}
```

**Tier-Based Limits**:
- **Free tier**: 60 req/min, 10K req/day
- **Pro tier**: 300 req/min, 100K req/day
- **Enterprise tier**: 1000 req/min, 1M req/day, custom limits

---

## 🔌 Proposed API Endpoints

### Key Management

```typescript
// Create API Key
POST /api/v1/accounts/api-keys
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request:
{
  "name": "Production Server",
  "description": "Main production environment",
  "type": "secret",
  "permissions": [
    { "resource": "achievements", "actions": ["read", "write"] },
    { "resource": "leaderboards", "actions": ["read"] }
  ],
  "rateLimit": {
    "requestsPerMinute": 100,
    "requestsPerDay": 50000
  },
  "expiresAt": "2026-12-07T00:00:00Z",
  "allowedIps": ["203.0.113.10"]
}

Response:
{
  "id": "key_abc123",
  "key": "gam_live_sk_1234567890abcdef1234567890abcdef",
  "keyPrefix": "gam_live",
  "name": "Production Server",
  "type": "secret",
  "permissions": [...],
  "createdAt": "2025-12-07T10:00:00Z",
  "expiresAt": "2026-12-07T00:00:00Z",
  "warning": "This is the only time you will see the full API key. Store it securely."
}

// List API Keys
GET /api/v1/accounts/api-keys
Authorization: Bearer {jwt_token}

Response:
{
  "keys": [
    {
      "id": "key_abc123",
      "keyPrefix": "gam_live",
      "name": "Production Server",
      "type": "secret",
      "lastUsedAt": "2025-12-07T09:30:00Z",
      "usageCount": 1523,
      "createdAt": "2025-12-07T10:00:00Z",
      "expiresAt": "2026-12-07T00:00:00Z",
      "revoked": false
    }
  ],
  "total": 1
}

// Revoke API Key
DELETE /api/v1/accounts/api-keys/:keyId
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request:
{
  "reason": "Key compromised - rotating to new key"
}

Response:
{
  "message": "API key has been revoked",
  "id": "key_abc123",
  "revokedAt": "2025-12-07T11:00:00Z"
}

// Regenerate API Key
POST /api/v1/accounts/api-keys/:keyId/regenerate
Authorization: Bearer {jwt_token}

Response:
{
  "id": "key_abc123",
  "key": "gam_live_sk_newkey1234567890abcdef1234567890",
  "keyPrefix": "gam_live",
  "regeneratedAt": "2025-12-07T11:05:00Z",
  "warning": "Old key will be revoked in 7 days"
}

// Get API Key Usage Statistics
GET /api/v1/accounts/api-keys/:keyId/usage
Authorization: Bearer {jwt_token}
Query: ?period=30d

Response:
{
  "keyId": "key_abc123",
  "period": "30d",
  "totalRequests": 125340,
  "averageRequestsPerDay": 4178,
  "peakRequestsPerMinute": 87,
  "topEndpoints": [
    { "endpoint": "/api/v1/achievements", "count": 45230 },
    { "endpoint": "/api/v1/leaderboards", "count": 38120 }
  ],
  "errorRate": 0.02,
  "lastUsedAt": "2025-12-07T09:30:00Z"
}
```

---

## 🚀 Usage Examples

### 1. Node.js / Express

```javascript
// .env file
GAMIFICATION_API_KEY=gam_live_sk_1234567890abcdef1234567890abcdef
GAMIFICATION_API_URL=https://api.gamification.com

// config.js
require('dotenv').config();

module.exports = {
  apiKey: process.env.GAMIFICATION_API_KEY,
  apiUrl: process.env.GAMIFICATION_API_URL
};

// api-client.js
const axios = require('axios');
const config = require('./config');

class GamificationClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async getAchievements(userId) {
    try {
      const response = await this.client.get(`/api/v1/achievements/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('Invalid API key');
      } else if (error.response?.status === 429) {
        console.error('Rate limit exceeded');
      }
      throw error;
    }
  }

  async createAchievement(userId, achievementData) {
    const response = await this.client.post(
      `/api/v1/achievements/${userId}`,
      achievementData
    );
    return response.data;
  }
}

module.exports = new GamificationClient();
```

### 2. Python / FastAPI

```python
# config.py
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('GAMIFICATION_API_KEY')
API_URL = os.getenv('GAMIFICATION_API_URL', 'https://api.gamification.com')

# api_client.py
import httpx
from typing import Dict, Any
from config import API_KEY, API_URL

class GamificationClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=API_URL,
            headers={
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        )

    async def get_achievements(self, user_id: str) -> Dict[str, Any]:
        try:
            response = await self.client.get(f'/api/v1/achievements/{user_id}')
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise ValueError('Invalid API key')
            elif e.response.status_code == 429:
                raise ValueError('Rate limit exceeded')
            raise

    async def create_achievement(
        self,
        user_id: str,
        achievement_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        response = await self.client.post(
            f'/api/v1/achievements/{user_id}',
            json=achievement_data
        )
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self.client.aclose()

# Usage
async def main():
    client = GamificationClient()
    try:
        achievements = await client.get_achievements('user_123')
        print(achievements)
    finally:
        await client.close()
```

### 3. cURL Examples

```bash
# Get achievements
curl -X GET https://api.gamification.com/api/v1/achievements/user_123 \
  -H "X-API-Key: gam_live_sk_1234567890abcdef1234567890abcdef" \
  -H "Content-Type: application/json"

# Create achievement
curl -X POST https://api.gamification.com/api/v1/achievements/user_123 \
  -H "X-API-Key: gam_live_sk_1234567890abcdef1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "First Login",
    "description": "Logged in for the first time",
    "points": 100
  }'

# Get leaderboard
curl -X GET "https://api.gamification.com/api/v1/leaderboards/global?limit=10" \
  -H "X-API-Key: gam_live_sk_1234567890abcdef1234567890abcdef"
```

---

## 🔒 Authentication Flow

### API Key Authentication

```
Client                          API Gateway                     Service
  |                                  |                              |
  |  Request + X-API-Key header      |                              |
  |--------------------------------->|                              |
  |                                  |                              |
  |                                  | 1. Extract API key           |
  |                                  | 2. Hash key (SHA-256)        |
  |                                  | 3. Lookup in database        |
  |                                  |                              |
  |                                  | 4. Validate:                 |
  |                                  |    - Not revoked             |
  |                                  |    - Not expired             |
  |                                  |    - IP allowed              |
  |                                  |    - Rate limit OK           |
  |                                  |                              |
  |                                  | 5. Check permissions         |
  |                                  |                              |
  |                                  | 6. Forward request           |
  |                                  |----------------------------->|
  |                                  |                              |
  |                                  |        Response              |
  |                                  |<-----------------------------|
  |                                  |                              |
  |          Response                | 7. Update usage stats        |
  |<---------------------------------|                              |
  |                                  |                              |
```

### Error Responses

```javascript
// Invalid API key
HTTP 401 Unauthorized
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}

// Revoked key
HTTP 401 Unauthorized
{
  "error": "API key has been revoked",
  "code": "REVOKED_API_KEY",
  "revokedAt": "2025-12-07T11:00:00Z"
}

// Expired key
HTTP 401 Unauthorized
{
  "error": "API key has expired",
  "code": "EXPIRED_API_KEY",
  "expiresAt": "2025-12-07T00:00:00Z"
}

// Rate limit exceeded
HTTP 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 60,
  "remaining": 0,
  "resetAt": "2025-12-07T10:01:00Z"
}

// Insufficient permissions
HTTP 403 Forbidden
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["achievements:write"],
  "granted": ["achievements:read"]
}

// IP not allowed
HTTP 403 Forbidden
{
  "error": "Request from unauthorized IP address",
  "code": "IP_NOT_ALLOWED",
  "sourceIp": "198.51.100.10",
  "allowedIps": ["203.0.113.10", "198.51.100.5"]
}
```

---

## 📊 Monitoring & Alerting

### Key Metrics to Monitor

**Usage Metrics**:
- Request rate per API key
- Error rate per API key
- Top endpoints by API key
- Geographic distribution

**Security Metrics**:
- Failed authentication attempts
- Rate limit violations
- Unusual usage patterns
- Requests from new IPs

**Performance Metrics**:
- Authentication latency
- Database lookup time
- Rate limiter performance

### Recommended Alerts

```yaml
alerts:
  high_error_rate:
    condition: error_rate > 5%
    window: 5 minutes
    action: notify_owner

  rate_limit_exceeded:
    condition: rate_limit_violations > 10
    window: 1 hour
    action: notify_owner

  suspicious_usage:
    condition: requests_from_new_ip AND usage_spike > 200%
    window: 5 minutes
    action: auto_revoke_and_notify

  key_expiring_soon:
    condition: expires_in < 7 days
    action: notify_owner

  unused_key:
    condition: last_used > 90 days
    action: notify_owner
```

---

## 🧪 Testing API Keys

### Test Environment

```bash
# Use test API keys in development
GAMIFICATION_API_KEY=gam_test_sk_test1234567890abcdef1234567890

# Test key features:
# - Lower rate limits for testing
# - Shorter expiration times
# - Easy revocation
# - Sandbox data only
```

### Testing Checklist

- [ ] Valid API key authentication
- [ ] Invalid API key rejection
- [ ] Expired key rejection
- [ ] Revoked key rejection
- [ ] Rate limiting enforcement
- [ ] Permission validation
- [ ] IP whitelist validation
- [ ] Usage tracking accuracy
- [ ] Error handling
- [ ] Key rotation process

---

## 📋 Implementation Checklist

When implementing API key functionality, ensure:

### Backend
- [ ] API key schema and database indexes
- [ ] Key generation service (cryptographically secure)
- [ ] Key hashing (SHA-256) before storage
- [ ] Authentication middleware
- [ ] Permission validation system
- [ ] Rate limiting implementation
- [ ] Usage tracking and analytics
- [ ] Key lifecycle management (create, revoke, regenerate)
- [ ] IP/domain whitelisting
- [ ] Audit logging

### API Endpoints
- [ ] POST /api/v1/accounts/api-keys (create)
- [ ] GET /api/v1/accounts/api-keys (list)
- [ ] GET /api/v1/accounts/api-keys/:id (get details)
- [ ] DELETE /api/v1/accounts/api-keys/:id (revoke)
- [ ] POST /api/v1/accounts/api-keys/:id/regenerate
- [ ] GET /api/v1/accounts/api-keys/:id/usage

### Security
- [ ] Secure key generation (crypto.randomBytes)
- [ ] Key hashing before storage
- [ ] HTTPS enforcement
- [ ] Rate limiting per key
- [ ] IP whitelisting support
- [ ] Automatic key rotation reminders
- [ ] Compromised key detection

### Monitoring
- [ ] Usage analytics dashboard
- [ ] Rate limit monitoring
- [ ] Security event logging
- [ ] Alerting system
- [ ] Key expiration notifications

### Documentation
- [ ] API reference
- [ ] Integration guides
- [ ] Security best practices
- [ ] Migration guide (JWT to API key)
- [ ] Troubleshooting guide

---

## 🔄 Migration Strategy

### Migrating from JWT to API Keys

**Phase 1: Preparation**
1. Implement API key system
2. Test in staging environment
3. Create migration documentation

**Phase 2: Gradual Rollout**
1. Enable both JWT and API key authentication
2. Notify users about API key option
3. Provide migration guides

**Phase 3: Migration**
1. Encourage API key adoption
2. Monitor usage patterns
3. Support both methods for 90 days

**Phase 4: Deprecation** (Optional)
1. Announce JWT deprecation timeline
2. Force migration for high-volume users
3. Sunset JWT authentication

---

## 📚 Additional Resources

### Reference Documentation
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Rate Limiting Strategies](https://stripe.com/docs/rate-limits)

### Similar Implementations
- Stripe API Keys
- GitHub Personal Access Tokens
- AWS Access Keys
- SendGrid API Keys

---

**Document Status**: Design/Planning
**Next Steps**: Implementation of API key system
**Last Updated**: December 7, 2025
