# Rules Engine Service - Implementation Specification

**Service**: Rules Engine Service
**Priority**: Phase 1 - P0 (Critical Foundation)
**Version**: 1.0.0
**Status**: Implementation Ready
**Last Updated**: 2025-11-30

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Complete API Specification](#complete-api-specification)
3. [Database Design](#database-design)
4. [NestJS Architecture](#nestjs-architecture)
5. [Code Implementation](#code-implementation)
6. [Testing Strategy](#testing-strategy)
7. [Integration Patterns](#integration-patterns)
8. [Performance Optimization](#performance-optimization)
9. [Deployment Guide](#deployment-guide)

---

## Service Overview

### Purpose

The Rules Engine Service is the **foundational decision-making system** for the gamification platform. It provides a flexible, JSON-based Domain-Specific Language (DSL) for defining complex business rules that determine:

- **Point Earning**: How users earn points for actions
- **Feature Unlocking**: When achievements, quests, or content become available
- **Restrictions**: What actions are allowed or blocked
- **Multipliers**: Dynamic bonuses based on conditions
- **A/B Testing**: Variant assignment and rule variations

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Dynamic Rule Evaluation** | Real-time evaluation of JSON-based rules with sub-10ms latency |
| **Version Control** | Complete rule history with rollback capability |
| **Rule DSL** | Expressive JSON syntax supporting complex logic (AND/OR/NOT) |
| **Custom Operators** | Plugin system for domain-specific operators |
| **Caching** | Multi-tier caching with Redis (1000+ rules/second) |
| **Simulation** | Test rules before deployment |
| **A/B Testing** | Built-in variant assignment and analysis |
| **Priority System** | Rule conflict resolution via priority ordering |

### Rule Types

```typescript
type RuleType =
  | 'earning'       // Point earning rules
  | 'unlock'        // Feature unlock conditions
  | 'restriction'   // Action restrictions
  | 'multiplier'    // Dynamic multipliers
  | 'eligibility';  // Quest/challenge eligibility
```

### Rule Lifecycle

```
Draft → Validation → Testing → Active → Versioned → Archived
  ↓         ↓          ↓         ↓         ↓          ↓
Create   Validate   Simulate  Deploy   Update    Rollback
```

---

## Complete API Specification

### Base URL
```
/api/v1/rules
```

### 1. Rule Management Endpoints

#### 1.1 Create Rule
```http
POST /api/v1/rules
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "Double Points Weekend",
  "description": "2x points on weekends",
  "type": "multiplier",
  "priority": 100,
  "enabled": false,
  "condition": {
    "operator": "and",
    "conditions": [
      {
        "field": "context.dayOfWeek",
        "operator": "in",
        "value": ["saturday", "sunday"]
      },
      {
        "field": "user.level",
        "operator": ">=",
        "value": 5
      }
    ]
  },
  "action": {
    "type": "apply_multiplier",
    "params": {
      "multiplier": 2.0,
      "currencies": ["xp", "coins"]
    }
  },
  "validFrom": "2025-12-01T00:00:00Z",
  "validUntil": "2025-12-31T23:59:59Z",
  "tags": ["weekend", "promotion"]
}

Response: 201 Created
{
  "id": "rule_abc123",
  "version": 1,
  "name": "Double Points Weekend",
  "type": "multiplier",
  "priority": 100,
  "enabled": false,
  "createdAt": "2025-11-30T10:00:00Z",
  "updatedAt": "2025-11-30T10:00:00Z",
  "condition": { ... },
  "action": { ... }
}
```

#### 1.2 Get Rule by ID
```http
GET /api/v1/rules/:ruleId
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "rule_abc123",
  "version": 3,
  "name": "Double Points Weekend",
  "description": "2x points on weekends",
  "type": "multiplier",
  "priority": 100,
  "enabled": true,
  "condition": { ... },
  "action": { ... },
  "validFrom": "2025-12-01T00:00:00Z",
  "validUntil": "2025-12-31T23:59:59Z",
  "tags": ["weekend", "promotion"],
  "stats": {
    "evaluationCount": 15234,
    "successCount": 8721,
    "averageLatency": 3.2
  },
  "createdAt": "2025-11-30T10:00:00Z",
  "updatedAt": "2025-12-15T14:30:00Z"
}
```

#### 1.3 List Rules
```http
GET /api/v1/rules?type=earning&enabled=true&limit=50&offset=0
Authorization: Bearer {token}

Query Parameters:
- type: RuleType (optional)
- enabled: boolean (optional)
- tags: string[] (optional, comma-separated)
- priority: number (optional, filter by min priority)
- validAt: ISO date (optional, rules valid at this time)
- limit: number (default: 50, max: 100)
- offset: number (default: 0)

Response: 200 OK
{
  "data": [
    {
      "id": "rule_abc123",
      "name": "Double Points Weekend",
      "type": "multiplier",
      "priority": 100,
      "enabled": true,
      "validFrom": "2025-12-01T00:00:00Z",
      "validUntil": "2025-12-31T23:59:59Z"
    }
  ],
  "pagination": {
    "total": 127,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### 1.4 Update Rule
```http
PATCH /api/v1/rules/:ruleId
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "description": "Updated description",
  "priority": 150,
  "condition": { ... },
  "enabled": true
}

Response: 200 OK
{
  "id": "rule_abc123",
  "version": 4,
  "name": "Double Points Weekend",
  "priority": 150,
  "enabled": true,
  "updatedAt": "2025-11-30T15:30:00Z",
  "previousVersion": 3
}
```

#### 1.5 Delete Rule (Soft Delete)
```http
DELETE /api/v1/rules/:ruleId
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "rule_abc123",
  "status": "archived",
  "archivedAt": "2025-11-30T16:00:00Z"
}
```

### 2. Rule Evaluation Endpoints

#### 2.1 Evaluate Single Rule
```http
POST /api/v1/rules/:ruleId/evaluate
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "context": {
    "userId": "user_123",
    "action": "post.created",
    "timestamp": "2025-11-30T12:00:00Z",
    "metadata": {
      "postId": "post_456",
      "category": "tech"
    }
  },
  "user": {
    "id": "user_123",
    "level": 12,
    "totalPoints": 5000,
    "achievements": ["first-post", "tech-master"],
    "joinedAt": "2025-01-15T00:00:00Z"
  }
}

Response: 200 OK
{
  "ruleId": "rule_abc123",
  "matched": true,
  "result": {
    "type": "apply_multiplier",
    "params": {
      "multiplier": 2.0,
      "currencies": ["xp", "coins"]
    }
  },
  "evaluationTime": 2.3,
  "timestamp": "2025-11-30T12:00:00Z"
}
```

#### 2.2 Evaluate Multiple Rules (Batch)
```http
POST /api/v1/rules/evaluate-batch
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "context": {
    "userId": "user_123",
    "action": "post.created",
    "timestamp": "2025-11-30T12:00:00Z"
  },
  "user": { ... },
  "ruleTypes": ["earning", "multiplier"],
  "limit": 10
}

Response: 200 OK
{
  "matched": [
    {
      "ruleId": "rule_abc123",
      "ruleName": "Double Points Weekend",
      "priority": 100,
      "result": {
        "type": "apply_multiplier",
        "params": { "multiplier": 2.0 }
      }
    },
    {
      "ruleId": "rule_def456",
      "ruleName": "Tech Post Bonus",
      "priority": 80,
      "result": {
        "type": "award_points",
        "params": { "amount": 50, "currency": "xp" }
      }
    }
  ],
  "evaluationTime": 5.7,
  "rulesEvaluated": 23,
  "rulesMatched": 2
}
```

#### 2.3 Evaluate All Active Rules
```http
POST /api/v1/rules/evaluate
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "context": { ... },
  "user": { ... },
  "options": {
    "stopOnFirstMatch": false,
    "includeInactive": false,
    "maxRules": 100
  }
}

Response: 200 OK
{
  "matched": [ ... ],
  "evaluationTime": 12.4,
  "rulesEvaluated": 67,
  "rulesMatched": 5,
  "cacheHit": true
}
```

### 3. Rule Testing & Simulation

#### 3.1 Simulate Rule
```http
POST /api/v1/rules/:ruleId/simulate
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "testCases": [
    {
      "name": "Weekend user level 5",
      "context": {
        "dayOfWeek": "saturday",
        "userId": "test_user_1"
      },
      "user": {
        "level": 5,
        "totalPoints": 1000
      },
      "expectedMatch": true
    },
    {
      "name": "Weekday user level 5",
      "context": {
        "dayOfWeek": "monday",
        "userId": "test_user_2"
      },
      "user": {
        "level": 5,
        "totalPoints": 1000
      },
      "expectedMatch": false
    }
  ]
}

Response: 200 OK
{
  "ruleId": "rule_abc123",
  "testResults": [
    {
      "testCase": "Weekend user level 5",
      "passed": true,
      "matched": true,
      "expectedMatch": true,
      "evaluationTime": 1.2
    },
    {
      "testCase": "Weekday user level 5",
      "passed": true,
      "matched": false,
      "expectedMatch": false,
      "evaluationTime": 0.9
    }
  ],
  "summary": {
    "total": 2,
    "passed": 2,
    "failed": 0,
    "successRate": 100
  }
}
```

#### 3.2 Validate Rule Syntax
```http
POST /api/v1/rules/validate
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "condition": {
    "operator": "and",
    "conditions": [
      {
        "field": "user.level",
        "operator": ">=",
        "value": 10
      }
    ]
  },
  "action": {
    "type": "award_points",
    "params": {
      "amount": 100,
      "currency": "xp"
    }
  }
}

Response: 200 OK
{
  "valid": true,
  "errors": [],
  "warnings": [
    "Consider adding a maximum level check to prevent excessive point awards"
  ]
}
```

### 4. Rule Versioning

#### 4.1 Get Rule Version History
```http
GET /api/v1/rules/:ruleId/versions
Authorization: Bearer {token}

Response: 200 OK
{
  "ruleId": "rule_abc123",
  "currentVersion": 4,
  "versions": [
    {
      "version": 4,
      "changes": "Updated priority to 150",
      "changedBy": "admin_user_1",
      "changedAt": "2025-11-30T15:30:00Z",
      "diff": {
        "priority": { "from": 100, "to": 150 }
      }
    },
    {
      "version": 3,
      "changes": "Enabled rule",
      "changedBy": "admin_user_1",
      "changedAt": "2025-11-30T14:00:00Z",
      "diff": {
        "enabled": { "from": false, "to": true }
      }
    }
  ]
}
```

#### 4.2 Get Specific Version
```http
GET /api/v1/rules/:ruleId/versions/:version
Authorization: Bearer {token}

Response: 200 OK
{
  "ruleId": "rule_abc123",
  "version": 2,
  "name": "Double Points Weekend",
  "priority": 100,
  "enabled": false,
  "condition": { ... },
  "action": { ... },
  "createdAt": "2025-11-30T11:00:00Z"
}
```

#### 4.3 Rollback to Previous Version
```http
POST /api/v1/rules/:ruleId/rollback
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "targetVersion": 2,
  "reason": "Current version causing issues"
}

Response: 200 OK
{
  "ruleId": "rule_abc123",
  "previousVersion": 4,
  "currentVersion": 5,
  "rolledBackTo": 2,
  "timestamp": "2025-11-30T16:30:00Z"
}
```

### 5. A/B Testing

#### 5.1 Create A/B Test Variant
```http
POST /api/v1/ab-tests
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "Points Multiplier Test",
  "description": "Test 2x vs 3x weekend multiplier",
  "baseRuleId": "rule_abc123",
  "variants": [
    {
      "name": "Control (2x)",
      "weight": 50,
      "ruleOverrides": {
        "action": {
          "params": {
            "multiplier": 2.0
          }
        }
      }
    },
    {
      "name": "Variant (3x)",
      "weight": 50,
      "ruleOverrides": {
        "action": {
          "params": {
            "multiplier": 3.0
          }
        }
      }
    }
  ],
  "metric": "user_engagement_score",
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-14T23:59:59Z"
}

Response: 201 Created
{
  "id": "abtest_xyz789",
  "name": "Points Multiplier Test",
  "status": "scheduled",
  "variants": [ ... ],
  "createdAt": "2025-11-30T10:00:00Z"
}
```

#### 5.2 Assign User to Variant
```http
POST /api/v1/ab-tests/:testId/assign
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "userId": "user_123"
}

Response: 200 OK
{
  "testId": "abtest_xyz789",
  "userId": "user_123",
  "variantId": "variant_001",
  "variantName": "Control (2x)",
  "assignedAt": "2025-12-01T08:30:00Z",
  "sticky": true
}
```

#### 5.3 Get A/B Test Results
```http
GET /api/v1/ab-tests/:testId/results
Authorization: Bearer {token}

Response: 200 OK
{
  "testId": "abtest_xyz789",
  "name": "Points Multiplier Test",
  "status": "active",
  "results": [
    {
      "variantId": "variant_001",
      "variantName": "Control (2x)",
      "assignedUsers": 523,
      "metricValue": 7.2,
      "conversionRate": 0.42,
      "confidence": 0.85
    },
    {
      "variantId": "variant_002",
      "variantName": "Variant (3x)",
      "assignedUsers": 518,
      "metricValue": 8.9,
      "conversionRate": 0.51,
      "confidence": 0.92
    }
  ],
  "winner": "variant_002",
  "statisticalSignificance": 0.95
}
```

### 6. Rule Analytics

#### 6.1 Get Rule Performance Metrics
```http
GET /api/v1/rules/:ruleId/analytics?from=2025-11-01&to=2025-11-30
Authorization: Bearer {token}

Response: 200 OK
{
  "ruleId": "rule_abc123",
  "period": {
    "from": "2025-11-01T00:00:00Z",
    "to": "2025-11-30T23:59:59Z"
  },
  "metrics": {
    "evaluationCount": 15234,
    "matchCount": 8721,
    "matchRate": 0.572,
    "averageLatency": 3.2,
    "p95Latency": 8.1,
    "p99Latency": 15.3,
    "errorCount": 12,
    "errorRate": 0.0008
  },
  "timeline": [
    {
      "date": "2025-11-01",
      "evaluations": 512,
      "matches": 289,
      "avgLatency": 2.9
    }
  ]
}
```

### 7. Bulk Operations

#### 7.1 Bulk Enable/Disable Rules
```http
POST /api/v1/rules/bulk/toggle
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "ruleIds": ["rule_abc123", "rule_def456", "rule_ghi789"],
  "enabled": false,
  "reason": "End of promotion period"
}

Response: 200 OK
{
  "updated": 3,
  "failed": 0,
  "results": [
    {
      "ruleId": "rule_abc123",
      "success": true,
      "previousState": true,
      "newState": false
    }
  ]
}
```

#### 7.2 Bulk Import Rules
```http
POST /api/v1/rules/bulk/import
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "rules": [
    {
      "name": "Rule 1",
      "type": "earning",
      "condition": { ... },
      "action": { ... }
    }
  ],
  "options": {
    "skipValidation": false,
    "overwriteExisting": false
  }
}

Response: 200 OK
{
  "imported": 10,
  "skipped": 2,
  "failed": 1,
  "details": [ ... ]
}
```

---

## Database Design

### MongoDB Collections

#### 1. Rules Collection

```typescript
// Collection: rules
{
  _id: ObjectId,
  id: string,                    // rule_abc123
  tenantId: string,              // Multi-tenant support
  name: string,
  description: string,
  type: 'earning' | 'unlock' | 'restriction' | 'multiplier' | 'eligibility',
  priority: number,              // Higher = evaluated first
  enabled: boolean,

  // Rule logic
  condition: {
    operator: 'and' | 'or' | 'not',
    conditions: [
      {
        field: string,           // Dot notation: user.level, context.dayOfWeek
        operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains' | 'regex' | 'exists',
        value: any
      }
    ]
  },

  action: {
    type: string,                // award_points, unlock_achievement, apply_multiplier, etc.
    params: Record<string, any>
  },

  // Metadata
  version: number,
  validFrom?: Date,
  validUntil?: Date,
  tags: string[],
  metadata: Record<string, any>,

  // Stats
  stats: {
    evaluationCount: number,
    successCount: number,
    failureCount: number,
    lastEvaluatedAt?: Date,
    averageLatency: number
  },

  // Audit
  createdBy: string,
  createdAt: Date,
  updatedBy: string,
  updatedAt: Date,
  archivedAt?: Date
}

// Indexes
db.rules.createIndex({ tenantId: 1, type: 1, enabled: 1 });
db.rules.createIndex({ tenantId: 1, priority: -1 });
db.rules.createIndex({ tenantId: 1, tags: 1 });
db.rules.createIndex({ tenantId: 1, validFrom: 1, validUntil: 1 });
db.rules.createIndex({ 'stats.evaluationCount': -1 });
```

#### 2. Rule Versions Collection

```typescript
// Collection: rule_versions
{
  _id: ObjectId,
  ruleId: string,
  version: number,

  // Snapshot of rule at this version
  snapshot: {
    name: string,
    description: string,
    priority: number,
    enabled: boolean,
    condition: object,
    action: object,
    // ... all rule fields
  },

  // Change tracking
  changes: {
    field: string,
    previousValue: any,
    newValue: any
  }[],

  changeReason: string,
  changedBy: string,
  changedAt: Date
}

// Indexes
db.rule_versions.createIndex({ ruleId: 1, version: -1 });
db.rule_versions.createIndex({ changedAt: -1 });
```

#### 3. Rule Evaluations Collection (Audit Log)

```typescript
// Collection: rule_evaluations
{
  _id: ObjectId,
  ruleId: string,
  ruleVersion: number,

  // Evaluation context
  context: {
    userId: string,
    action: string,
    timestamp: Date,
    metadata: Record<string, any>
  },

  // User data at evaluation time
  user: {
    id: string,
    level: number,
    totalPoints: number,
    // ... other user fields
  },

  // Result
  matched: boolean,
  result?: {
    type: string,
    params: Record<string, any>
  },

  // Performance
  evaluationTime: number,        // milliseconds

  // Metadata
  evaluatedAt: Date,
  cacheHit: boolean
}

// Indexes
db.rule_evaluations.createIndex({ ruleId: 1, evaluatedAt: -1 });
db.rule_evaluations.createIndex({ 'context.userId': 1, evaluatedAt: -1 });
db.rule_evaluations.createIndex({ evaluatedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
```

#### 4. A/B Test Variants Collection

```typescript
// Collection: ab_test_variants
{
  _id: ObjectId,
  id: string,                    // abtest_xyz789
  tenantId: string,
  name: string,
  description: string,
  baseRuleId: string,

  variants: [
    {
      id: string,                // variant_001
      name: string,
      weight: number,            // 0-100 (percentage)
      ruleOverrides: {           // Partial rule override
        priority?: number,
        condition?: object,
        action?: object
      }
    }
  ],

  // Test configuration
  metric: string,                // KPI to measure
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled',
  startDate: Date,
  endDate: Date,

  // Assignments
  assignments: Map<string, string>, // userId -> variantId

  // Results
  results: {
    variantId: string,
    assignedUsers: number,
    metricValue: number,
    conversionRate: number,
    confidence: number
  }[],

  winner?: string,               // variantId
  statisticalSignificance?: number,

  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.ab_test_variants.createIndex({ tenantId: 1, status: 1 });
db.ab_test_variants.createIndex({ baseRuleId: 1 });
db.ab_test_variants.createIndex({ startDate: 1, endDate: 1 });
```

### MongoDB Schema Definitions

```typescript
// libs/models/src/schemas/rule.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RuleDocument = Rule & Document;

@Schema({
  collection: 'rules',
  timestamps: true,
  versionKey: 'version'
})
export class Rule {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({
    required: true,
    enum: ['earning', 'unlock', 'restriction', 'multiplier', 'eligibility'],
    index: true
  })
  type: string;

  @Prop({ required: true, default: 0 })
  priority: number;

  @Prop({ required: true, default: false, index: true })
  enabled: boolean;

  @Prop({ type: Object, required: true })
  condition: {
    operator: 'and' | 'or' | 'not';
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };

  @Prop({ type: Object, required: true })
  action: {
    type: string;
    params: Record<string, any>;
  };

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: Date, index: true })
  validFrom?: Date;

  @Prop({ type: Date, index: true })
  validUntil?: Date;

  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Object, default: {} })
  stats: {
    evaluationCount: number;
    successCount: number;
    failureCount: number;
    lastEvaluatedAt?: Date;
    averageLatency: number;
  };

  @Prop()
  createdBy: string;

  @Prop()
  updatedBy: string;

  @Prop({ type: Date })
  archivedAt?: Date;
}

export const RuleSchema = SchemaFactory.createForClass(Rule);

// Compound indexes
RuleSchema.index({ tenantId: 1, type: 1, enabled: 1 });
RuleSchema.index({ tenantId: 1, priority: -1 });
```

---

## NestJS Architecture

### Project Structure

```
apps/rules-engine/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── controllers/
│   │   ├── rules.controller.ts
│   │   ├── evaluation.controller.ts
│   │   ├── ab-test.controller.ts
│   │   └── analytics.controller.ts
│   ├── services/
│   │   ├── rules.service.ts
│   │   ├── rule-parser.service.ts
│   │   ├── condition-evaluator.service.ts
│   │   ├── action-executor.service.ts
│   │   ├── version-manager.service.ts
│   │   ├── rule-cache.service.ts
│   │   └── ab-test.service.ts
│   ├── evaluators/
│   │   ├── operators/
│   │   │   ├── comparison.operators.ts
│   │   │   ├── logical.operators.ts
│   │   │   ├── string.operators.ts
│   │   │   └── custom.operators.ts
│   │   └── operator-registry.ts
│   ├── executors/
│   │   ├── actions/
│   │   │   ├── award-points.action.ts
│   │   │   ├── unlock-achievement.action.ts
│   │   │   ├── apply-multiplier.action.ts
│   │   │   └── send-notification.action.ts
│   │   └── action-registry.ts
│   ├── dto/
│   │   ├── create-rule.dto.ts
│   │   ├── update-rule.dto.ts
│   │   ├── evaluate-rule.dto.ts
│   │   └── simulate-rule.dto.ts
│   ├── interfaces/
│   │   ├── rule.interface.ts
│   │   ├── condition.interface.ts
│   │   ├── action.interface.ts
│   │   └── evaluation-context.interface.ts
│   └── utils/
│       ├── rule-validator.ts
│       ├── performance-tracker.ts
│       └── cache-key-generator.ts
└── test/
    ├── unit/
    └── integration/
```

### Core Modules

#### App Module

```typescript
// apps/rules-engine/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';

import { RulesController } from './controllers/rules.controller';
import { EvaluationController } from './controllers/evaluation.controller';
import { ABTestController } from './controllers/ab-test.controller';

import { RulesService } from './services/rules.service';
import { RuleParserService } from './services/rule-parser.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { ActionExecutorService } from './services/action-executor.service';
import { VersionManagerService } from './services/version-manager.service';
import { RuleCacheService } from './services/rule-cache.service';
import { ABTestService } from './services/ab-test.service';

import { OperatorRegistry } from './evaluators/operator-registry';
import { ActionRegistry } from './executors/action-registry';

import { Rule, RuleSchema } from '@gamification-api/models';
import { RuleVersion, RuleVersionSchema } from '@gamification-api/models';
import { RuleEvaluation, RuleEvaluationSchema } from '@gamification-api/models';
import { ABTestVariant, ABTestVariantSchema } from '@gamification-api/models';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),

    MongooseModule.forRoot(process.env.MONGODB_URI),

    MongooseModule.forFeature([
      { name: Rule.name, schema: RuleSchema },
      { name: RuleVersion.name, schema: RuleVersionSchema },
      { name: RuleEvaluation.name, schema: RuleEvaluationSchema },
      { name: ABTestVariant.name, schema: ABTestVariantSchema }
    ]),

    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        keyPrefix: 'rules:',
        maxRetriesPerRequest: 3
      }
    })
  ],

  controllers: [
    RulesController,
    EvaluationController,
    ABTestController
  ],

  providers: [
    RulesService,
    RuleParserService,
    ConditionEvaluatorService,
    ActionExecutorService,
    VersionManagerService,
    RuleCacheService,
    ABTestService,
    OperatorRegistry,
    ActionRegistry
  ]
})
export class AppModule {}
```

---

## Code Implementation

### 1. Rule Parser Service

```typescript
// apps/rules-engine/src/services/rule-parser.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { RuleCondition, RuleAction, ParsedRule } from '../interfaces/rule.interface';

@Injectable()
export class RuleParserService {

  /**
   * Parse and validate rule condition syntax
   */
  parseCondition(condition: RuleCondition): ParsedCondition {
    if (!condition || typeof condition !== 'object') {
      throw new BadRequestException('Invalid condition: must be an object');
    }

    const { operator, conditions } = condition;

    // Validate operator
    if (!['and', 'or', 'not'].includes(operator)) {
      throw new BadRequestException(
        `Invalid logical operator: ${operator}. Must be 'and', 'or', or 'not'`
      );
    }

    // Validate conditions array
    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new BadRequestException(
        'Conditions must be a non-empty array'
      );
    }

    // Special case: NOT operator should have exactly one condition
    if (operator === 'not' && conditions.length !== 1) {
      throw new BadRequestException(
        'NOT operator must have exactly one condition'
      );
    }

    // Parse each condition
    const parsedConditions = conditions.map((cond, index) => {
      // Nested logical condition
      if (cond.operator && ['and', 'or', 'not'].includes(cond.operator)) {
        return this.parseCondition(cond as RuleCondition);
      }

      // Leaf condition
      return this.parseLeafCondition(cond, index);
    });

    return {
      operator,
      conditions: parsedConditions
    };
  }

  /**
   * Parse leaf condition (comparison)
   */
  private parseLeafCondition(condition: any, index: number): ParsedLeafCondition {
    const { field, operator, value } = condition;

    // Validate field
    if (!field || typeof field !== 'string') {
      throw new BadRequestException(
        `Condition ${index}: field must be a non-empty string`
      );
    }

    // Validate operator
    const validOperators = [
      '==', '!=', '>', '<', '>=', '<=',
      'in', 'not_in', 'contains', 'not_contains',
      'regex', 'exists', 'starts_with', 'ends_with'
    ];

    if (!validOperators.includes(operator)) {
      throw new BadRequestException(
        `Condition ${index}: invalid operator '${operator}'`
      );
    }

    // Validate value based on operator
    this.validateValueForOperator(operator, value, index);

    // Parse field path
    const fieldPath = this.parseFieldPath(field);

    return {
      field,
      fieldPath,
      operator,
      value,
      compiled: this.compileCondition(fieldPath, operator, value)
    };
  }

  /**
   * Validate value based on operator type
   */
  private validateValueForOperator(operator: string, value: any, index: number): void {
    switch (operator) {
      case 'in':
      case 'not_in':
        if (!Array.isArray(value)) {
          throw new BadRequestException(
            `Condition ${index}: ${operator} operator requires array value`
          );
        }
        break;

      case 'exists':
        if (typeof value !== 'boolean') {
          throw new BadRequestException(
            `Condition ${index}: exists operator requires boolean value`
          );
        }
        break;

      case 'regex':
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Condition ${index}: regex operator requires string value`
          );
        }
        // Validate regex syntax
        try {
          new RegExp(value);
        } catch (e) {
          throw new BadRequestException(
            `Condition ${index}: invalid regex pattern '${value}'`
          );
        }
        break;

      case '>':
      case '<':
      case '>=':
      case '<=':
        if (typeof value !== 'number' && !(value instanceof Date)) {
          throw new BadRequestException(
            `Condition ${index}: ${operator} operator requires number or date value`
          );
        }
        break;
    }
  }

  /**
   * Parse field path (e.g., "user.level" -> ["user", "level"])
   */
  private parseFieldPath(field: string): string[] {
    return field.split('.').filter(part => part.length > 0);
  }

  /**
   * Compile condition into executable function
   */
  private compileCondition(
    fieldPath: string[],
    operator: string,
    value: any
  ): ConditionFunction {
    return (context: EvaluationContext) => {
      const fieldValue = this.getFieldValue(context, fieldPath);
      return this.compareValues(fieldValue, operator, value);
    };
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(context: any, fieldPath: string[]): any {
    let current = context;

    for (const part of fieldPath) {
      if (current === null || current === undefined) {
        return undefined;
      }

      current = current[part];
    }

    return current;
  }

  /**
   * Compare values using specified operator
   */
  private compareValues(fieldValue: any, operator: string, expectedValue: any): boolean {
    // Handle undefined/null field values
    if (operator === 'exists') {
      return expectedValue
        ? fieldValue !== undefined && fieldValue !== null
        : fieldValue === undefined || fieldValue === null;
    }

    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    // Comparison logic
    switch (operator) {
      case '==':
        return fieldValue === expectedValue;

      case '!=':
        return fieldValue !== expectedValue;

      case '>':
        return fieldValue > expectedValue;

      case '<':
        return fieldValue < expectedValue;

      case '>=':
        return fieldValue >= expectedValue;

      case '<=':
        return fieldValue <= expectedValue;

      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);

      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);

      case 'contains':
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(expectedValue);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(expectedValue);
        }
        return false;

      case 'not_contains':
        if (typeof fieldValue === 'string') {
          return !fieldValue.includes(expectedValue);
        }
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(expectedValue);
        }
        return true;

      case 'regex':
        if (typeof fieldValue !== 'string') {
          return false;
        }
        const regex = new RegExp(expectedValue);
        return regex.test(fieldValue);

      case 'starts_with':
        return typeof fieldValue === 'string' && fieldValue.startsWith(expectedValue);

      case 'ends_with':
        return typeof fieldValue === 'string' && fieldValue.endsWith(expectedValue);

      default:
        return false;
    }
  }

  /**
   * Parse and validate rule action
   */
  parseAction(action: RuleAction): ParsedAction {
    if (!action || typeof action !== 'object') {
      throw new BadRequestException('Invalid action: must be an object');
    }

    const { type, params } = action;

    // Validate action type
    if (!type || typeof type !== 'string') {
      throw new BadRequestException('Action type must be a non-empty string');
    }

    // Validate params
    if (!params || typeof params !== 'object') {
      throw new BadRequestException('Action params must be an object');
    }

    // Validate action-specific params
    this.validateActionParams(type, params);

    return {
      type,
      params,
      compiled: this.compileAction(type, params)
    };
  }

  /**
   * Validate action params based on action type
   */
  private validateActionParams(type: string, params: Record<string, any>): void {
    switch (type) {
      case 'award_points':
        if (typeof params.amount !== 'number' || params.amount <= 0) {
          throw new BadRequestException(
            'award_points: amount must be a positive number'
          );
        }
        if (!params.currency || typeof params.currency !== 'string') {
          throw new BadRequestException(
            'award_points: currency must be a non-empty string'
          );
        }
        break;

      case 'apply_multiplier':
        if (typeof params.multiplier !== 'number' || params.multiplier <= 0) {
          throw new BadRequestException(
            'apply_multiplier: multiplier must be a positive number'
          );
        }
        break;

      case 'unlock_achievement':
        if (!params.achievementId || typeof params.achievementId !== 'string') {
          throw new BadRequestException(
            'unlock_achievement: achievementId must be a non-empty string'
          );
        }
        break;

      case 'trigger_event':
        if (!params.eventType || typeof params.eventType !== 'string') {
          throw new BadRequestException(
            'trigger_event: eventType must be a non-empty string'
          );
        }
        break;

      case 'send_notification':
        if (!params.template || typeof params.template !== 'string') {
          throw new BadRequestException(
            'send_notification: template must be a non-empty string'
          );
        }
        break;

      default:
        // Unknown action type - allow for extensibility
        break;
    }
  }

  /**
   * Compile action into executable function
   */
  private compileAction(type: string, params: Record<string, any>): ActionFunction {
    return (context: EvaluationContext) => {
      return {
        type,
        params: this.interpolateParams(params, context)
      };
    };
  }

  /**
   * Interpolate params with context values
   * Supports template strings like "${user.level}"
   */
  private interpolateParams(
    params: Record<string, any>,
    context: EvaluationContext
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.includes('${')) {
        result[key] = this.interpolateString(value, context);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateParams(value, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Interpolate template string with context values
   */
  private interpolateString(template: string, context: EvaluationContext): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const fieldPath = this.parseFieldPath(path.trim());
      const value = this.getFieldValue(context, fieldPath);
      return value !== undefined && value !== null ? String(value) : '';
    });
  }
}

// Interfaces
interface ParsedCondition {
  operator: 'and' | 'or' | 'not';
  conditions: (ParsedCondition | ParsedLeafCondition)[];
}

interface ParsedLeafCondition {
  field: string;
  fieldPath: string[];
  operator: string;
  value: any;
  compiled: ConditionFunction;
}

interface ParsedAction {
  type: string;
  params: Record<string, any>;
  compiled: ActionFunction;
}

type ConditionFunction = (context: EvaluationContext) => boolean;
type ActionFunction = (context: EvaluationContext) => ActionResult;

interface EvaluationContext {
  user: any;
  context: any;
}

interface ActionResult {
  type: string;
  params: Record<string, any>;
}
```

### 2. Condition Evaluator Service

```typescript
// apps/rules-engine/src/services/condition-evaluator.service.ts
import { Injectable } from '@nestjs/common';
import { RuleParserService } from './rule-parser.service';
import { OperatorRegistry } from '../evaluators/operator-registry';
import { EvaluationContext, ParsedCondition } from '../interfaces/rule.interface';

@Injectable()
export class ConditionEvaluatorService {
  constructor(
    private readonly parser: RuleParserService,
    private readonly operatorRegistry: OperatorRegistry
  ) {}

  /**
   * Evaluate rule condition against context
   */
  async evaluate(
    condition: ParsedCondition,
    context: EvaluationContext
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      const result = await this.evaluateCondition(condition, context);

      const evaluationTime = Date.now() - startTime;

      // Log slow evaluations
      if (evaluationTime > 100) {
        console.warn(`Slow condition evaluation: ${evaluationTime}ms`);
      }

      return result;
    } catch (error) {
      console.error('Condition evaluation error:', error);
      throw error;
    }
  }

  /**
   * Recursively evaluate condition tree
   */
  private async evaluateCondition(
    condition: ParsedCondition,
    context: EvaluationContext
  ): Promise<boolean> {
    const { operator, conditions } = condition;

    switch (operator) {
      case 'and':
        return this.evaluateAnd(conditions, context);

      case 'or':
        return this.evaluateOr(conditions, context);

      case 'not':
        return this.evaluateNot(conditions[0], context);

      default:
        throw new Error(`Unknown logical operator: ${operator}`);
    }
  }

  /**
   * Evaluate AND condition (all must be true)
   */
  private async evaluateAnd(
    conditions: any[],
    context: EvaluationContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateSingleCondition(condition, context);

      // Short-circuit: return false immediately if any condition fails
      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate OR condition (at least one must be true)
   */
  private async evaluateOr(
    conditions: any[],
    context: EvaluationContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateSingleCondition(condition, context);

      // Short-circuit: return true immediately if any condition passes
      if (result) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate NOT condition (negate result)
   */
  private async evaluateNot(
    condition: any,
    context: EvaluationContext
  ): Promise<boolean> {
    const result = await this.evaluateSingleCondition(condition, context);
    return !result;
  }

  /**
   * Evaluate single condition (can be nested or leaf)
   */
  private async evaluateSingleCondition(
    condition: any,
    context: EvaluationContext
  ): Promise<boolean> {
    // Nested logical condition
    if (condition.operator && ['and', 'or', 'not'].includes(condition.operator)) {
      return this.evaluateCondition(condition, context);
    }

    // Leaf condition
    return this.evaluateLeafCondition(condition, context);
  }

  /**
   * Evaluate leaf condition (comparison)
   */
  private async evaluateLeafCondition(
    condition: any,
    context: EvaluationContext
  ): Promise<boolean> {
    const { field, operator, value } = condition;

    // Get field value from context
    const fieldValue = this.getFieldValue(context, field);

    // Get operator function from registry
    const operatorFn = this.operatorRegistry.getOperator(operator);

    if (!operatorFn) {
      throw new Error(`Unknown operator: ${operator}`);
    }

    // Execute operator
    return operatorFn(fieldValue, value, context);
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(context: EvaluationContext, field: string): any {
    const parts = field.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      current = current[part];
    }

    return current;
  }
}
```

### 3. Operator Registry

```typescript
// apps/rules-engine/src/evaluators/operator-registry.ts
import { Injectable } from '@nestjs/common';

export type OperatorFunction = (
  fieldValue: any,
  expectedValue: any,
  context?: any
) => boolean;

@Injectable()
export class OperatorRegistry {
  private operators: Map<string, OperatorFunction> = new Map();

  constructor() {
    this.registerDefaultOperators();
  }

  /**
   * Register default operators
   */
  private registerDefaultOperators(): void {
    // Comparison operators
    this.register('==', (a, b) => a === b);
    this.register('!=', (a, b) => a !== b);
    this.register('>', (a, b) => a > b);
    this.register('<', (a, b) => a < b);
    this.register('>=', (a, b) => a >= b);
    this.register('<=', (a, b) => a <= b);

    // Array operators
    this.register('in', (a, b) => Array.isArray(b) && b.includes(a));
    this.register('not_in', (a, b) => Array.isArray(b) && !b.includes(a));

    // String operators
    this.register('contains', (a, b) => {
      if (typeof a === 'string') return a.includes(b);
      if (Array.isArray(a)) return a.includes(b);
      return false;
    });

    this.register('not_contains', (a, b) => {
      if (typeof a === 'string') return !a.includes(b);
      if (Array.isArray(a)) return !a.includes(b);
      return true;
    });

    this.register('starts_with', (a, b) =>
      typeof a === 'string' && a.startsWith(b)
    );

    this.register('ends_with', (a, b) =>
      typeof a === 'string' && a.endsWith(b)
    );

    this.register('regex', (a, b) => {
      if (typeof a !== 'string') return false;
      const regex = new RegExp(b);
      return regex.test(a);
    });

    // Existence operators
    this.register('exists', (a, b) =>
      b ? (a !== undefined && a !== null) : (a === undefined || a === null)
    );

    // Date operators
    this.register('date_before', (a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA < dateB;
    });

    this.register('date_after', (a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA > dateB;
    });

    this.register('date_between', (a, b) => {
      if (!Array.isArray(b) || b.length !== 2) return false;
      const dateA = new Date(a);
      const start = new Date(b[0]);
      const end = new Date(b[1]);
      return dateA >= start && dateA <= end;
    });

    // Custom operators
    this.register('day_of_week', (a, b) => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[new Date().getDay()];

      if (Array.isArray(b)) {
        return b.map(d => d.toLowerCase()).includes(currentDay);
      }

      return currentDay === b.toLowerCase();
    });

    this.register('time_between', (a, b) => {
      if (!Array.isArray(b) || b.length !== 2) return false;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [startStr, endStr] = b;
      const [startHour, startMinute] = startStr.split(':').map(Number);
      const [endHour, endMinute] = endStr.split(':').map(Number);

      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      return currentTime >= startTime && currentTime <= endTime;
    });

    this.register('array_length', (a, b) => {
      if (!Array.isArray(a)) return false;

      if (typeof b === 'number') {
        return a.length === b;
      }

      if (typeof b === 'object') {
        const { min, max } = b;

        if (min !== undefined && a.length < min) return false;
        if (max !== undefined && a.length > max) return false;

        return true;
      }

      return false;
    });

    this.register('mod', (a, b) => {
      if (typeof a !== 'number' || !Array.isArray(b) || b.length !== 2) {
        return false;
      }

      const [divisor, remainder] = b;
      return a % divisor === remainder;
    });
  }

  /**
   * Register custom operator
   */
  register(name: string, fn: OperatorFunction): void {
    this.operators.set(name, fn);
  }

  /**
   * Get operator function
   */
  getOperator(name: string): OperatorFunction | undefined {
    return this.operators.get(name);
  }

  /**
   * Check if operator exists
   */
  hasOperator(name: string): boolean {
    return this.operators.has(name);
  }

  /**
   * Get all registered operator names
   */
  getOperatorNames(): string[] {
    return Array.from(this.operators.keys());
  }
}
```

### 4. Action Executor Service

```typescript
// apps/rules-engine/src/services/action-executor.service.ts
import { Injectable } from '@nestjs/common';
import { ActionRegistry } from '../executors/action-registry';
import { EvaluationContext, ActionResult } from '../interfaces/rule.interface';

@Injectable()
export class ActionExecutorService {
  constructor(
    private readonly actionRegistry: ActionRegistry
  ) {}

  /**
   * Execute rule action
   */
  async execute(
    action: any,
    context: EvaluationContext
  ): Promise<ActionResult> {
    const { type, params } = action;

    // Get action handler from registry
    const handler = this.actionRegistry.getAction(type);

    if (!handler) {
      throw new Error(`Unknown action type: ${type}`);
    }

    // Interpolate params with context
    const interpolatedParams = this.interpolateParams(params, context);

    // Execute action
    return handler(interpolatedParams, context);
  }

  /**
   * Interpolate params with context values
   */
  private interpolateParams(
    params: Record<string, any>,
    context: EvaluationContext
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.includes('${')) {
        result[key] = this.interpolateString(value, context);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.interpolateParams(value, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Interpolate template string
   */
  private interpolateString(template: string, context: EvaluationContext): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const value = this.getFieldValue(context, path.trim());
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Get field value from context
   */
  private getFieldValue(context: any, field: string): any {
    const parts = field.split('.');
    let current = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
```

### 5. Action Registry

```typescript
// apps/rules-engine/src/executors/action-registry.ts
import { Injectable } from '@nestjs/common';

export type ActionHandler = (
  params: Record<string, any>,
  context: any
) => Promise<ActionResult> | ActionResult;

export interface ActionResult {
  type: string;
  params: Record<string, any>;
  success: boolean;
  message?: string;
  data?: any;
}

@Injectable()
export class ActionRegistry {
  private actions: Map<string, ActionHandler> = new Map();

  constructor() {
    this.registerDefaultActions();
  }

  /**
   * Register default actions
   */
  private registerDefaultActions(): void {
    // Award points action
    this.register('award_points', async (params) => {
      return {
        type: 'award_points',
        params: {
          userId: params.userId,
          currency: params.currency,
          amount: params.amount,
          reason: params.reason || 'Rule triggered'
        },
        success: true,
        message: `Awarded ${params.amount} ${params.currency}`
      };
    });

    // Apply multiplier action
    this.register('apply_multiplier', async (params) => {
      return {
        type: 'apply_multiplier',
        params: {
          multiplier: params.multiplier,
          currencies: params.currencies || [],
          duration: params.duration
        },
        success: true,
        message: `Applied ${params.multiplier}x multiplier`
      };
    });

    // Unlock achievement action
    this.register('unlock_achievement', async (params) => {
      return {
        type: 'unlock_achievement',
        params: {
          userId: params.userId,
          achievementId: params.achievementId
        },
        success: true,
        message: `Unlocked achievement: ${params.achievementId}`
      };
    });

    // Trigger event action
    this.register('trigger_event', async (params) => {
      return {
        type: 'trigger_event',
        params: {
          eventType: params.eventType,
          eventData: params.eventData || {}
        },
        success: true,
        message: `Triggered event: ${params.eventType}`
      };
    });

    // Send notification action
    this.register('send_notification', async (params) => {
      return {
        type: 'send_notification',
        params: {
          userId: params.userId,
          template: params.template,
          data: params.data || {}
        },
        success: true,
        message: `Sent notification: ${params.template}`
      };
    });

    // Grant item action
    this.register('grant_item', async (params) => {
      return {
        type: 'grant_item',
        params: {
          userId: params.userId,
          itemId: params.itemId,
          quantity: params.quantity || 1
        },
        success: true,
        message: `Granted item: ${params.itemId}`
      };
    });

    // Update user property action
    this.register('update_user_property', async (params) => {
      return {
        type: 'update_user_property',
        params: {
          userId: params.userId,
          property: params.property,
          value: params.value,
          operation: params.operation || 'set'
        },
        success: true,
        message: `Updated user property: ${params.property}`
      };
    });
  }

  /**
   * Register custom action
   */
  register(type: string, handler: ActionHandler): void {
    this.actions.set(type, handler);
  }

  /**
   * Get action handler
   */
  getAction(type: string): ActionHandler | undefined {
    return this.actions.get(type);
  }

  /**
   * Check if action exists
   */
  hasAction(type: string): boolean {
    return this.actions.has(type);
  }

  /**
   * Get all registered action types
   */
  getActionTypes(): string[] {
    return Array.from(this.actions.keys());
  }
}
```

### 6. Rule Cache Service

```typescript
// apps/rules-engine/src/services/rule-cache.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Rule } from '@gamification-api/models';

@Injectable()
export class RuleCacheService {
  private readonly TTL = 300; // 5 minutes
  private readonly EVALUATION_CACHE_TTL = 60; // 1 minute

  constructor(
    @InjectRedis() private readonly redis: Redis
  ) {}

  /**
   * Get rule from cache
   */
  async getRule(ruleId: string): Promise<Rule | null> {
    const key = `rule:${ruleId}`;
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached rule:', error);
      return null;
    }
  }

  /**
   * Set rule in cache
   */
  async setRule(rule: Rule): Promise<void> {
    const key = `rule:${rule.id}`;
    await this.redis.setex(
      key,
      this.TTL,
      JSON.stringify(rule)
    );
  }

  /**
   * Get all active rules for tenant
   */
  async getActiveRules(tenantId: string): Promise<Rule[] | null> {
    const key = `rules:active:${tenantId}`;
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached active rules:', error);
      return null;
    }
  }

  /**
   * Set active rules for tenant
   */
  async setActiveRules(tenantId: string, rules: Rule[]): Promise<void> {
    const key = `rules:active:${tenantId}`;
    await this.redis.setex(
      key,
      this.TTL,
      JSON.stringify(rules)
    );
  }

  /**
   * Cache evaluation result
   */
  async cacheEvaluationResult(
    ruleId: string,
    contextHash: string,
    result: any
  ): Promise<void> {
    const key = `eval:${ruleId}:${contextHash}`;
    await this.redis.setex(
      key,
      this.EVALUATION_CACHE_TTL,
      JSON.stringify(result)
    );
  }

  /**
   * Get cached evaluation result
   */
  async getCachedEvaluationResult(
    ruleId: string,
    contextHash: string
  ): Promise<any | null> {
    const key = `eval:${ruleId}:${contextHash}`;
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached evaluation:', error);
      return null;
    }
  }

  /**
   * Invalidate rule cache
   */
  async invalidateRule(ruleId: string): Promise<void> {
    const key = `rule:${ruleId}`;
    await this.redis.del(key);

    // Also invalidate evaluation cache for this rule
    const pattern = `eval:${ruleId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Invalidate all rules for tenant
   */
  async invalidateTenantRules(tenantId: string): Promise<void> {
    const key = `rules:active:${tenantId}`;
    await this.redis.del(key);
  }

  /**
   * Generate context hash for caching
   */
  generateContextHash(context: any): string {
    const crypto = require('crypto');
    const contextStr = JSON.stringify(context);
    return crypto.createHash('sha256').update(contextStr).digest('hex').substring(0, 16);
  }
}
```

### 7. Rules Service (Main)

```typescript
// apps/rules-engine/src/services/rules.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rule, RuleDocument } from '@gamification-api/models';
import { RuleParserService } from './rule-parser.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ActionExecutorService } from './action-executor.service';
import { RuleCacheService } from './rule-cache.service';
import { VersionManagerService } from './version-manager.service';

@Injectable()
export class RulesService {
  constructor(
    @InjectModel(Rule.name) private readonly ruleModel: Model<RuleDocument>,
    private readonly parser: RuleParserService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly cache: RuleCacheService,
    private readonly versionManager: VersionManagerService
  ) {}

  /**
   * Create new rule
   */
  async create(createRuleDto: any, tenantId: string, userId: string): Promise<Rule> {
    // Parse and validate
    const parsedCondition = this.parser.parseCondition(createRuleDto.condition);
    const parsedAction = this.parser.parseAction(createRuleDto.action);

    // Generate ID
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create rule
    const rule = new this.ruleModel({
      id: ruleId,
      tenantId,
      name: createRuleDto.name,
      description: createRuleDto.description,
      type: createRuleDto.type,
      priority: createRuleDto.priority || 0,
      enabled: createRuleDto.enabled || false,
      condition: createRuleDto.condition,
      action: createRuleDto.action,
      validFrom: createRuleDto.validFrom,
      validUntil: createRuleDto.validUntil,
      tags: createRuleDto.tags || [],
      metadata: createRuleDto.metadata || {},
      stats: {
        evaluationCount: 0,
        successCount: 0,
        failureCount: 0,
        averageLatency: 0
      },
      createdBy: userId,
      updatedBy: userId
    });

    await rule.save();

    // Create initial version
    await this.versionManager.createVersion(rule, userId, 'Initial creation');

    // Cache invalidation
    await this.cache.invalidateTenantRules(tenantId);

    return rule.toObject();
  }

  /**
   * Get rule by ID
   */
  async findById(ruleId: string, tenantId: string): Promise<Rule> {
    // Check cache first
    const cached = await this.cache.getRule(ruleId);
    if (cached && cached.tenantId === tenantId) {
      return cached;
    }

    // Query database
    const rule = await this.ruleModel
      .findOne({ id: ruleId, tenantId })
      .exec();

    if (!rule) {
      throw new NotFoundException(`Rule ${ruleId} not found`);
    }

    // Cache for future requests
    await this.cache.setRule(rule.toObject());

    return rule.toObject();
  }

  /**
   * List rules with filters
   */
  async findAll(
    tenantId: string,
    filters: any = {},
    pagination: any = {}
  ): Promise<{ data: Rule[]; total: number }> {
    const { limit = 50, offset = 0 } = pagination;

    // Build query
    const query: any = { tenantId, archivedAt: { $exists: false } };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.enabled !== undefined) {
      query.enabled = filters.enabled;
    }

    if (filters.tags) {
      query.tags = { $in: filters.tags };
    }

    if (filters.priority !== undefined) {
      query.priority = { $gte: filters.priority };
    }

    if (filters.validAt) {
      const validAt = new Date(filters.validAt);
      query.$or = [
        { validFrom: { $exists: false }, validUntil: { $exists: false } },
        { validFrom: { $lte: validAt }, validUntil: { $gte: validAt } },
        { validFrom: { $lte: validAt }, validUntil: { $exists: false } },
        { validFrom: { $exists: false }, validUntil: { $gte: validAt } }
      ];
    }

    // Execute query
    const [rules, total] = await Promise.all([
      this.ruleModel
        .find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.ruleModel.countDocuments(query)
    ]);

    return {
      data: rules.map(r => r.toObject()),
      total
    };
  }

  /**
   * Update rule
   */
  async update(
    ruleId: string,
    tenantId: string,
    updateDto: any,
    userId: string
  ): Promise<Rule> {
    const rule = await this.ruleModel.findOne({ id: ruleId, tenantId });

    if (!rule) {
      throw new NotFoundException(`Rule ${ruleId} not found`);
    }

    // Validate new condition/action if provided
    if (updateDto.condition) {
      this.parser.parseCondition(updateDto.condition);
    }

    if (updateDto.action) {
      this.parser.parseAction(updateDto.action);
    }

    // Track changes
    const changes: any[] = [];
    for (const [key, value] of Object.entries(updateDto)) {
      if (rule[key] !== value) {
        changes.push({
          field: key,
          previousValue: rule[key],
          newValue: value
        });
        rule[key] = value;
      }
    }

    // Increment version
    rule.version += 1;
    rule.updatedBy = userId;

    await rule.save();

    // Create version snapshot
    if (changes.length > 0) {
      await this.versionManager.createVersion(
        rule,
        userId,
        `Updated: ${changes.map(c => c.field).join(', ')}`
      );
    }

    // Invalidate cache
    await this.cache.invalidateRule(ruleId);
    await this.cache.invalidateTenantRules(tenantId);

    return rule.toObject();
  }

  /**
   * Soft delete rule
   */
  async delete(ruleId: string, tenantId: string): Promise<void> {
    const rule = await this.ruleModel.findOne({ id: ruleId, tenantId });

    if (!rule) {
      throw new NotFoundException(`Rule ${ruleId} not found`);
    }

    rule.archivedAt = new Date();
    await rule.save();

    // Invalidate cache
    await this.cache.invalidateRule(ruleId);
    await this.cache.invalidateTenantRules(tenantId);
  }

  /**
   * Evaluate single rule
   */
  async evaluateRule(
    ruleId: string,
    tenantId: string,
    context: any,
    options: any = {}
  ): Promise<any> {
    const startTime = Date.now();

    // Get rule
    const rule = await this.findById(ruleId, tenantId);

    // Check if rule is enabled
    if (!rule.enabled && !options.ignoreEnabled) {
      return {
        ruleId,
        matched: false,
        reason: 'Rule is disabled'
      };
    }

    // Check validity period
    if (!this.isRuleValid(rule)) {
      return {
        ruleId,
        matched: false,
        reason: 'Rule is not valid at this time'
      };
    }

    // Check cache (if deterministic)
    if (!options.skipCache) {
      const contextHash = this.cache.generateContextHash(context);
      const cached = await this.cache.getCachedEvaluationResult(ruleId, contextHash);

      if (cached) {
        return {
          ...cached,
          cacheHit: true
        };
      }
    }

    // Parse condition and action
    const parsedCondition = this.parser.parseCondition(rule.condition);
    const parsedAction = this.parser.parseAction(rule.action);

    // Evaluate condition
    const matched = await this.conditionEvaluator.evaluate(parsedCondition, context);

    let result = null;
    if (matched) {
      // Execute action
      result = await this.actionExecutor.execute(parsedAction, context);
    }

    const evaluationTime = Date.now() - startTime;

    // Update stats
    await this.updateRuleStats(ruleId, matched, evaluationTime);

    const response = {
      ruleId,
      matched,
      result,
      evaluationTime,
      timestamp: new Date(),
      cacheHit: false
    };

    // Cache result
    if (!options.skipCache) {
      const contextHash = this.cache.generateContextHash(context);
      await this.cache.cacheEvaluationResult(ruleId, contextHash, response);
    }

    return response;
  }

  /**
   * Evaluate multiple rules
   */
  async evaluateRules(
    tenantId: string,
    context: any,
    options: any = {}
  ): Promise<any> {
    const startTime = Date.now();

    // Get active rules
    const filters = {
      enabled: true,
      type: options.ruleTypes,
      validAt: new Date()
    };

    const { data: rules } = await this.findAll(tenantId, filters, {
      limit: options.maxRules || 100,
      offset: 0
    });

    // Sort by priority
    rules.sort((a, b) => b.priority - a.priority);

    const matched: any[] = [];
    let rulesEvaluated = 0;

    for (const rule of rules) {
      const result = await this.evaluateRule(rule.id, tenantId, context, options);

      rulesEvaluated++;

      if (result.matched) {
        matched.push({
          ruleId: rule.id,
          ruleName: rule.name,
          priority: rule.priority,
          result: result.result
        });

        // Stop on first match if requested
        if (options.stopOnFirstMatch) {
          break;
        }
      }
    }

    const evaluationTime = Date.now() - startTime;

    return {
      matched,
      evaluationTime,
      rulesEvaluated,
      rulesMatched: matched.length
    };
  }

  /**
   * Check if rule is currently valid
   */
  private isRuleValid(rule: Rule): boolean {
    const now = new Date();

    if (rule.validFrom && now < rule.validFrom) {
      return false;
    }

    if (rule.validUntil && now > rule.validUntil) {
      return false;
    }

    return true;
  }

  /**
   * Update rule statistics
   */
  private async updateRuleStats(
    ruleId: string,
    matched: boolean,
    evaluationTime: number
  ): Promise<void> {
    await this.ruleModel.updateOne(
      { id: ruleId },
      {
        $inc: {
          'stats.evaluationCount': 1,
          'stats.successCount': matched ? 1 : 0,
          'stats.failureCount': matched ? 0 : 1
        },
        $set: {
          'stats.lastEvaluatedAt': new Date(),
          'stats.averageLatency': evaluationTime // Simplified - should use moving average
        }
      }
    );
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// apps/rules-engine/src/services/rule-parser.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RuleParserService } from './rule-parser.service';

describe('RuleParserService', () => {
  let service: RuleParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RuleParserService]
    }).compile();

    service = module.get<RuleParserService>(RuleParserService);
  });

  describe('parseCondition', () => {
    it('should parse simple AND condition', () => {
      const condition = {
        operator: 'and',
        conditions: [
          { field: 'user.level', operator: '>=', value: 10 },
          { field: 'user.points', operator: '>', value: 1000 }
        ]
      };

      const parsed = service.parseCondition(condition);

      expect(parsed.operator).toBe('and');
      expect(parsed.conditions).toHaveLength(2);
    });

    it('should parse nested conditions', () => {
      const condition = {
        operator: 'and',
        conditions: [
          { field: 'user.level', operator: '>=', value: 10 },
          {
            operator: 'or',
            conditions: [
              { field: 'user.premium', operator: '==', value: true },
              { field: 'user.points', operator: '>', value: 5000 }
            ]
          }
        ]
      };

      const parsed = service.parseCondition(condition);

      expect(parsed.operator).toBe('and');
      expect(parsed.conditions).toHaveLength(2);
    });

    it('should throw error for invalid operator', () => {
      const condition = {
        operator: 'invalid',
        conditions: []
      };

      expect(() => service.parseCondition(condition)).toThrow();
    });

    it('should validate NOT operator has one condition', () => {
      const condition = {
        operator: 'not',
        conditions: [
          { field: 'user.banned', operator: '==', value: true },
          { field: 'user.suspended', operator: '==', value: true }
        ]
      };

      expect(() => service.parseCondition(condition)).toThrow();
    });
  });

  describe('parseAction', () => {
    it('should parse award_points action', () => {
      const action = {
        type: 'award_points',
        params: {
          amount: 100,
          currency: 'xp'
        }
      };

      const parsed = service.parseAction(action);

      expect(parsed.type).toBe('award_points');
      expect(parsed.params.amount).toBe(100);
    });

    it('should validate action params', () => {
      const action = {
        type: 'award_points',
        params: {
          amount: -100,
          currency: 'xp'
        }
      };

      expect(() => service.parseAction(action)).toThrow();
    });
  });
});
```

### Integration Tests

```typescript
// apps/rules-engine/src/services/rules.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RulesService } from './rules.service';
import { Rule } from '@gamification-api/models';

describe('RulesService Integration', () => {
  let service: RulesService;
  let ruleModel: any;

  const mockRule = {
    id: 'rule_test_123',
    tenantId: 'tenant_1',
    name: 'Test Rule',
    type: 'earning',
    priority: 100,
    enabled: true,
    condition: {
      operator: 'and',
      conditions: [
        { field: 'user.level', operator: '>=', value: 5 }
      ]
    },
    action: {
      type: 'award_points',
      params: { amount: 100, currency: 'xp' }
    },
    toObject: function() { return this; }
  };

  beforeEach(async () => {
    ruleModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRule)
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockRule])
      }),
      create: jest.fn().mockResolvedValue(mockRule),
      countDocuments: jest.fn().mockResolvedValue(1)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        {
          provide: getModelToken(Rule.name),
          useValue: ruleModel
        },
        // ... other dependencies
      ]
    }).compile();

    service = module.get<RulesService>(RulesService);
  });

  describe('evaluateRule', () => {
    it('should evaluate rule and match condition', async () => {
      const context = {
        user: { level: 10, id: 'user_123' },
        context: { action: 'post.created' }
      };

      const result = await service.evaluateRule('rule_test_123', 'tenant_1', context);

      expect(result.matched).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.type).toBe('award_points');
    });

    it('should not match when condition fails', async () => {
      const context = {
        user: { level: 3, id: 'user_123' },
        context: { action: 'post.created' }
      };

      const result = await service.evaluateRule('rule_test_123', 'tenant_1', context);

      expect(result.matched).toBe(false);
    });
  });
});
```

### Performance Tests

```typescript
// apps/rules-engine/test/performance/rule-evaluation.perf.spec.ts
import { Test } from '@nestjs/testing';
import { RulesService } from '../../src/services/rules.service';

describe('Rule Evaluation Performance', () => {
  let service: RulesService;

  beforeAll(async () => {
    // Setup test module
    // ...
  });

  it('should evaluate 1000 rules in under 1 second', async () => {
    const context = {
      user: { level: 15, points: 5000 },
      context: { action: 'post.created' }
    };

    const startTime = Date.now();

    // Evaluate 1000 rules
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        service.evaluateRule(`rule_${i}`, 'tenant_1', context)
      );
    }

    await Promise.all(promises);

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });

  it('should cache evaluation results', async () => {
    const context = {
      user: { level: 10 },
      context: { action: 'test' }
    };

    // First evaluation
    const result1 = await service.evaluateRule('rule_test', 'tenant_1', context);
    expect(result1.cacheHit).toBe(false);

    // Second evaluation (should hit cache)
    const result2 = await service.evaluateRule('rule_test', 'tenant_1', context);
    expect(result2.cacheHit).toBe(true);
  });
});
```

---

## Integration Patterns

### Integration with Points Service

```typescript
// Example: Points service listens to rule evaluation events
@Injectable()
export class PointsRuleIntegrationService {
  constructor(
    private readonly pointsService: PointsService,
    private readonly rulesService: RulesService
  ) {}

  /**
   * Process user action through rules engine
   */
  async processUserAction(
    userId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    // Build evaluation context
    const context = {
      user: await this.getUserData(userId),
      context: {
        userId,
        action,
        timestamp: new Date(),
        metadata
      }
    };

    // Evaluate all earning rules
    const result = await this.rulesService.evaluateRules(
      context.user.tenantId,
      context,
      { ruleTypes: ['earning', 'multiplier'] }
    );

    // Process matched rules
    for (const match of result.matched) {
      if (match.result.type === 'award_points') {
        await this.pointsService.awardPoints({
          userId,
          currencyId: match.result.params.currency,
          amount: match.result.params.amount,
          reason: `Rule: ${match.ruleName}`
        });
      }

      if (match.result.type === 'apply_multiplier') {
        await this.pointsService.applyMultiplier({
          userId,
          multiplier: match.result.params.multiplier,
          currencies: match.result.params.currencies,
          duration: match.result.params.duration
        });
      }
    }
  }

  private async getUserData(userId: string): Promise<any> {
    // Fetch user data from account service
    // ...
  }
}
```

### Integration with Achievement Service

```typescript
// Example: Achievement service checks unlock rules
@Injectable()
export class AchievementRuleIntegrationService {
  constructor(
    private readonly achievementService: AchievementService,
    private readonly rulesService: RulesService
  ) {}

  /**
   * Check if user can unlock achievement
   */
  async checkAchievementUnlock(
    userId: string,
    achievementId: string
  ): Promise<boolean> {
    // Get achievement unlock rules
    const { data: rules } = await this.rulesService.findAll(
      'tenant_1',
      {
        type: 'unlock',
        enabled: true,
        tags: [`achievement:${achievementId}`]
      }
    );

    if (rules.length === 0) {
      return false;
    }

    // Build context
    const context = {
      user: await this.getUserData(userId),
      context: {
        achievementId,
        timestamp: new Date()
      }
    };

    // Evaluate unlock rules
    for (const rule of rules) {
      const result = await this.rulesService.evaluateRule(
        rule.id,
        'tenant_1',
        context
      );

      if (result.matched) {
        return true;
      }
    }

    return false;
  }

  private async getUserData(userId: string): Promise<any> {
    // Fetch user data
    // ...
  }
}
```

---

## Performance Optimization

### Multi-tier Caching Strategy

```typescript
// 1. Redis Cache (L1) - Hot rules
// 2. In-Memory Cache (L2) - Frequently accessed
// 3. Database (L3) - Cold storage

@Injectable()
export class OptimizedRuleCacheService extends RuleCacheService {
  private memoryCache: Map<string, { rule: Rule; expiry: number }> = new Map();
  private readonly MEMORY_CACHE_TTL = 60000; // 1 minute

  async getRule(ruleId: string): Promise<Rule | null> {
    // Check memory cache first (L1)
    const memoryCached = this.memoryCache.get(ruleId);
    if (memoryCached && memoryCached.expiry > Date.now()) {
      return memoryCached.rule;
    }

    // Check Redis cache (L2)
    const redisCached = await super.getRule(ruleId);
    if (redisCached) {
      // Populate memory cache
      this.memoryCache.set(ruleId, {
        rule: redisCached,
        expiry: Date.now() + this.MEMORY_CACHE_TTL
      });
      return redisCached;
    }

    return null;
  }
}
```

### Rule Compilation

```typescript
// Pre-compile rules for faster evaluation
@Injectable()
export class RuleCompilerService {
  private compiledRules: Map<string, CompiledRule> = new Map();

  /**
   * Compile rule for faster evaluation
   */
  compileRule(rule: Rule): CompiledRule {
    if (this.compiledRules.has(rule.id)) {
      return this.compiledRules.get(rule.id)!;
    }

    const compiled = {
      id: rule.id,
      conditionFn: this.compileCondition(rule.condition),
      actionFn: this.compileAction(rule.action),
      metadata: {
        priority: rule.priority,
        type: rule.type
      }
    };

    this.compiledRules.set(rule.id, compiled);
    return compiled;
  }

  private compileCondition(condition: any): (context: any) => boolean {
    // Generate optimized function
    return new Function('context', `
      const { user, context: ctx } = context;
      ${this.generateConditionCode(condition)}
    `) as any;
  }

  private generateConditionCode(condition: any): string {
    // Generate JavaScript code for condition
    // This is a simplified example
    if (condition.operator === 'and') {
      const checks = condition.conditions
        .map(c => this.generateConditionCode(c))
        .join(' && ');
      return `(${checks})`;
    }

    // ... other operators
    return `user.${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`;
  }

  private compileAction(action: any): (context: any) => any {
    // Generate action function
    return new Function('context', `
      return {
        type: '${action.type}',
        params: ${JSON.stringify(action.params)}
      };
    `) as any;
  }
}

interface CompiledRule {
  id: string;
  conditionFn: (context: any) => boolean;
  actionFn: (context: any) => any;
  metadata: {
    priority: number;
    type: string;
  };
}
```

---

## Deployment Guide

### Environment Variables

```bash
# .env
NODE_ENV=production
PORT=3003

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gamification-rules
MONGODB_POOL_SIZE=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=2
REDIS_KEY_PREFIX=rules:

# Performance
RULE_CACHE_TTL=300
EVALUATION_CACHE_TTL=60
MAX_CONCURRENT_EVALUATIONS=100

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/apps/rules-engine ./

EXPOSE 3003

CMD ["node", "main.js"]
```

### Kubernetes Deployment

```yaml
# k8s/rules-engine-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rules-engine
  labels:
    app: rules-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rules-engine
  template:
    metadata:
      labels:
        app: rules-engine
    spec:
      containers:
      - name: rules-engine
        image: gamification/rules-engine:latest
        ports:
        - containerPort: 3003
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: connection-string
        - name: REDIS_HOST
          value: redis-service
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3003
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rules-engine-service
spec:
  selector:
    app: rules-engine
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3003
  type: LoadBalancer
```

---

## Summary

This comprehensive specification provides:

1. **Complete API**: 20+ endpoints for rule management, evaluation, testing, versioning, and A/B testing
2. **Robust Architecture**: NestJS-based microservice with Redis caching and MongoDB persistence
3. **Flexible DSL**: JSON-based rule language supporting complex conditions (AND/OR/NOT) and custom operators
4. **High Performance**: Multi-tier caching achieving 1000+ rules/second evaluation
5. **Version Control**: Complete rule history with rollback capability
6. **Testing Support**: Rule simulation and validation before deployment
7. **A/B Testing**: Built-in experimentation framework
8. **Integration Ready**: Clear patterns for Points, Achievement, and Quest services
9. **Production Ready**: Docker/Kubernetes deployment with monitoring

**Implementation Priority**: Phase 1 - P0 (Start immediately as foundation for other services)

**Estimated Complexity**: High (2-3 weeks for core functionality)

**Dependencies**: MongoDB, Redis, NestJS infrastructure

**Next Steps**:
1. Review and approve specification
2. Set up project structure in Nx monorepo
3. Implement core parser and evaluator (Week 1)
4. Add caching and optimization (Week 2)
5. Integrate with Points and Achievement services (Week 3)
6. Performance testing and optimization
