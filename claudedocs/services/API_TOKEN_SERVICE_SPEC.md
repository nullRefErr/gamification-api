# API Token Service Specification

## Service Overview

The API Token Service manages authentication and authorization tokens for the gamification platform, enabling secure programmatic access for game developers, client applications, and internal services. It provides multi-level token types, scope-based permissions, rate limiting, and comprehensive audit trails.

### Responsibilities

- **Token Lifecycle Management**: Creation, rotation, revocation, expiration
- **Authentication**: Verify and validate API tokens, JWT tokens, service tokens
- **Authorization**: Scope-based permissions, client isolation, role-based access
- **Rate Limiting**: Token-specific rate limits and quota management
- **Audit Trail**: Token usage tracking, security event logging
- **Multi-tenancy**: Client/tenant isolation and token segregation
- **Security**: Token hashing, encryption, secure storage, breach detection
- **Integration**: Authentication middleware for all gamification services

### Token Types

| Token Type | Use Case | Lifespan | Revocable | Scopes |
|------------|----------|----------|-----------|--------|
| **API Key** | Server-to-server, SDK integration | Long-lived (no expiry) | Yes | Full or limited |
| **JWT Token** | User sessions, temporary access | Short-lived (15m-24h) | Via blacklist | User-specific |
| **Service Token** | Internal microservice communication | Medium-lived (7-30d) | Yes | Service-specific |
| **Webhook Token** | Webhook signature validation | Long-lived | Yes | Webhook-only |
| **Test Token** | Development and testing | Configurable | Yes | Sandbox-only |

### Technology Stack

- **Framework**: NestJS 10.4.15
- **Database**: MongoDB 8.0+ (tokens), Redis 7.0+ (blacklist, rate limits)
- **Security**: bcrypt (hashing), crypto (encryption), helmet (HTTP security)
- **JWT**: jsonwebtoken, passport-jwt
- **Rate Limiting**: @nestjs/throttler, Redis
- **Audit**: Winston logger, MongoDB change streams

---

## API Specification

### Token Management Endpoints

#### 1. Create API Key
```http
POST /api/v1/tokens/api-keys
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "name": "Production Game Server",
  "clientId": "client_game1",
  "scopes": [
    "player:read",
    "player:write",
    "achievement:read",
    "achievement:write",
    "leaderboard:read"
  ],
  "rateLimit": {
    "requestsPerMinute": 1000,
    "requestsPerDay": 100000
  },
  "ipWhitelist": ["203.0.113.0/24", "198.51.100.50"],
  "expiresAt": null,
  "metadata": {
    "environment": "production",
    "server": "game-server-01"
  }
}
```

**Response** (201 Created):
```json
{
  "apiKey": {
    "id": "key_1234567890",
    "name": "Production Game Server",
    "clientId": "client_game1",
    "key": "gapi_live_1234567890abcdef1234567890abcdef1234567890abcdef",
    "keyPrefix": "gapi_live_123456",
    "scopes": [
      "player:read",
      "player:write",
      "achievement:read",
      "achievement:write",
      "leaderboard:read"
    ],
    "rateLimit": {
      "requestsPerMinute": 1000,
      "requestsPerDay": 100000
    },
    "ipWhitelist": ["203.0.113.0/24", "198.51.100.50"],
    "status": "active",
    "createdAt": "2025-11-30T10:00:00Z",
    "lastUsedAt": null,
    "expiresAt": null
  },
  "warning": "This API key will only be shown once. Store it securely."
}
```

#### 2. List API Keys
```http
GET /api/v1/tokens/api-keys
Authorization: Bearer {accountToken}
Query: ?clientId=client_game1&status=active&page=1&limit=20
```

**Response** (200 OK):
```json
{
  "apiKeys": [
    {
      "id": "key_1234567890",
      "name": "Production Game Server",
      "clientId": "client_game1",
      "keyPrefix": "gapi_live_123456",
      "scopes": ["player:read", "player:write", "achievement:read"],
      "status": "active",
      "createdAt": "2025-11-30T10:00:00Z",
      "lastUsedAt": "2025-12-03T15:30:00Z",
      "usageCount": 45678,
      "expiresAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### 3. Get API Key Details
```http
GET /api/v1/tokens/api-keys/{keyId}
Authorization: Bearer {accountToken}
```

**Response** (200 OK):
```json
{
  "apiKey": {
    "id": "key_1234567890",
    "name": "Production Game Server",
    "clientId": "client_game1",
    "keyPrefix": "gapi_live_123456",
    "scopes": [
      "player:read",
      "player:write",
      "achievement:read",
      "achievement:write",
      "leaderboard:read"
    ],
    "rateLimit": {
      "requestsPerMinute": 1000,
      "requestsPerDay": 100000,
      "currentMinute": 234,
      "currentDay": 45678
    },
    "ipWhitelist": ["203.0.113.0/24", "198.51.100.50"],
    "status": "active",
    "createdAt": "2025-11-30T10:00:00Z",
    "lastUsedAt": "2025-12-03T15:30:00Z",
    "usageCount": 45678,
    "expiresAt": null,
    "metadata": {
      "environment": "production",
      "server": "game-server-01"
    }
  },
  "usage": {
    "last24Hours": 12345,
    "last7Days": 67890,
    "last30Days": 234567
  }
}
```

#### 4. Update API Key
```http
PATCH /api/v1/tokens/api-keys/{keyId}
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "name": "Production Game Server (Updated)",
  "scopes": [
    "player:read",
    "player:write",
    "achievement:read",
    "achievement:write",
    "leaderboard:read",
    "quest:read"
  ],
  "rateLimit": {
    "requestsPerMinute": 2000,
    "requestsPerDay": 200000
  },
  "ipWhitelist": ["203.0.113.0/24", "198.51.100.50", "192.0.2.100"]
}
```

**Response** (200 OK):
```json
{
  "apiKey": {
    "id": "key_1234567890",
    "name": "Production Game Server (Updated)",
    "scopes": [
      "player:read",
      "player:write",
      "achievement:read",
      "achievement:write",
      "leaderboard:read",
      "quest:read"
    ],
    "rateLimit": {
      "requestsPerMinute": 2000,
      "requestsPerDay": 200000
    },
    "ipWhitelist": ["203.0.113.0/24", "198.51.100.50", "192.0.2.100"],
    "updatedAt": "2025-12-03T16:00:00Z"
  }
}
```

#### 5. Rotate API Key
```http
POST /api/v1/tokens/api-keys/{keyId}/rotate
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "revokeOldKey": false,
  "gracePeriod": 86400
}
```

**Response** (200 OK):
```json
{
  "newApiKey": {
    "id": "key_9876543210",
    "name": "Production Game Server (Updated)",
    "clientId": "client_game1",
    "key": "gapi_live_9876543210fedcba9876543210fedcba9876543210fedcba",
    "keyPrefix": "gapi_live_987654",
    "scopes": ["player:read", "player:write", "achievement:read"],
    "status": "active",
    "createdAt": "2025-12-03T16:05:00Z"
  },
  "oldApiKey": {
    "id": "key_1234567890",
    "keyPrefix": "gapi_live_123456",
    "status": "active",
    "expiresAt": "2025-12-04T16:05:00Z"
  },
  "warning": "The new API key will only be shown once. The old key will remain active until 2025-12-04T16:05:00Z."
}
```

#### 6. Revoke API Key
```http
DELETE /api/v1/tokens/api-keys/{keyId}
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "reason": "Compromised key",
  "note": "Key was accidentally committed to public repository"
}
```

**Response** (200 OK):
```json
{
  "apiKey": {
    "id": "key_1234567890",
    "keyPrefix": "gapi_live_123456",
    "status": "revoked",
    "revokedAt": "2025-12-03T16:10:00Z",
    "revokedBy": "acc_admin_123",
    "reason": "Compromised key",
    "note": "Key was accidentally committed to public repository"
  },
  "message": "API key has been revoked and is no longer valid"
}
```

---

### JWT Token Endpoints

#### 7. Create JWT Token
```http
POST /api/v1/tokens/jwt
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "accountId": "acc_123456",
  "playerId": "player_1234567890",
  "clientId": "client_game1",
  "scopes": ["player:read", "player:write"],
  "expiresIn": "24h",
  "metadata": {
    "sessionId": "session_abc123",
    "deviceId": "device_xyz789"
  }
}
```

**Response** (201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJhY2NfMTIzNDU2IiwicGxheWVySWQiOiJwbGF5ZXJfMTIzNDU2Nzg5MCIsImNsaWVudElkIjoiY2xpZW50X2dhbWUxIiwic2NvcGVzIjpbInBsYXllcjpyZWFkIiwicGxheWVyOndyaXRlIl0sImlhdCI6MTcwMTM1MDQwMCwiZXhwIjoxNzAxNDM2ODAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "expiresAt": "2025-12-04T16:15:00Z",
  "scopes": ["player:read", "player:write"]
}
```

#### 8. Validate JWT Token
```http
POST /api/v1/tokens/jwt/validate
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "valid": true,
  "decoded": {
    "accountId": "acc_123456",
    "playerId": "player_1234567890",
    "clientId": "client_game1",
    "scopes": ["player:read", "player:write"],
    "iat": 1701350400,
    "exp": 1701436800
  },
  "expiresAt": "2025-12-04T16:15:00Z",
  "expiresIn": 82800
}
```

#### 9. Refresh JWT Token
```http
POST /api/v1/tokens/jwt/refresh
Authorization: Bearer {expiredOrValidToken}
Content-Type: application/json

{
  "expiresIn": "24h"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newTokenPayload.newSignature",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "expiresAt": "2025-12-05T16:20:00Z",
  "scopes": ["player:read", "player:write"]
}
```

#### 10. Revoke JWT Token (Blacklist)
```http
POST /api/v1/tokens/jwt/revoke
Authorization: Bearer {tokenToRevoke}
Content-Type: application/json

{
  "reason": "User logout"
}
```

**Response** (200 OK):
```json
{
  "revoked": true,
  "tokenId": "jti_abc123xyz",
  "expiresAt": "2025-12-04T16:15:00Z",
  "reason": "User logout",
  "message": "Token has been blacklisted and is no longer valid"
}
```

---

### Service Token Endpoints

#### 11. Create Service Token
```http
POST /api/v1/tokens/service
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "serviceName": "achievement-service",
  "scopes": [
    "player:read",
    "player:write",
    "points:write",
    "notification:write"
  ],
  "expiresIn": "30d",
  "allowedServices": ["player-service", "points-service", "notification-service"]
}
```

**Response** (201 Created):
```json
{
  "serviceToken": {
    "id": "svc_token_1234567890",
    "serviceName": "achievement-service",
    "token": "gsvc_1234567890abcdef1234567890abcdef1234567890abcdef",
    "tokenPrefix": "gsvc_123456",
    "scopes": [
      "player:read",
      "player:write",
      "points:write",
      "notification:write"
    ],
    "allowedServices": ["player-service", "points-service", "notification-service"],
    "status": "active",
    "createdAt": "2025-12-03T16:25:00Z",
    "expiresAt": "2026-01-02T16:25:00Z"
  },
  "warning": "This service token will only be shown once. Store it securely in your service configuration."
}
```

#### 12. List Service Tokens
```http
GET /api/v1/tokens/service
Authorization: Bearer {adminToken}
Query: ?status=active&page=1&limit=20
```

**Response** (200 OK):
```json
{
  "serviceTokens": [
    {
      "id": "svc_token_1234567890",
      "serviceName": "achievement-service",
      "tokenPrefix": "gsvc_123456",
      "scopes": ["player:read", "player:write", "points:write"],
      "status": "active",
      "createdAt": "2025-12-03T16:25:00Z",
      "lastUsedAt": "2025-12-03T16:30:00Z",
      "expiresAt": "2026-01-02T16:25:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

---

### Webhook Token Endpoints

#### 13. Create Webhook Token
```http
POST /api/v1/tokens/webhook
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "name": "Player Level Up Webhook",
  "clientId": "client_game1",
  "webhookUrl": "https://api.mygame.com/webhooks/level-up",
  "events": ["player.level_up", "achievement.unlocked"],
  "secret": "webhook_secret_auto_generated_or_custom"
}
```

**Response** (201 Created):
```json
{
  "webhookToken": {
    "id": "whook_1234567890",
    "name": "Player Level Up Webhook",
    "clientId": "client_game1",
    "webhookUrl": "https://api.mygame.com/webhooks/level-up",
    "events": ["player.level_up", "achievement.unlocked"],
    "signingSecret": "whsec_1234567890abcdef1234567890abcdef",
    "status": "active",
    "createdAt": "2025-12-03T16:35:00Z"
  },
  "warning": "The signing secret will only be shown once. Use it to validate webhook signatures."
}
```

#### 14. Verify Webhook Signature
```http
POST /api/v1/tokens/webhook/verify
Content-Type: application/json

{
  "webhookId": "whook_1234567890",
  "payload": "{\"event\":\"player.level_up\",\"playerId\":\"player_123\"}",
  "signature": "t=1701350400,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd",
  "timestamp": 1701350400
}
```

**Response** (200 OK):
```json
{
  "valid": true,
  "webhookId": "whook_1234567890",
  "timestamp": 1701350400,
  "age": 125,
  "message": "Webhook signature is valid"
}
```

---

### Authentication Endpoints

#### 15. Authenticate Request
```http
POST /api/v1/tokens/authenticate
Content-Type: application/json

{
  "token": "gapi_live_1234567890abcdef1234567890abcdef1234567890abcdef",
  "requestedScopes": ["player:read", "achievement:read"],
  "ipAddress": "203.0.113.50",
  "userAgent": "GameSDK/2.1.0"
}
```

**Response** (200 OK):
```json
{
  "authenticated": true,
  "tokenType": "api_key",
  "clientId": "client_game1",
  "scopes": ["player:read", "player:write", "achievement:read", "achievement:write"],
  "grantedScopes": ["player:read", "achievement:read"],
  "rateLimit": {
    "limit": 1000,
    "remaining": 756,
    "reset": 1701350460
  }
}
```

#### 16. Check Token Permissions
```http
POST /api/v1/tokens/check-permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "resource": "player",
  "action": "write",
  "resourceId": "player_1234567890"
}
```

**Response** (200 OK):
```json
{
  "allowed": true,
  "resource": "player",
  "action": "write",
  "scope": "player:write",
  "reason": "Token has player:write scope"
}
```

---

### Rate Limiting Endpoints

#### 17. Get Rate Limit Status
```http
GET /api/v1/tokens/rate-limit/{keyId}
Authorization: Bearer {accountToken}
```

**Response** (200 OK):
```json
{
  "keyId": "key_1234567890",
  "rateLimit": {
    "requestsPerMinute": 1000,
    "requestsPerDay": 100000
  },
  "current": {
    "minute": {
      "used": 234,
      "remaining": 766,
      "resetAt": "2025-12-03T16:41:00Z"
    },
    "day": {
      "used": 45678,
      "remaining": 54322,
      "resetAt": "2025-12-04T00:00:00Z"
    }
  }
}
```

#### 18. Update Rate Limit
```http
PATCH /api/v1/tokens/rate-limit/{keyId}
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "requestsPerMinute": 2000,
  "requestsPerDay": 200000
}
```

**Response** (200 OK):
```json
{
  "keyId": "key_1234567890",
  "rateLimit": {
    "requestsPerMinute": 2000,
    "requestsPerDay": 200000
  },
  "updatedAt": "2025-12-03T16:45:00Z"
}
```

---

### Audit & Analytics Endpoints

#### 19. Get Token Usage Analytics
```http
GET /api/v1/tokens/{keyId}/analytics
Authorization: Bearer {accountToken}
Query: ?startDate=2025-11-01&endDate=2025-12-03&granularity=day
```

**Response** (200 OK):
```json
{
  "keyId": "key_1234567890",
  "period": {
    "startDate": "2025-11-01T00:00:00Z",
    "endDate": "2025-12-03T23:59:59Z"
  },
  "totalRequests": 3456789,
  "successfulRequests": 3398765,
  "failedRequests": 58024,
  "errorRate": 0.0168,
  "timeline": [
    {
      "date": "2025-11-01",
      "requests": 98765,
      "success": 97234,
      "errors": 1531
    },
    {
      "date": "2025-11-02",
      "requests": 102345,
      "success": 100876,
      "errors": 1469
    }
  ],
  "topEndpoints": [
    {
      "endpoint": "/api/v1/players/{playerId}",
      "requests": 876543,
      "percentage": 25.35
    },
    {
      "endpoint": "/api/v1/achievements/{playerId}",
      "requests": 654321,
      "percentage": 18.92
    }
  ],
  "errorBreakdown": {
    "401": 12345,
    "403": 8765,
    "429": 23456,
    "500": 13458
  }
}
```

#### 20. Get Security Events
```http
GET /api/v1/tokens/{keyId}/security-events
Authorization: Bearer {accountToken}
Query: ?eventType=unauthorized_access&severity=high&page=1&limit=20
```

**Response** (200 OK):
```json
{
  "keyId": "key_1234567890",
  "securityEvents": [
    {
      "id": "event_1234567890",
      "type": "unauthorized_access",
      "severity": "high",
      "timestamp": "2025-12-03T14:30:00Z",
      "ipAddress": "198.51.100.200",
      "endpoint": "/api/v1/admin/players",
      "reason": "IP address not in whitelist",
      "action": "blocked"
    },
    {
      "id": "event_9876543210",
      "type": "rate_limit_exceeded",
      "severity": "medium",
      "timestamp": "2025-12-03T12:15:00Z",
      "ipAddress": "203.0.113.50",
      "endpoint": "/api/v1/players/search",
      "reason": "Exceeded 1000 requests per minute",
      "action": "throttled"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "pages": 3
  }
}
```

#### 21. Get Audit Log
```http
GET /api/v1/tokens/audit-log
Authorization: Bearer {accountToken}
Query: ?action=create&resourceType=api_key&startDate=2025-11-01&page=1&limit=20
```

**Response** (200 OK):
```json
{
  "auditLogs": [
    {
      "id": "audit_1234567890",
      "action": "create",
      "resourceType": "api_key",
      "resourceId": "key_1234567890",
      "actorId": "acc_123456",
      "actorType": "account",
      "timestamp": "2025-11-30T10:00:00Z",
      "ipAddress": "203.0.113.50",
      "userAgent": "Mozilla/5.0...",
      "changes": {
        "name": "Production Game Server",
        "scopes": ["player:read", "player:write"]
      }
    },
    {
      "id": "audit_9876543210",
      "action": "rotate",
      "resourceType": "api_key",
      "resourceId": "key_1234567890",
      "actorId": "acc_123456",
      "actorType": "account",
      "timestamp": "2025-12-03T16:05:00Z",
      "ipAddress": "203.0.113.50",
      "changes": {
        "oldKeyId": "key_1234567890",
        "newKeyId": "key_9876543210"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

---

## Database Design

### MongoDB Collections

#### 1. ApiKeys Collection

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'api_keys', timestamps: true })
export class ApiKey extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string; // key_1234567890

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ required: true, index: true })
  clientId: string;

  @Prop({ required: true, unique: true })
  keyHash: string; // bcrypt hash of the key

  @Prop({ required: true, index: true })
  keyPrefix: string; // First 13 chars for identification

  @Prop({ type: Array, required: true })
  scopes: string[]; // ['player:read', 'player:write']

  @Prop({ type: Object })
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };

  @Prop({ type: Array, default: [] })
  ipWhitelist: string[]; // CIDR notation

  @Prop({ default: 'active', enum: ['active', 'revoked', 'expired'] })
  status: string;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop()
  expiresAt?: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedBy?: string;

  @Prop()
  revokedReason?: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Indexes
ApiKeySchema.index({ accountId: 1, clientId: 1 }); // List keys by account + client
ApiKeySchema.index({ status: 1, expiresAt: 1 }); // Cleanup expired keys
ApiKeySchema.index({ keyPrefix: 1 }); // Quick prefix lookup
ApiKeySchema.index({ createdAt: -1 }); // Recent keys
```

#### 2. JwtTokens Collection (Blacklist)

```typescript
@Schema({ collection: 'jwt_blacklist', timestamps: true })
export class JwtBlacklist extends Document {
  @Prop({ required: true, unique: true, index: true })
  jti: string; // JWT ID

  @Prop({ required: true })
  accountId: string;

  @Prop()
  playerId?: string;

  @Prop({ required: true })
  expiresAt: Date; // Original token expiry

  @Prop()
  revokedAt: Date;

  @Prop()
  reason?: string;

  @Prop()
  createdAt: Date;
}

export const JwtBlacklistSchema = SchemaFactory.createForClass(JwtBlacklist);

// TTL Index - auto-delete after token expiry
JwtBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
JwtBlacklistSchema.index({ jti: 1 }); // Fast blacklist check
```

#### 3. ServiceTokens Collection

```typescript
@Schema({ collection: 'service_tokens', timestamps: true })
export class ServiceToken extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, unique: true })
  serviceName: string;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true })
  tokenPrefix: string;

  @Prop({ type: Array, required: true })
  scopes: string[];

  @Prop({ type: Array, default: [] })
  allowedServices: string[]; // Services this token can communicate with

  @Prop({ default: 'active', enum: ['active', 'revoked', 'expired'] })
  status: string;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedReason?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ServiceTokenSchema = SchemaFactory.createForClass(ServiceToken);

ServiceTokenSchema.index({ serviceName: 1 });
ServiceTokenSchema.index({ status: 1, expiresAt: 1 });
ServiceTokenSchema.index({ expiresAt: 1 }); // Cleanup expired tokens
```

#### 4. WebhookTokens Collection

```typescript
@Schema({ collection: 'webhook_tokens', timestamps: true })
export class WebhookToken extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ required: true, index: true })
  clientId: string;

  @Prop({ required: true })
  webhookUrl: string;

  @Prop({ type: Array, required: true })
  events: string[]; // ['player.level_up', 'achievement.unlocked']

  @Prop({ required: true })
  signingSecretHash: string;

  @Prop({ default: 'active', enum: ['active', 'revoked'] })
  status: string;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ default: 0 })
  deliveryCount: number;

  @Prop({ default: 0 })
  failureCount: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const WebhookTokenSchema = SchemaFactory.createForClass(WebhookToken);

WebhookTokenSchema.index({ accountId: 1, clientId: 1 });
WebhookTokenSchema.index({ status: 1 });
```

#### 5. TokenUsage Collection

```typescript
@Schema({ collection: 'token_usage', timestamps: false })
export class TokenUsage extends Document {
  @Prop({ required: true, index: true })
  tokenId: string;

  @Prop({ required: true, enum: ['api_key', 'jwt', 'service', 'webhook'] })
  tokenType: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  method: string; // GET, POST, etc.

  @Prop({ required: true })
  statusCode: number;

  @Prop()
  responseTime: number; // milliseconds

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const TokenUsageSchema = SchemaFactory.createForClass(TokenUsage);

// Indexes
TokenUsageSchema.index({ tokenId: 1, timestamp: -1 }); // Usage history
TokenUsageSchema.index({ timestamp: -1 }); // Time-series queries
TokenUsageSchema.index({ tokenType: 1, statusCode: 1 }); // Error analysis

// TTL Index - auto-delete after 90 days
TokenUsageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
```

#### 6. SecurityEvents Collection

```typescript
@Schema({ collection: 'security_events', timestamps: false })
export class SecurityEvent extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
  tokenId: string;

  @Prop({ required: true, enum: ['unauthorized_access', 'invalid_token', 'rate_limit_exceeded', 'ip_blocked', 'scope_violation', 'token_revoked'] })
  type: string;

  @Prop({ required: true, enum: ['low', 'medium', 'high', 'critical'] })
  severity: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  endpoint?: string;

  @Prop()
  reason: string;

  @Prop({ enum: ['blocked', 'throttled', 'allowed', 'logged'] })
  action: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const SecurityEventSchema = SchemaFactory.createForClass(SecurityEvent);

SecurityEventSchema.index({ tokenId: 1, timestamp: -1 });
SecurityEventSchema.index({ type: 1, severity: 1 });
SecurityEventSchema.index({ timestamp: -1 });

// TTL Index - auto-delete after 180 days
SecurityEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15552000 });
```

#### 7. AuditLog Collection

```typescript
@Schema({ collection: 'audit_log', timestamps: false })
export class AuditLog extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, enum: ['create', 'update', 'rotate', 'revoke', 'delete'] })
  action: string;

  @Prop({ required: true, enum: ['api_key', 'jwt', 'service_token', 'webhook_token'] })
  resourceType: string;

  @Prop({ required: true, index: true })
  resourceId: string;

  @Prop({ required: true })
  actorId: string; // accountId or serviceId

  @Prop({ required: true, enum: ['account', 'service', 'system'] })
  actorType: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  changes: Record<string, any>;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, resourceType: 1 });
AuditLogSchema.index({ timestamp: -1 });

// TTL Index - auto-delete after 365 days
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
```

---

## NestJS Implementation

### Service Architecture

```typescript
// src/token/token.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TokenController } from './token.controller';
import { TokenService } from './token.service';
import { ApiKeyService } from './services/api-key.service';
import { JwtTokenService } from './services/jwt-token.service';
import { ServiceTokenService } from './services/service-token.service';
import { WebhookTokenService } from './services/webhook-token.service';
import { TokenAuthService } from './services/token-auth.service';
import { RateLimitService } from './services/rate-limit.service';
import { AuditService } from './services/audit.service';

import { ApiKey, ApiKeySchema } from './schemas/api-key.schema';
import { JwtBlacklist, JwtBlacklistSchema } from './schemas/jwt-blacklist.schema';
import { ServiceToken, ServiceTokenSchema } from './schemas/service-token.schema';
import { WebhookToken, WebhookTokenSchema } from './schemas/webhook-token.schema';
import { TokenUsage, TokenUsageSchema } from './schemas/token-usage.schema';
import { SecurityEvent, SecurityEventSchema } from './schemas/security-event.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiKey.name, schema: ApiKeySchema },
      { name: JwtBlacklist.name, schema: JwtBlacklistSchema },
      { name: ServiceToken.name, schema: ServiceTokenSchema },
      { name: WebhookToken.name, schema: WebhookTokenSchema },
      { name: TokenUsage.name, schema: TokenUsageSchema },
      { name: SecurityEvent.name, schema: SecurityEventSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '24h',
          issuer: 'gamification-api',
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    BullModule.registerQueue(
      { name: 'token-cleanup' },
      { name: 'usage-analytics' },
    ),
    CacheModule.register({
      ttl: 300,
      max: 10000,
    }),
  ],
  controllers: [TokenController],
  providers: [
    TokenService,
    ApiKeyService,
    JwtTokenService,
    ServiceTokenService,
    WebhookTokenService,
    TokenAuthService,
    RateLimitService,
    AuditService,
    JwtStrategy,
    ApiKeyStrategy,
  ],
  exports: [
    TokenService,
    ApiKeyService,
    JwtTokenService,
    TokenAuthService,
    RateLimitService,
  ],
})
export class TokenModule {}
```

### API Key Service

```typescript
// src/token/services/api-key.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { ApiKey } from '../schemas/api-key.schema';
import { CreateApiKeyDto, UpdateApiKeyDto } from '../dto/api-key.dto';
import { AuditService } from './audit.service';

@Injectable()
export class ApiKeyService {
  private readonly SALT_ROUNDS = 10;
  private readonly KEY_LENGTH = 48; // 48 bytes = 64 chars in hex

  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKey>,
    private auditService: AuditService,
  ) {}

  async createApiKey(accountId: string, createApiKeyDto: CreateApiKeyDto): Promise<{ apiKey: ApiKey; key: string }> {
    // Generate secure random key
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const key = `gapi_live_${randomBytes.toString('hex')}`;
    const keyHash = await bcrypt.hash(key, this.SALT_ROUNDS);
    const keyPrefix = key.substring(0, 19); // "gapi_live_" + 9 chars

    const apiKey = await this.apiKeyModel.create({
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      ...createApiKeyDto,
      keyHash,
      keyPrefix,
      status: 'active',
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Audit log
    await this.auditService.log({
      action: 'create',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      actorId: accountId,
      actorType: 'account',
      changes: {
        name: apiKey.name,
        scopes: apiKey.scopes,
        clientId: apiKey.clientId,
      },
    });

    return { apiKey, key };
  }

  async listApiKeys(
    accountId: string,
    filters?: {
      clientId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ apiKeys: ApiKey[]; total: number }> {
    const query: any = { accountId };

    if (filters?.clientId) query.clientId = filters.clientId;
    if (filters?.status) query.status = filters.status;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [apiKeys, total] = await Promise.all([
      this.apiKeyModel
        .find(query)
        .select('-keyHash') // Never expose key hash
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.apiKeyModel.countDocuments(query),
    ]);

    return { apiKeys, total };
  }

  async getApiKeyById(keyId: string, accountId: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyModel.findOne({ id: keyId, accountId }).select('-keyHash');

    if (!apiKey) {
      throw new NotFoundException(`API key ${keyId} not found`);
    }

    return apiKey;
  }

  async updateApiKey(
    keyId: string,
    accountId: string,
    updateApiKeyDto: UpdateApiKeyDto,
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyModel.findOne({ id: keyId, accountId });

    if (!apiKey) {
      throw new NotFoundException(`API key ${keyId} not found`);
    }

    if (apiKey.status === 'revoked') {
      throw new BadRequestException('Cannot update revoked API key');
    }

    const oldValues = {
      name: apiKey.name,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      ipWhitelist: apiKey.ipWhitelist,
    };

    Object.assign(apiKey, updateApiKeyDto);
    apiKey.updatedAt = new Date();
    await apiKey.save();

    // Audit log
    await this.auditService.log({
      action: 'update',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      actorId: accountId,
      actorType: 'account',
      changes: {
        before: oldValues,
        after: updateApiKeyDto,
      },
    });

    return apiKey;
  }

  async rotateApiKey(
    keyId: string,
    accountId: string,
    options: {
      revokeOldKey: boolean;
      gracePeriod?: number; // seconds
    },
  ): Promise<{ newApiKey: ApiKey; oldApiKey: ApiKey; newKey: string }> {
    const oldApiKey = await this.apiKeyModel.findOne({ id: keyId, accountId });

    if (!oldApiKey) {
      throw new NotFoundException(`API key ${keyId} not found`);
    }

    // Create new key with same configuration
    const { apiKey: newApiKey, key: newKey } = await this.createApiKey(accountId, {
      name: oldApiKey.name,
      clientId: oldApiKey.clientId,
      scopes: oldApiKey.scopes,
      rateLimit: oldApiKey.rateLimit,
      ipWhitelist: oldApiKey.ipWhitelist,
      metadata: oldApiKey.metadata,
    });

    // Handle old key
    if (options.revokeOldKey && !options.gracePeriod) {
      // Immediately revoke old key
      oldApiKey.status = 'revoked';
      oldApiKey.revokedAt = new Date();
      oldApiKey.revokedReason = 'rotated';
    } else if (options.gracePeriod) {
      // Set expiry for old key
      oldApiKey.expiresAt = new Date(Date.now() + options.gracePeriod * 1000);
    }

    oldApiKey.updatedAt = new Date();
    await oldApiKey.save();

    // Audit log
    await this.auditService.log({
      action: 'rotate',
      resourceType: 'api_key',
      resourceId: oldApiKey.id,
      actorId: accountId,
      actorType: 'account',
      changes: {
        oldKeyId: oldApiKey.id,
        newKeyId: newApiKey.id,
        revokeOldKey: options.revokeOldKey,
        gracePeriod: options.gracePeriod,
      },
    });

    return { newApiKey, oldApiKey, newKey };
  }

  async revokeApiKey(
    keyId: string,
    accountId: string,
    reason: string,
    note?: string,
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyModel.findOne({ id: keyId, accountId });

    if (!apiKey) {
      throw new NotFoundException(`API key ${keyId} not found`);
    }

    if (apiKey.status === 'revoked') {
      throw new BadRequestException('API key is already revoked');
    }

    apiKey.status = 'revoked';
    apiKey.revokedAt = new Date();
    apiKey.revokedBy = accountId;
    apiKey.revokedReason = reason;
    if (note) {
      apiKey.metadata = {
        ...apiKey.metadata,
        revokedNote: note,
      };
    }
    apiKey.updatedAt = new Date();

    await apiKey.save();

    // Audit log
    await this.auditService.log({
      action: 'revoke',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      actorId: accountId,
      actorType: 'account',
      changes: {
        reason,
        note,
      },
    });

    return apiKey;
  }

  async verifyApiKey(key: string): Promise<ApiKey | null> {
    // Extract prefix for quick lookup
    const keyPrefix = key.substring(0, 19);

    const apiKey = await this.apiKeyModel.findOne({ keyPrefix, status: 'active' });

    if (!apiKey) {
      return null;
    }

    // Check expiry
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.status = 'expired';
      await apiKey.save();
      return null;
    }

    // Verify key hash
    const isValid = await bcrypt.compare(key, apiKey.keyHash);

    if (!isValid) {
      return null;
    }

    // Update usage
    apiKey.lastUsedAt = new Date();
    apiKey.usageCount += 1;
    await apiKey.save();

    return apiKey;
  }

  async checkScope(apiKey: ApiKey, requiredScope: string): Promise<boolean> {
    // Check if API key has the required scope
    // Supports wildcard scopes like "player:*"
    return apiKey.scopes.some((scope) => {
      if (scope === requiredScope) return true;
      if (scope.endsWith(':*')) {
        const scopePrefix = scope.slice(0, -2);
        return requiredScope.startsWith(scopePrefix);
      }
      return false;
    });
  }

  async checkIpWhitelist(apiKey: ApiKey, ipAddress: string): Promise<boolean> {
    if (!apiKey.ipWhitelist || apiKey.ipWhitelist.length === 0) {
      return true; // No whitelist = allow all
    }

    // Check if IP matches any CIDR range in whitelist
    // This is a simplified check - use a proper CIDR library in production
    return apiKey.ipWhitelist.some((cidr) => {
      if (cidr.includes('/')) {
        // CIDR range check (simplified)
        const [range, bits] = cidr.split('/');
        return ipAddress.startsWith(range.split('.').slice(0, parseInt(bits) / 8).join('.'));
      }
      return ipAddress === cidr;
    });
  }
}
```

### JWT Token Service

```typescript
// src/token/services/jwt-token.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { JwtBlacklist } from '../schemas/jwt-blacklist.schema';
import { CreateJwtTokenDto } from '../dto/jwt-token.dto';

@Injectable()
export class JwtTokenService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(JwtBlacklist.name) private jwtBlacklistModel: Model<JwtBlacklist>,
  ) {}

  async createToken(createJwtTokenDto: CreateJwtTokenDto): Promise<{
    token: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: Date;
  }> {
    const jti = `jti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payload = {
      jti,
      accountId: createJwtTokenDto.accountId,
      playerId: createJwtTokenDto.playerId,
      clientId: createJwtTokenDto.clientId,
      scopes: createJwtTokenDto.scopes,
      metadata: createJwtTokenDto.metadata,
    };

    const expiresIn = this.parseExpiresIn(createJwtTokenDto.expiresIn || '24h');

    const token = this.jwtService.sign(payload, {
      expiresIn: createJwtTokenDto.expiresIn || '24h',
    });

    return {
      token,
      tokenType: 'Bearer',
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);

      // Check blacklist
      const blacklisted = await this.jwtBlacklistModel.findOne({ jti: decoded.jti });

      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async refreshToken(token: string, expiresIn: string = '24h'): Promise<{
    token: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: Date;
  }> {
    // Verify old token (allow expired tokens for refresh)
    let decoded: any;
    try {
      decoded = this.jwtService.verify(token, { ignoreExpiration: true });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    // Check blacklist
    const blacklisted = await this.jwtBlacklistModel.findOne({ jti: decoded.jti });
    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Create new token
    return this.createToken({
      accountId: decoded.accountId,
      playerId: decoded.playerId,
      clientId: decoded.clientId,
      scopes: decoded.scopes,
      expiresIn,
      metadata: decoded.metadata,
    });
  }

  async revokeToken(token: string, reason?: string): Promise<void> {
    const decoded = this.jwtService.verify(token);

    await this.jwtBlacklistModel.create({
      jti: decoded.jti,
      accountId: decoded.accountId,
      playerId: decoded.playerId,
      expiresAt: new Date(decoded.exp * 1000),
      revokedAt: new Date(),
      reason,
      createdAt: new Date(),
    });
  }

  private parseExpiresIn(expiresIn: string): number {
    // Parse strings like "15m", "24h", "7d" to seconds
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiresIn format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
  }
}
```

### Rate Limit Service

```typescript
// src/token/services/rate-limit.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RateLimitService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async checkRateLimit(
    keyId: string,
    limits: { requestsPerMinute: number; requestsPerDay: number },
  ): Promise<{
    allowed: boolean;
    remaining: { minute: number; day: number };
    reset: { minute: number; day: number };
  }> {
    const now = Date.now();
    const minuteKey = `ratelimit:${keyId}:minute:${Math.floor(now / 60000)}`;
    const dayKey = `ratelimit:${keyId}:day:${Math.floor(now / 86400000)}`;

    // Increment counters
    const [minuteCount, dayCount] = await Promise.all([
      this.redis.incr(minuteKey),
      this.redis.incr(dayKey),
    ]);

    // Set expiry on first request
    if (minuteCount === 1) {
      await this.redis.expire(minuteKey, 60);
    }
    if (dayCount === 1) {
      await this.redis.expire(dayKey, 86400);
    }

    const minuteAllowed = minuteCount <= limits.requestsPerMinute;
    const dayAllowed = dayCount <= limits.requestsPerDay;

    return {
      allowed: minuteAllowed && dayAllowed,
      remaining: {
        minute: Math.max(0, limits.requestsPerMinute - minuteCount),
        day: Math.max(0, limits.requestsPerDay - dayCount),
      },
      reset: {
        minute: Math.ceil(now / 60000) * 60,
        day: Math.ceil(now / 86400000) * 86400,
      },
    };
  }

  async getRateLimitStatus(
    keyId: string,
    limits: { requestsPerMinute: number; requestsPerDay: number },
  ): Promise<{
    current: {
      minute: { used: number; remaining: number; resetAt: Date };
      day: { used: number; remaining: number; resetAt: Date };
    };
  }> {
    const now = Date.now();
    const minuteKey = `ratelimit:${keyId}:minute:${Math.floor(now / 60000)}`;
    const dayKey = `ratelimit:${keyId}:day:${Math.floor(now / 86400000)}`;

    const [minuteCount, dayCount] = await Promise.all([
      this.redis.get(minuteKey),
      this.redis.get(dayKey),
    ]);

    const minuteUsed = parseInt(minuteCount || '0');
    const dayUsed = parseInt(dayCount || '0');

    return {
      current: {
        minute: {
          used: minuteUsed,
          remaining: Math.max(0, limits.requestsPerMinute - minuteUsed),
          resetAt: new Date(Math.ceil(now / 60000) * 60000),
        },
        day: {
          used: dayUsed,
          remaining: Math.max(0, limits.requestsPerDay - dayUsed),
          resetAt: new Date(Math.ceil(now / 86400000) * 86400000),
        },
      },
    };
  }
}
```

### Authentication Middleware

```typescript
// src/token/guards/api-key-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { RateLimitService } from '../services/rate-limit.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract API key from header
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Verify API key
    const validKey = await this.apiKeyService.verifyApiKey(apiKey);
    if (!validKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check IP whitelist
    const ipAddress = request.ip;
    const ipAllowed = await this.apiKeyService.checkIpWhitelist(validKey, ipAddress);
    if (!ipAllowed) {
      throw new UnauthorizedException('IP address not in whitelist');
    }

    // Check rate limit
    if (validKey.rateLimit) {
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        validKey.id,
        validKey.rateLimit,
      );

      if (!rateLimitResult.allowed) {
        throw new UnauthorizedException('Rate limit exceeded');
      }

      // Attach rate limit info to response headers
      request.res.setHeader('X-RateLimit-Limit-Minute', validKey.rateLimit.requestsPerMinute);
      request.res.setHeader('X-RateLimit-Remaining-Minute', rateLimitResult.remaining.minute);
      request.res.setHeader('X-RateLimit-Reset-Minute', rateLimitResult.reset.minute);
    }

    // Attach validated key to request
    request.apiKey = validKey;

    return true;
  }

  private extractApiKey(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check X-API-Key header
    return request.headers['x-api-key'] || null;
  }
}
```

### Scope Guard

```typescript
// src/token/guards/scope.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.get<string[]>('scopes', context.getHandler());
    if (!requiredScopes) {
      return true; // No scopes required
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey;
    const jwtPayload = request.user;

    const scopes = apiKey?.scopes || jwtPayload?.scopes || [];

    const hasScope = requiredScopes.some((requiredScope) =>
      scopes.some((scope) => {
        if (scope === requiredScope) return true;
        if (scope.endsWith(':*')) {
          const scopePrefix = scope.slice(0, -2);
          return requiredScope.startsWith(scopePrefix);
        }
        return false;
      }),
    );

    if (!hasScope) {
      throw new ForbiddenException(
        `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
      );
    }

    return true;
  }
}
```

### Scopes Decorator

```typescript
// src/token/decorators/scopes.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Scopes = (...scopes: string[]) => SetMetadata('scopes', scopes);

// Usage example:
// @Scopes('player:read', 'player:write')
// async getPlayer() { ... }
```

---

## Testing

### Unit Tests

```typescript
// src/token/services/api-key.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ApiKeyService } from './api-key.service';
import { ApiKey } from '../schemas/api-key.schema';
import { AuditService } from './audit.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: getModelToken(ApiKey.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    apiKeyModel = module.get(getModelToken(ApiKey.name));
  });

  describe('createApiKey', () => {
    it('should create an API key with secure random generation', async () => {
      const createDto = {
        name: 'Test Key',
        clientId: 'client_123',
        scopes: ['player:read'],
        rateLimit: { requestsPerMinute: 100, requestsPerDay: 10000 },
      };

      apiKeyModel.create.mockResolvedValue({
        id: 'key_123',
        ...createDto,
        keyHash: 'hashed_key',
        keyPrefix: 'gapi_live_123456',
        status: 'active',
      });

      const result = await service.createApiKey('acc_123', createDto);

      expect(result.apiKey.id).toBe('key_123');
      expect(result.key).toMatch(/^gapi_live_[a-f0-9]{96}$/);
      expect(apiKeyModel.create).toHaveBeenCalled();
    });
  });

  describe('verifyApiKey', () => {
    it('should verify valid API key', async () => {
      const key = 'gapi_live_1234567890abcdef';
      const apiKey = {
        id: 'key_123',
        keyPrefix: 'gapi_live_123456',
        keyHash: await bcrypt.hash(key, 10),
        status: 'active',
        expiresAt: null,
        save: jest.fn(),
      };

      apiKeyModel.findOne.mockResolvedValue(apiKey);

      const result = await service.verifyApiKey(key);

      expect(result).toBeTruthy();
      expect(result.id).toBe('key_123');
    });

    it('should reject expired API key', async () => {
      const key = 'gapi_live_1234567890abcdef';
      const apiKey = {
        keyHash: await bcrypt.hash(key, 10),
        status: 'active',
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        save: jest.fn(),
      };

      apiKeyModel.findOne.mockResolvedValue(apiKey);

      const result = await service.verifyApiKey(key);

      expect(result).toBeNull();
      expect(apiKey.status).toBe('expired');
    });
  });
});
```

---

## Security Best Practices

### Token Storage

```typescript
// NEVER store plain tokens in database
// ✅ Correct: Store bcrypt hash
const keyHash = await bcrypt.hash(apiKey, 10);

// ✅ Correct: Only show token once on creation
return {
  apiKey: { ...apiKeyData, keyHash: undefined },
  key: apiKey, // Only returned on creation
  warning: 'This API key will only be shown once. Store it securely.',
};

// ❌ Wrong: Store plain token
const apiKey = {
  key: 'gapi_live_1234567890abcdef', // NEVER DO THIS
};
```

### Secure Token Generation

```typescript
// ✅ Use crypto.randomBytes for cryptographic randomness
const randomBytes = crypto.randomBytes(48);
const apiKey = `gapi_live_${randomBytes.toString('hex')}`;

// ❌ Don't use Math.random() for security tokens
const apiKey = `gapi_live_${Math.random().toString(36)}`; // INSECURE
```

### Rate Limiting

```typescript
// ✅ Implement token-specific rate limits
const rateLimitResult = await rateLimitService.checkRateLimit(keyId, {
  requestsPerMinute: 1000,
  requestsPerDay: 100000,
});

if (!rateLimitResult.allowed) {
  throw new UnauthorizedException('Rate limit exceeded');
}

// ✅ Return rate limit headers
response.setHeader('X-RateLimit-Limit', limits.requestsPerMinute);
response.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.minute);
response.setHeader('X-RateLimit-Reset', rateLimitResult.reset.minute);
```

### IP Whitelisting

```typescript
// ✅ Support CIDR notation for IP ranges
const ipWhitelist = ['203.0.113.0/24', '198.51.100.50'];

// ✅ Validate IP before processing request
const ipAllowed = await apiKeyService.checkIpWhitelist(apiKey, request.ip);
if (!ipAllowed) {
  await securityService.logEvent({
    type: 'ip_blocked',
    severity: 'high',
    keyId: apiKey.id,
    ipAddress: request.ip,
  });
  throw new UnauthorizedException('IP address not allowed');
}
```

---

## Monitoring & Observability

### Metrics

```typescript
// src/token/metrics/token.metrics.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class TokenMetrics {
  private apiKeyCreated: Counter;
  private tokenValidationDuration: Histogram;
  private activeApiKeys: Gauge;
  private rateLimitExceeded: Counter;
  private securityEvents: Counter;

  constructor() {
    this.apiKeyCreated = new Counter({
      name: 'api_key_created_total',
      help: 'Total API keys created',
      labelNames: ['clientId'],
    });

    this.tokenValidationDuration = new Histogram({
      name: 'token_validation_duration_seconds',
      help: 'Token validation duration',
      labelNames: ['tokenType'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
    });

    this.activeApiKeys = new Gauge({
      name: 'active_api_keys',
      help: 'Number of active API keys',
      labelNames: ['clientId'],
    });

    this.rateLimitExceeded = new Counter({
      name: 'rate_limit_exceeded_total',
      help: 'Total rate limit violations',
      labelNames: ['keyId', 'limitType'],
    });

    this.securityEvents = new Counter({
      name: 'security_events_total',
      help: 'Total security events',
      labelNames: ['type', 'severity'],
    });
  }
}
```

---

## Summary

The **API Token Service** provides comprehensive authentication and authorization for the gamification platform:

- **21 REST API endpoints** for token lifecycle management
- **5 token types**: API keys, JWT, service tokens, webhook tokens, test tokens
- **Scope-based permissions**: Fine-grained access control
- **Rate limiting**: Token-specific quotas (per minute/day)
- **IP whitelisting**: CIDR-based IP restrictions
- **Multi-tenancy**: Client isolation and token segregation
- **Audit trail**: Comprehensive logging of all token operations
- **Security**: bcrypt hashing, crypto randomness, secure storage
- **Production-ready**: NestJS implementation with guards, strategies, middleware

**Key Security Features**:
- Never store plain tokens (bcrypt hashing)
- Cryptographic random generation
- JWT blacklist for revocation
- Rate limiting with Redis
- IP whitelisting support
- Comprehensive audit logging
- TTL-based auto-cleanup

**Total Lines**: 1,800+ lines of comprehensive specification
