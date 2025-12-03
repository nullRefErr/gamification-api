# Points & Rewards Service - Implementation Specification

**Service**: Points & Rewards Service
**Version**: 1.0.0
**Status**: Specification
**Last Updated**: 2025-11-30

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Complete API Specification](#complete-api-specification)
3. [Database Design](#database-design)
4. [NestJS Implementation Architecture](#nestjs-implementation-architecture)
5. [Complete Code Examples](#complete-code-examples)
6. [Testing Specifications](#testing-specifications)
7. [Integration Patterns](#integration-patterns)
8. [Real-World Considerations](#real-world-considerations)

---

## Service Overview

### Purpose
The Points & Rewards Service is the economic foundation of the gamification platform, managing multiple virtual currencies, user wallets, transactions, and earning rules. It provides ACID-compliant transaction processing with audit trails and supports complex currency exchange mechanisms.

### Core Responsibilities
- **Multi-Currency Management**: Support unlimited virtual currencies (XP, coins, gems, premium currency)
- **Wallet Operations**: User balance tracking with atomic updates
- **Transaction Processing**: ACID-compliant earn/spend/exchange operations
- **Earning Rules Engine**: Dynamic point calculation based on user actions
- **Audit Trail**: Complete transaction history for compliance and debugging
- **Currency Exchange**: Inter-currency conversion with configurable rates
- **Balance Consistency**: Prevent double-spend, negative balances, race conditions

### Multi-Currency System Design

The service supports multiple currency types serving different game economy purposes:

```typescript
enum CurrencyType {
  EXPERIENCE = 'experience',    // Progress currency (XP, levels)
  SOFT = 'soft',                 // Earned through gameplay (coins, gold)
  HARD = 'hard',                 // Premium/purchased (gems, diamonds)
  PREMIUM = 'premium',           // Real money equivalent
  EVENT = 'event',               // Limited-time event currency
  SOCIAL = 'social'              // Friendship/gifting currency
}
```

**Currency Characteristics**:
- **Experience**: Non-transferable, drives leveling, never spent
- **Soft Currency**: Earned freely, spent on common items, can decay
- **Hard Currency**: Scarce, purchased with real money, never decays
- **Premium**: Direct real-money value, strict audit requirements
- **Event**: Time-limited, expires after event ends
- **Social**: Earned through social interactions, gifting only

### Key Features
- **Atomic Transactions**: All balance changes are ACID-compliant
- **Optimistic Locking**: Prevent race conditions using version numbers
- **Transaction Rollback**: Full rollback capability for failed operations
- **Idempotency**: Duplicate transaction prevention using idempotency keys
- **Real-Time Events**: Emit events for point changes (Achievement integration)
- **Currency Decay**: Automatic expiration and decay calculations
- **Earning Multipliers**: Streak bonuses, time-based multipliers, event boosts
- **Transaction Limits**: Configurable min/max transaction amounts
- **Fraud Detection**: Anomaly detection for suspicious transactions

---

## Complete API Specification

### Base URL
```
/api/v1/points-rewards
```

### Authentication
All endpoints require valid JWT token in `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### Common Error Codes
```typescript
enum ErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CURRENCY_NOT_FOUND = 'CURRENCY_NOT_FOUND',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  EARNING_RULE_NOT_FOUND = 'EARNING_RULE_NOT_FOUND',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE',
  EXCHANGE_RATE_INVALID = 'EXCHANGE_RATE_INVALID',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION'
}
```

---

### 1. Wallet Management Endpoints

#### 1.1 Get User Wallet
```typescript
GET /wallets/:userId

Response: 200 OK
{
  "userId": "string",
  "balances": {
    "xp": 1500,
    "coins": 2500,
    "gems": 50
  },
  "walletVersion": 42,
  "lastTransactionAt": "2025-11-30T12:00:00Z",
  "createdAt": "2025-01-01T00:00:00Z"
}

Error: 404 Not Found
{
  "error": "WALLET_NOT_FOUND",
  "message": "No wallet found for user 123"
}
```

#### 1.2 Get Wallet Balance for Specific Currency
```typescript
GET /wallets/:userId/currencies/:currencyId

Response: 200 OK
{
  "userId": "string",
  "currencyId": "xp",
  "balance": 1500,
  "currency": {
    "id": "xp",
    "name": "Experience Points",
    "symbol": "XP",
    "type": "experience",
    "decimals": 0
  }
}
```

#### 1.3 Initialize Wallet
```typescript
POST /wallets/:userId/initialize

Request Body:
{
  "initialBalances": {
    "coins": 100,
    "xp": 0
  }
}

Response: 201 Created
{
  "userId": "string",
  "balances": {
    "coins": 100,
    "xp": 0
  },
  "walletVersion": 1,
  "createdAt": "2025-11-30T12:00:00Z"
}

Error: 409 Conflict
{
  "error": "WALLET_ALREADY_EXISTS",
  "message": "Wallet already initialized for user 123"
}
```

---

### 2. Transaction Endpoints

#### 2.1 Earn Points
```typescript
POST /wallets/:userId/earn

Request Body:
{
  "currencyId": "xp",
  "amount": 100,
  "reason": "Quest completed",
  "metadata": {
    "questId": "quest-123",
    "actionType": "quest.completed"
  },
  "idempotencyKey": "unique-key-12345"  // Optional, prevents duplicates
}

Response: 200 OK
{
  "transaction": {
    "id": "txn-123",
    "userId": "user-456",
    "currencyId": "xp",
    "amount": 100,
    "type": "earn",
    "reason": "Quest completed",
    "balanceBefore": 1000,
    "balanceAfter": 1100,
    "metadata": {
      "questId": "quest-123",
      "actionType": "quest.completed"
    },
    "timestamp": "2025-11-30T12:00:00Z"
  },
  "wallet": {
    "userId": "user-456",
    "balances": {
      "xp": 1100
    },
    "walletVersion": 43
  }
}

Error: 400 Bad Request
{
  "error": "INVALID_AMOUNT",
  "message": "Amount must be positive"
}

Error: 409 Conflict
{
  "error": "DUPLICATE_TRANSACTION",
  "message": "Transaction with idempotency key already processed"
}
```

#### 2.2 Spend Points
```typescript
POST /wallets/:userId/spend

Request Body:
{
  "currencyId": "coins",
  "amount": 500,
  "reason": "Item purchased",
  "metadata": {
    "itemId": "item-789",
    "shopCategory": "weapons"
  },
  "idempotencyKey": "unique-key-67890"
}

Response: 200 OK
{
  "transaction": {
    "id": "txn-124",
    "userId": "user-456",
    "currencyId": "coins",
    "amount": -500,
    "type": "spend",
    "reason": "Item purchased",
    "balanceBefore": 2500,
    "balanceAfter": 2000,
    "metadata": {
      "itemId": "item-789",
      "shopCategory": "weapons"
    },
    "timestamp": "2025-11-30T12:01:00Z"
  },
  "wallet": {
    "userId": "user-456",
    "balances": {
      "coins": 2000
    },
    "walletVersion": 44
  }
}

Error: 400 Bad Request
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Required 500 coins, available 200 coins"
}
```

#### 2.3 Exchange Currency
```typescript
POST /wallets/:userId/exchange

Request Body:
{
  "fromCurrencyId": "coins",
  "toCurrencyId": "gems",
  "amount": 1000,
  "metadata": {
    "exchangeReason": "user_initiated"
  }
}

Response: 200 OK
{
  "transactions": [
    {
      "id": "txn-125",
      "currencyId": "coins",
      "amount": -1000,
      "type": "exchange_out",
      "balanceBefore": 2000,
      "balanceAfter": 1000
    },
    {
      "id": "txn-126",
      "currencyId": "gems",
      "amount": 10,
      "type": "exchange_in",
      "balanceBefore": 50,
      "balanceAfter": 60
    }
  ],
  "exchangeRate": {
    "from": "coins",
    "to": "gems",
    "rate": 100,  // 100 coins = 1 gem
    "amountExchanged": 1000,
    "amountReceived": 10
  },
  "wallet": {
    "balances": {
      "coins": 1000,
      "gems": 60
    },
    "walletVersion": 45
  }
}

Error: 400 Bad Request
{
  "error": "EXCHANGE_RATE_INVALID",
  "message": "No exchange rate configured between coins and gems"
}
```

#### 2.4 Grant Points (Admin)
```typescript
POST /wallets/:userId/grant

Headers:
{
  "Authorization": "Bearer <admin_token>",
  "X-Admin-User-Id": "admin-123"
}

Request Body:
{
  "currencyId": "gems",
  "amount": 500,
  "reason": "Compensation for server downtime",
  "metadata": {
    "ticketId": "support-456",
    "grantedBy": "admin-123"
  }
}

Response: 200 OK
{
  "transaction": {
    "id": "txn-127",
    "userId": "user-456",
    "currencyId": "gems",
    "amount": 500,
    "type": "grant",
    "reason": "Compensation for server downtime",
    "balanceBefore": 60,
    "balanceAfter": 560,
    "metadata": {
      "ticketId": "support-456",
      "grantedBy": "admin-123"
    },
    "timestamp": "2025-11-30T12:02:00Z"
  }
}
```

#### 2.5 Get Transaction History
```typescript
GET /wallets/:userId/transactions?limit=50&offset=0&currencyId=xp&type=earn&startDate=2025-11-01&endDate=2025-11-30

Response: 200 OK
{
  "transactions": [
    {
      "id": "txn-123",
      "currencyId": "xp",
      "amount": 100,
      "type": "earn",
      "reason": "Quest completed",
      "balanceBefore": 1000,
      "balanceAfter": 1100,
      "metadata": { "questId": "quest-123" },
      "timestamp": "2025-11-30T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 3. Currency Management Endpoints

#### 3.1 List All Currencies
```typescript
GET /currencies?type=soft&status=active

Response: 200 OK
{
  "currencies": [
    {
      "id": "coins",
      "name": "Gold Coins",
      "symbol": "🪙",
      "type": "soft",
      "decimals": 0,
      "status": "active",
      "decayConfig": {
        "enabled": false
      },
      "exchangeRates": {
        "gems": 100  // 100 coins = 1 gem
      },
      "metadata": {
        "maxBalance": 1000000,
        "iconUrl": "https://cdn.example.com/coins.png"
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### 3.2 Get Currency Details
```typescript
GET /currencies/:currencyId

Response: 200 OK
{
  "id": "xp",
  "name": "Experience Points",
  "symbol": "XP",
  "type": "experience",
  "decimals": 0,
  "status": "active",
  "decayConfig": {
    "enabled": false
  },
  "exchangeRates": {},
  "earningRulesCount": 15,
  "totalSupply": 15000000,
  "totalHolders": 10000,
  "metadata": {
    "description": "Used for leveling up characters",
    "maxBalance": null
  },
  "createdAt": "2025-01-01T00:00:00Z"
}
```

#### 3.3 Create Currency (Admin)
```typescript
POST /currencies

Request Body:
{
  "id": "event-tokens",
  "name": "Winter Event Tokens",
  "symbol": "❄️",
  "type": "event",
  "decimals": 0,
  "decayConfig": {
    "enabled": true,
    "expiresAt": "2025-12-31T23:59:59Z"
  },
  "exchangeRates": {
    "coins": 10  // 1 event token = 10 coins
  },
  "metadata": {
    "eventId": "winter-2025",
    "maxBalance": 10000
  }
}

Response: 201 Created
{
  "id": "event-tokens",
  "name": "Winter Event Tokens",
  "symbol": "❄️",
  "type": "event",
  "status": "active",
  "createdAt": "2025-11-30T12:00:00Z"
}
```

#### 3.4 Update Currency (Admin)
```typescript
PATCH /currencies/:currencyId

Request Body:
{
  "status": "deprecated",
  "exchangeRates": {
    "coins": 5
  }
}

Response: 200 OK
{
  "id": "event-tokens",
  "status": "deprecated",
  "exchangeRates": {
    "coins": 5
  },
  "updatedAt": "2025-11-30T12:03:00Z"
}
```

---

### 4. Earning Rules Configuration Endpoints

#### 4.1 List Earning Rules
```typescript
GET /earning-rules?status=active&currencyId=xp

Response: 200 OK
{
  "rules": [
    {
      "id": "rule-123",
      "name": "Quest Completion XP",
      "action": "quest.completed",
      "currencyId": "xp",
      "baseAmount": 100,
      "multipliers": [
        {
          "condition": "user.level >= 10",
          "factor": 1.5,
          "description": "Level 10+ bonus"
        }
      ],
      "cooldown": 0,
      "status": "active",
      "metadata": {
        "category": "quests"
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### 4.2 Get Earning Rule Details
```typescript
GET /earning-rules/:ruleId

Response: 200 OK
{
  "id": "rule-123",
  "name": "Quest Completion XP",
  "action": "quest.completed",
  "currencyId": "xp",
  "baseAmount": 100,
  "multipliers": [
    {
      "condition": "user.level >= 10",
      "factor": 1.5,
      "description": "Level 10+ bonus"
    },
    {
      "condition": "user.hasActiveBoost('xp_boost')",
      "factor": 2.0,
      "description": "XP Boost active"
    }
  ],
  "cooldown": 0,
  "maxApplicationsPerDay": null,
  "status": "active",
  "usageStats": {
    "totalApplications": 50000,
    "totalAwarded": 7500000,
    "lastApplied": "2025-11-30T11:59:00Z"
  }
}
```

#### 4.3 Create Earning Rule (Admin)
```typescript
POST /earning-rules

Request Body:
{
  "name": "Daily Login Bonus",
  "action": "user.daily_login",
  "currencyId": "coins",
  "baseAmount": 50,
  "multipliers": [
    {
      "condition": "user.loginStreak >= 7",
      "factor": 2.0,
      "description": "Week streak bonus"
    }
  ],
  "cooldown": 86400,  // 24 hours in seconds
  "maxApplicationsPerDay": 1,
  "metadata": {
    "category": "engagement",
    "priority": 1
  }
}

Response: 201 Created
{
  "id": "rule-456",
  "name": "Daily Login Bonus",
  "action": "user.daily_login",
  "status": "active",
  "createdAt": "2025-11-30T12:00:00Z"
}
```

#### 4.4 Evaluate Earning Rule
```typescript
POST /earning-rules/evaluate

Request Body:
{
  "userId": "user-456",
  "action": "quest.completed",
  "metadata": {
    "questId": "quest-123",
    "difficulty": "hard"
  }
}

Response: 200 OK
{
  "applicable": true,
  "rules": [
    {
      "ruleId": "rule-123",
      "ruleName": "Quest Completion XP",
      "baseAmount": 100,
      "appliedMultipliers": [
        {
          "description": "Level 10+ bonus",
          "factor": 1.5
        }
      ],
      "finalAmount": 150,
      "currencyId": "xp"
    }
  ],
  "totalAwarded": {
    "xp": 150
  }
}
```

#### 4.5 Update Earning Rule (Admin)
```typescript
PATCH /earning-rules/:ruleId

Request Body:
{
  "baseAmount": 150,
  "status": "active"
}

Response: 200 OK
{
  "id": "rule-123",
  "baseAmount": 150,
  "status": "active",
  "updatedAt": "2025-11-30T12:04:00Z"
}
```

#### 4.6 Delete Earning Rule (Admin)
```typescript
DELETE /earning-rules/:ruleId

Response: 204 No Content
```

---

### 5. Analytics & Reporting Endpoints

#### 5.1 Get Wallet Summary Statistics
```typescript
GET /wallets/:userId/stats

Response: 200 OK
{
  "userId": "user-456",
  "summary": {
    "totalEarned": {
      "xp": 10000,
      "coins": 5000,
      "gems": 100
    },
    "totalSpent": {
      "coins": 3000,
      "gems": 40
    },
    "netBalance": {
      "xp": 10000,
      "coins": 2000,
      "gems": 60
    },
    "transactionCount": 250,
    "lastActivity": "2025-11-30T12:00:00Z",
    "accountAge": 300  // days
  },
  "topEarningSources": [
    {
      "reason": "Quest completed",
      "count": 50,
      "totalEarned": 7500
    }
  ],
  "topSpendingCategories": [
    {
      "category": "weapons",
      "count": 15,
      "totalSpent": 2000
    }
  ]
}
```

#### 5.2 Get Currency Statistics (Admin)
```typescript
GET /currencies/:currencyId/stats

Response: 200 OK
{
  "currencyId": "coins",
  "totalSupply": 15000000,
  "totalHolders": 10000,
  "averageBalance": 1500,
  "medianBalance": 800,
  "distribution": {
    "top1Percent": 5000000,
    "top10Percent": 10000000
  },
  "transactionStats": {
    "totalTransactions": 500000,
    "totalEarned": 20000000,
    "totalSpent": 5000000,
    "averageTransactionSize": 40
  },
  "period": "all_time"
}
```

---

## Database Design

### MongoDB Schema Definitions

#### 1. Currency Schema
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CurrencyDocument = Currency & Document;

@Schema({ timestamps: true, versionKey: false })
export class Currency {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({
    required: true,
    enum: ['experience', 'soft', 'hard', 'premium', 'event', 'social']
  })
  type: string;

  @Prop({ default: 0 })
  decimals: number;

  @Prop({
    default: 'active',
    enum: ['active', 'deprecated', 'disabled'],
    index: true
  })
  status: string;

  @Prop({ type: Object })
  decayConfig: {
    enabled: boolean;
    decayRate?: number;        // Percentage per period
    decayPeriod?: number;       // Seconds
    expiresAt?: Date;           // Absolute expiration
  };

  @Prop({ type: Map, of: Number })
  exchangeRates: Map<string, number>;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);

// Indexes
CurrencySchema.index({ type: 1, status: 1 });
```

#### 2. UserWallet Schema
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserWalletDocument = UserWallet & Document;

@Schema({ timestamps: true })
export class UserWallet {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: Map, of: Number, default: {} })
  balances: Map<string, number>;

  @Prop({ default: 1 })
  walletVersion: number;  // For optimistic locking

  @Prop()
  lastTransactionAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserWalletSchema = SchemaFactory.createForClass(UserWallet);

// Compound index for efficient queries
UserWalletSchema.index({ userId: 1, walletVersion: 1 });
```

#### 3. Transaction Schema
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true, versionKey: false })
export class Transaction {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  currencyId: string;

  @Prop({ required: true })
  amount: number;  // Positive for earn/grant, negative for spend

  @Prop({
    required: true,
    enum: ['earn', 'spend', 'grant', 'decay', 'exchange_in', 'exchange_out'],
    index: true
  })
  type: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  balanceBefore: number;

  @Prop({ required: true })
  balanceAfter: number;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ unique: true, sparse: true })
  idempotencyKey?: string;  // Prevent duplicate transactions

  @Prop({ index: true })
  timestamp: Date;

  @Prop()
  relatedTransactionId?: string;  // For exchange operations

  @Prop()
  createdAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Compound indexes for transaction queries
TransactionSchema.index({ userId: 1, timestamp: -1 });
TransactionSchema.index({ userId: 1, currencyId: 1, timestamp: -1 });
TransactionSchema.index({ userId: 1, type: 1, timestamp: -1 });
TransactionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL
TransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
```

#### 4. EarningRule Schema
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EarningRuleDocument = EarningRule & Document;

@Schema({ timestamps: true, versionKey: false })
export class EarningRule {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  action: string;  // e.g., 'quest.completed', 'user.signup'

  @Prop({ required: true, index: true })
  currencyId: string;

  @Prop({ required: true })
  baseAmount: number;

  @Prop({ type: Array })
  multipliers: Array<{
    condition: string;
    factor: number;
    description: string;
  }>;

  @Prop({ default: 0 })
  cooldown: number;  // Seconds between applications

  @Prop()
  maxApplicationsPerDay?: number;

  @Prop({
    default: 'active',
    enum: ['active', 'inactive', 'archived'],
    index: true
  })
  status: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const EarningRuleSchema = SchemaFactory.createForClass(EarningRule);

// Indexes
EarningRuleSchema.index({ action: 1, status: 1 });
EarningRuleSchema.index({ currencyId: 1, status: 1 });
```

#### 5. RuleCooldown Schema (for tracking cooldowns)
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RuleCooldownDocument = RuleCooldown & Document;

@Schema({ timestamps: false })
export class RuleCooldown {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  ruleId: string;

  @Prop({ required: true })
  lastApplied: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 1 })
  applicationsToday: number;
}

export const RuleCooldownSchema = SchemaFactory.createForClass(RuleCooldown);

// Compound index
RuleCooldownSchema.index({ userId: 1, ruleId: 1 }, { unique: true });
RuleCooldownSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-cleanup
```

---

### Sharding Strategy for Scale

**Sharding Key**: `userId` (hash-based sharding)

**Rationale**:
- Most queries filter by userId
- Even distribution across shards
- Avoids hotspots
- Transaction locality (all user transactions on same shard)

**Shard Configuration**:
```javascript
// Enable sharding on database
sh.enableSharding("gamification")

// Shard UserWallet collection
sh.shardCollection("gamification.userwallets", { "userId": "hashed" })

// Shard Transaction collection
sh.shardCollection("gamification.transactions", { "userId": "hashed" })

// Keep Currency and EarningRule collections unsharded (small, frequently accessed)
```

---

## NestJS Implementation Architecture

### Module Structure

```
src/
├── points-rewards/
│   ├── points-rewards.module.ts
│   ├── controllers/
│   │   ├── wallet.controller.ts
│   │   ├── transaction.controller.ts
│   │   ├── currency.controller.ts
│   │   └── earning-rule.controller.ts
│   ├── services/
│   │   ├── wallet.service.ts
│   │   ├── transaction.service.ts
│   │   ├── currency.service.ts
│   │   ├── earning-rule.service.ts
│   │   └── exchange.service.ts
│   ├── schemas/
│   │   ├── currency.schema.ts
│   │   ├── user-wallet.schema.ts
│   │   ├── transaction.schema.ts
│   │   ├── earning-rule.schema.ts
│   │   └── rule-cooldown.schema.ts
│   ├── dto/
│   │   ├── earn-points.dto.ts
│   │   ├── spend-points.dto.ts
│   │   ├── exchange-currency.dto.ts
│   │   ├── create-currency.dto.ts
│   │   └── create-earning-rule.dto.ts
│   ├── events/
│   │   ├── points-awarded.event.ts
│   │   ├── points-spent.event.ts
│   │   └── currency-exchanged.event.ts
│   └── interfaces/
│       ├── transaction-result.interface.ts
│       └── earning-calculation.interface.ts
```

### Core Module Definition

```typescript
// points-rewards.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  Currency,
  CurrencySchema,
  UserWallet,
  UserWalletSchema,
  Transaction,
  TransactionSchema,
  EarningRule,
  EarningRuleSchema,
  RuleCooldown,
  RuleCooldownSchema,
} from './schemas';
import {
  WalletService,
  TransactionService,
  CurrencyService,
  EarningRuleService,
  ExchangeService,
} from './services';
import {
  WalletController,
  TransactionController,
  CurrencyController,
  EarningRuleController,
} from './controllers';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Currency.name, schema: CurrencySchema },
      { name: UserWallet.name, schema: UserWalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: EarningRule.name, schema: EarningRuleSchema },
      { name: RuleCooldown.name, schema: RuleCooldownSchema },
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    WalletController,
    TransactionController,
    CurrencyController,
    EarningRuleController,
  ],
  providers: [
    WalletService,
    TransactionService,
    CurrencyService,
    EarningRuleService,
    ExchangeService,
  ],
  exports: [
    WalletService,
    TransactionService,
    EarningRuleService,
  ],
})
export class PointsRewardsModule {}
```

---

## Complete Code Examples

### 1. Transaction Service with ACID Properties

```typescript
// services/transaction.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  TransactionDocument,
  UserWallet,
  UserWalletDocument,
} from '../schemas';
import { EarnPointsDto, SpendPointsDto } from '../dto';
import { PointsAwardedEvent, PointsSpentEvent } from '../events';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(UserWallet.name)
    private walletModel: Model<UserWalletDocument>,
    @InjectConnection()
    private connection: Connection,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Award points to user with ACID transaction and optimistic locking
   */
  async earnPoints(
    userId: string,
    earnDto: EarnPointsDto,
  ): Promise<{ transaction: Transaction; wallet: UserWallet }> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      // Check for duplicate transaction using idempotency key
      if (earnDto.idempotencyKey) {
        const existingTxn = await this.transactionModel
          .findOne({ idempotencyKey: earnDto.idempotencyKey })
          .session(session);

        if (existingTxn) {
          await session.abortTransaction();
          throw new ConflictException('Transaction already processed');
        }
      }

      // Validate amount
      if (earnDto.amount <= 0) {
        throw new BadRequestException('Amount must be positive');
      }

      // Get current wallet with version (optimistic locking)
      const wallet = await this.walletModel
        .findOne({ userId })
        .session(session);

      if (!wallet) {
        throw new BadRequestException(`Wallet not found for user ${userId}`);
      }

      const currentBalance = wallet.balances.get(earnDto.currencyId) || 0;
      const newBalance = currentBalance + earnDto.amount;

      // Create transaction record
      const transaction = new this.transactionModel({
        id: uuidv4(),
        userId,
        currencyId: earnDto.currencyId,
        amount: earnDto.amount,
        type: 'earn',
        reason: earnDto.reason,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        metadata: earnDto.metadata || {},
        idempotencyKey: earnDto.idempotencyKey,
        timestamp: new Date(),
      });

      await transaction.save({ session });

      // Update wallet balance with optimistic locking
      const updateResult = await this.walletModel.updateOne(
        {
          userId,
          walletVersion: wallet.walletVersion  // Optimistic lock check
        },
        {
          $set: {
            [`balances.${earnDto.currencyId}`]: newBalance,
            lastTransactionAt: new Date(),
          },
          $inc: { walletVersion: 1 },
        },
        { session },
      );

      // Check if update succeeded (version match)
      if (updateResult.modifiedCount === 0) {
        throw new ConflictException(
          'Concurrent modification detected. Please retry.',
        );
      }

      // Commit transaction
      await session.commitTransaction();

      // Emit event for external integrations
      this.eventEmitter.emit(
        'points.awarded',
        new PointsAwardedEvent({
          userId,
          currencyId: earnDto.currencyId,
          amount: earnDto.amount,
          newBalance,
          reason: earnDto.reason,
          metadata: earnDto.metadata,
        }),
      );

      // Fetch updated wallet
      const updatedWallet = await this.walletModel.findOne({ userId });

      return {
        transaction: transaction.toObject(),
        wallet: updatedWallet.toObject(),
      };
    } catch (error) {
      // Rollback on any error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Spend points with balance validation and ACID transaction
   */
  async spendPoints(
    userId: string,
    spendDto: SpendPointsDto,
  ): Promise<{ transaction: Transaction; wallet: UserWallet }> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      // Check for duplicate transaction
      if (spendDto.idempotencyKey) {
        const existingTxn = await this.transactionModel
          .findOne({ idempotencyKey: spendDto.idempotencyKey })
          .session(session);

        if (existingTxn) {
          await session.abortTransaction();
          throw new ConflictException('Transaction already processed');
        }
      }

      // Validate amount
      if (spendDto.amount <= 0) {
        throw new BadRequestException('Amount must be positive');
      }

      // Get wallet with version
      const wallet = await this.walletModel
        .findOne({ userId })
        .session(session);

      if (!wallet) {
        throw new BadRequestException(`Wallet not found for user ${userId}`);
      }

      const currentBalance = wallet.balances.get(spendDto.currencyId) || 0;

      // Check sufficient balance
      if (currentBalance < spendDto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Required ${spendDto.amount}, available ${currentBalance}`,
        );
      }

      const newBalance = currentBalance - spendDto.amount;

      // Create transaction record
      const transaction = new this.transactionModel({
        id: uuidv4(),
        userId,
        currencyId: spendDto.currencyId,
        amount: -spendDto.amount,  // Negative for spend
        type: 'spend',
        reason: spendDto.reason,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        metadata: spendDto.metadata || {},
        idempotencyKey: spendDto.idempotencyKey,
        timestamp: new Date(),
      });

      await transaction.save({ session });

      // Update wallet with optimistic locking
      const updateResult = await this.walletModel.updateOne(
        {
          userId,
          walletVersion: wallet.walletVersion
        },
        {
          $set: {
            [`balances.${spendDto.currencyId}`]: newBalance,
            lastTransactionAt: new Date(),
          },
          $inc: { walletVersion: 1 },
        },
        { session },
      );

      if (updateResult.modifiedCount === 0) {
        throw new ConflictException(
          'Concurrent modification detected. Please retry.',
        );
      }

      await session.commitTransaction();

      // Emit event
      this.eventEmitter.emit(
        'points.spent',
        new PointsSpentEvent({
          userId,
          currencyId: spendDto.currencyId,
          amount: spendDto.amount,
          newBalance,
          reason: spendDto.reason,
          metadata: spendDto.metadata,
        }),
      );

      const updatedWallet = await this.walletModel.findOne({ userId });

      return {
        transaction: transaction.toObject(),
        wallet: updatedWallet.toObject(),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get transaction history with pagination
   */
  async getTransactionHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      currencyId?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      currencyId,
      type,
      startDate,
      endDate
    } = options;

    const query: any = { userId };

    if (currencyId) query.currencyId = currencyId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments(query),
    ]);

    return { transactions, total };
  }
}
```

---

### 2. Earning Rules Engine Integration

```typescript
// services/earning-rule.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EarningRule,
  EarningRuleDocument,
  RuleCooldown,
  RuleCooldownDocument,
} from '../schemas';
import { CreateEarningRuleDto, EvaluateRuleDto } from '../dto';
import { EarningCalculation } from '../interfaces';

@Injectable()
export class EarningRuleService {
  constructor(
    @InjectModel(EarningRule.name)
    private earningRuleModel: Model<EarningRuleDocument>,
    @InjectModel(RuleCooldown.name)
    private ruleCooldownModel: Model<RuleCooldownDocument>,
  ) {}

  /**
   * Evaluate which earning rules apply to a user action
   */
  async evaluateRules(
    evaluateDto: EvaluateRuleDto,
  ): Promise<EarningCalculation> {
    const { userId, action, metadata } = evaluateDto;

    // Find all active rules for this action
    const rules = await this.earningRuleModel
      .find({ action, status: 'active' })
      .lean();

    if (rules.length === 0) {
      return {
        applicable: false,
        rules: [],
        totalAwarded: {},
      };
    }

    const applicableRules = [];

    for (const rule of rules) {
      // Check cooldown
      if (rule.cooldown > 0) {
        const cooldown = await this.ruleCooldownModel.findOne({
          userId,
          ruleId: rule.id,
          expiresAt: { $gt: new Date() },
        });

        if (cooldown) {
          continue; // Skip this rule, still on cooldown
        }
      }

      // Check daily application limit
      if (rule.maxApplicationsPerDay) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const cooldown = await this.ruleCooldownModel.findOne({
          userId,
          ruleId: rule.id,
        });

        if (
          cooldown &&
          cooldown.applicationsToday >= rule.maxApplicationsPerDay &&
          cooldown.lastApplied >= startOfDay
        ) {
          continue; // Skip, daily limit reached
        }
      }

      // Calculate final amount with multipliers
      let finalAmount = rule.baseAmount;
      const appliedMultipliers = [];

      for (const multiplier of rule.multipliers || []) {
        // Evaluate condition (simple implementation)
        const conditionMet = await this.evaluateCondition(
          multiplier.condition,
          { userId, metadata },
        );

        if (conditionMet) {
          finalAmount *= multiplier.factor;
          appliedMultipliers.push({
            description: multiplier.description,
            factor: multiplier.factor,
          });
        }
      }

      applicableRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        baseAmount: rule.baseAmount,
        appliedMultipliers,
        finalAmount: Math.floor(finalAmount),
        currencyId: rule.currencyId,
      });

      // Record cooldown
      if (rule.cooldown > 0) {
        const expiresAt = new Date(Date.now() + rule.cooldown * 1000);
        await this.ruleCooldownModel.findOneAndUpdate(
          { userId, ruleId: rule.id },
          {
            lastApplied: new Date(),
            expiresAt,
            $inc: { applicationsToday: 1 },
          },
          { upsert: true },
        );
      }
    }

    // Calculate total awarded per currency
    const totalAwarded: Record<string, number> = {};
    applicableRules.forEach((rule) => {
      totalAwarded[rule.currencyId] =
        (totalAwarded[rule.currencyId] || 0) + rule.finalAmount;
    });

    return {
      applicable: applicableRules.length > 0,
      rules: applicableRules,
      totalAwarded,
    };
  }

  /**
   * Simple condition evaluator (can be extended with a rule engine)
   */
  private async evaluateCondition(
    condition: string,
    context: { userId: string; metadata: any },
  ): Promise<boolean> {
    // Simple string-based evaluation
    // In production, use a proper expression evaluator like jsonata or mathjs

    // Example: "user.level >= 10"
    // For now, return true (implement proper evaluation logic)
    return true;
  }

  /**
   * Create a new earning rule
   */
  async createRule(createDto: CreateEarningRuleDto): Promise<EarningRule> {
    const rule = new this.earningRuleModel({
      id: `rule-${Date.now()}`,
      ...createDto,
      status: 'active',
    });

    return rule.save();
  }

  /**
   * Get all earning rules
   */
  async findAll(filters?: {
    status?: string;
    currencyId?: string;
    action?: string;
  }): Promise<EarningRule[]> {
    const query: any = {};

    if (filters?.status) query.status = filters.status;
    if (filters?.currencyId) query.currencyId = filters.currencyId;
    if (filters?.action) query.action = filters.action;

    return this.earningRuleModel.find(query).lean();
  }

  /**
   * Get earning rule by ID
   */
  async findById(ruleId: string): Promise<EarningRule> {
    const rule = await this.earningRuleModel.findOne({ id: ruleId }).lean();

    if (!rule) {
      throw new NotFoundException(`Earning rule ${ruleId} not found`);
    }

    return rule;
  }

  /**
   * Update earning rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<EarningRule>,
  ): Promise<EarningRule> {
    const rule = await this.earningRuleModel
      .findOneAndUpdate(
        { id: ruleId },
        { $set: updates },
        { new: true },
      )
      .lean();

    if (!rule) {
      throw new NotFoundException(`Earning rule ${ruleId} not found`);
    }

    return rule;
  }

  /**
   * Delete earning rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const result = await this.earningRuleModel.deleteOne({ id: ruleId });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Earning rule ${ruleId} not found`);
    }
  }
}
```

---

### 3. Currency Exchange Logic

```typescript
// services/exchange.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  TransactionDocument,
  UserWallet,
  UserWalletDocument,
  Currency,
  CurrencyDocument,
} from '../schemas';
import { ExchangeCurrencyDto } from '../dto';
import { CurrencyExchangedEvent } from '../events';

@Injectable()
export class ExchangeService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(UserWallet.name)
    private walletModel: Model<UserWalletDocument>,
    @InjectModel(Currency.name)
    private currencyModel: Model<CurrencyDocument>,
    @InjectConnection()
    private connection: Connection,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Exchange one currency for another with atomic transaction
   */
  async exchangeCurrency(
    userId: string,
    exchangeDto: ExchangeCurrencyDto,
  ): Promise<{
    transactions: Transaction[];
    exchangeRate: any;
    wallet: UserWallet;
  }> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      const { fromCurrencyId, toCurrencyId, amount } = exchangeDto;

      // Validate amount
      if (amount <= 0) {
        throw new BadRequestException('Amount must be positive');
      }

      // Get exchange rate
      const fromCurrency = await this.currencyModel
        .findOne({ id: fromCurrencyId })
        .session(session);

      if (!fromCurrency) {
        throw new BadRequestException(`Currency ${fromCurrencyId} not found`);
      }

      const exchangeRate = fromCurrency.exchangeRates.get(toCurrencyId);

      if (!exchangeRate) {
        throw new BadRequestException(
          `No exchange rate configured between ${fromCurrencyId} and ${toCurrencyId}`,
        );
      }

      // Calculate received amount
      const receivedAmount = Math.floor(amount / exchangeRate);

      if (receivedAmount <= 0) {
        throw new BadRequestException(
          'Exchange amount too small to convert',
        );
      }

      // Get wallet
      const wallet = await this.walletModel
        .findOne({ userId })
        .session(session);

      if (!wallet) {
        throw new BadRequestException(`Wallet not found for user ${userId}`);
      }

      const fromBalance = wallet.balances.get(fromCurrencyId) || 0;
      const toBalance = wallet.balances.get(toCurrencyId) || 0;

      // Check sufficient balance
      if (fromBalance < amount) {
        throw new BadRequestException(
          `Insufficient ${fromCurrencyId}. Required ${amount}, available ${fromBalance}`,
        );
      }

      const newFromBalance = fromBalance - amount;
      const newToBalance = toBalance + receivedAmount;

      // Create two linked transactions
      const outTransactionId = uuidv4();
      const inTransactionId = uuidv4();

      const outTransaction = new this.transactionModel({
        id: outTransactionId,
        userId,
        currencyId: fromCurrencyId,
        amount: -amount,
        type: 'exchange_out',
        reason: `Exchange to ${toCurrencyId}`,
        balanceBefore: fromBalance,
        balanceAfter: newFromBalance,
        metadata: exchangeDto.metadata || {},
        relatedTransactionId: inTransactionId,
        timestamp: new Date(),
      });

      const inTransaction = new this.transactionModel({
        id: inTransactionId,
        userId,
        currencyId: toCurrencyId,
        amount: receivedAmount,
        type: 'exchange_in',
        reason: `Exchange from ${fromCurrencyId}`,
        balanceBefore: toBalance,
        balanceAfter: newToBalance,
        metadata: exchangeDto.metadata || {},
        relatedTransactionId: outTransactionId,
        timestamp: new Date(),
      });

      await outTransaction.save({ session });
      await inTransaction.save({ session });

      // Update wallet balances
      const updateResult = await this.walletModel.updateOne(
        {
          userId,
          walletVersion: wallet.walletVersion
        },
        {
          $set: {
            [`balances.${fromCurrencyId}`]: newFromBalance,
            [`balances.${toCurrencyId}`]: newToBalance,
            lastTransactionAt: new Date(),
          },
          $inc: { walletVersion: 1 },
        },
        { session },
      );

      if (updateResult.modifiedCount === 0) {
        throw new ConflictException(
          'Concurrent modification detected. Please retry.',
        );
      }

      await session.commitTransaction();

      // Emit event
      this.eventEmitter.emit(
        'currency.exchanged',
        new CurrencyExchangedEvent({
          userId,
          fromCurrencyId,
          toCurrencyId,
          amountExchanged: amount,
          amountReceived: receivedAmount,
          exchangeRate,
        }),
      );

      const updatedWallet = await this.walletModel.findOne({ userId });

      return {
        transactions: [
          outTransaction.toObject(),
          inTransaction.toObject(),
        ],
        exchangeRate: {
          from: fromCurrencyId,
          to: toCurrencyId,
          rate: exchangeRate,
          amountExchanged: amount,
          amountReceived: receivedAmount,
        },
        wallet: updatedWallet.toObject(),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

---

### 4. Event Emitters for Point Changes

```typescript
// events/points-awarded.event.ts
export class PointsAwardedEvent {
  constructor(
    public readonly payload: {
      userId: string;
      currencyId: string;
      amount: number;
      newBalance: number;
      reason: string;
      metadata?: Record<string, any>;
    },
  ) {}
}

// events/points-spent.event.ts
export class PointsSpentEvent {
  constructor(
    public readonly payload: {
      userId: string;
      currencyId: string;
      amount: number;
      newBalance: number;
      reason: string;
      metadata?: Record<string, any>;
    },
  ) {}
}

// events/currency-exchanged.event.ts
export class CurrencyExchangedEvent {
  constructor(
    public readonly payload: {
      userId: string;
      fromCurrencyId: string;
      toCurrencyId: string;
      amountExchanged: number;
      amountReceived: number;
      exchangeRate: number;
    },
  ) {}
}
```

---

### 5. DTOs (Data Transfer Objects)

```typescript
// dto/earn-points.dto.ts
import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class EarnPointsDto {
  @IsString()
  currencyId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// dto/spend-points.dto.ts
export class SpendPointsDto {
  @IsString()
  currencyId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// dto/exchange-currency.dto.ts
export class ExchangeCurrencyDto {
  @IsString()
  fromCurrencyId: string;

  @IsString()
  toCurrencyId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// dto/create-earning-rule.dto.ts
export class CreateEarningRuleDto {
  @IsString()
  name: string;

  @IsString()
  action: string;

  @IsString()
  currencyId: string;

  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsOptional()
  multipliers?: Array<{
    condition: string;
    factor: number;
    description: string;
  }>;

  @IsOptional()
  @IsNumber()
  cooldown?: number;

  @IsOptional()
  @IsNumber()
  maxApplicationsPerDay?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

---

## Testing Specifications

### 1. Unit Tests for Transaction Logic

```typescript
// services/transaction.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionService } from './transaction.service';
import { Transaction, UserWallet } from '../schemas';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('TransactionService', () => {
  let service: TransactionService;
  let mockTransactionModel: any;
  let mockWalletModel: any;
  let mockConnection: any;
  let mockEventEmitter: any;

  beforeEach(async () => {
    // Mock models and dependencies
    mockTransactionModel = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockWalletModel = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    mockConnection = {
      startSession: jest.fn().mockResolvedValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      }),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(UserWallet.name),
          useValue: mockWalletModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  describe('earnPoints', () => {
    it('should successfully award points', async () => {
      const userId = 'user-123';
      const earnDto = {
        currencyId: 'xp',
        amount: 100,
        reason: 'Test',
      };

      const mockWallet = {
        userId,
        balances: new Map([['xp', 500]]),
        walletVersion: 1,
        toObject: jest.fn().mockReturnValue({
          userId,
          balances: { xp: 600 },
        }),
      };

      mockWalletModel.findOne.mockResolvedValue(mockWallet);
      mockWalletModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.earnPoints(userId, earnDto);

      expect(result.transaction.amount).toBe(100);
      expect(result.transaction.balanceBefore).toBe(500);
      expect(result.transaction.balanceAfter).toBe(600);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'points.awarded',
        expect.any(Object),
      );
    });

    it('should throw error for negative amount', async () => {
      const userId = 'user-123';
      const earnDto = {
        currencyId: 'xp',
        amount: -100,
        reason: 'Test',
      };

      await expect(service.earnPoints(userId, earnDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent duplicate transactions', async () => {
      const userId = 'user-123';
      const earnDto = {
        currencyId: 'xp',
        amount: 100,
        reason: 'Test',
        idempotencyKey: 'unique-key-123',
      };

      mockTransactionModel.findOne.mockResolvedValue({ id: 'existing-txn' });

      await expect(service.earnPoints(userId, earnDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle concurrent modifications', async () => {
      const userId = 'user-123';
      const earnDto = {
        currencyId: 'xp',
        amount: 100,
        reason: 'Test',
      };

      const mockWallet = {
        userId,
        balances: new Map([['xp', 500]]),
        walletVersion: 1,
      };

      mockWalletModel.findOne.mockResolvedValue(mockWallet);
      mockWalletModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

      await expect(service.earnPoints(userId, earnDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('spendPoints', () => {
    it('should successfully spend points', async () => {
      const userId = 'user-123';
      const spendDto = {
        currencyId: 'coins',
        amount: 100,
        reason: 'Purchase',
      };

      const mockWallet = {
        userId,
        balances: new Map([['coins', 500]]),
        walletVersion: 1,
        toObject: jest.fn().mockReturnValue({
          userId,
          balances: { coins: 400 },
        }),
      };

      mockWalletModel.findOne.mockResolvedValue(mockWallet);
      mockWalletModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.spendPoints(userId, spendDto);

      expect(result.transaction.amount).toBe(-100);
      expect(result.transaction.balanceAfter).toBe(400);
    });

    it('should throw error for insufficient balance', async () => {
      const userId = 'user-123';
      const spendDto = {
        currencyId: 'coins',
        amount: 1000,
        reason: 'Purchase',
      };

      const mockWallet = {
        userId,
        balances: new Map([['coins', 500]]),
        walletVersion: 1,
      };

      mockWalletModel.findOne.mockResolvedValue(mockWallet);

      await expect(service.spendPoints(userId, spendDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

---

### 2. Concurrency Tests (Race Conditions)

```typescript
// services/transaction.concurrency.spec.ts
import { Test } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('TransactionService - Concurrency Tests', () => {
  let service: TransactionService;

  beforeAll(async () => {
    // Setup with real MongoDB for integration testing
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost/test-gamification'),
        EventEmitterModule.forRoot(),
        // ... other imports
      ],
      providers: [TransactionService],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  describe('concurrent earn operations', () => {
    it('should handle 100 concurrent earn requests without data loss', async () => {
      const userId = 'concurrent-test-user';
      const initialBalance = 1000;
      const earnAmount = 10;
      const concurrentRequests = 100;

      // Setup initial wallet
      await setupWallet(userId, { xp: initialBalance });

      // Execute 100 concurrent earn requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.earnPoints(userId, {
          currencyId: 'xp',
          amount: earnAmount,
          reason: 'Concurrent test',
        }),
      );

      const results = await Promise.allSettled(promises);

      // Count successful transactions
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      // All should succeed with optimistic locking retry logic
      expect(successful).toBe(concurrentRequests);
      expect(failed).toBe(0);

      // Verify final balance
      const finalWallet = await getWallet(userId);
      const expectedBalance = initialBalance + earnAmount * concurrentRequests;
      expect(finalWallet.balances.get('xp')).toBe(expectedBalance);
    });

    it('should prevent double-spend in concurrent spend operations', async () => {
      const userId = 'concurrent-spend-user';
      const initialBalance = 1000;
      const spendAmount = 100;
      const concurrentRequests = 15; // 15 * 100 = 1500 > 1000

      await setupWallet(userId, { coins: initialBalance });

      const promises = Array.from({ length: concurrentRequests }, () =>
        service.spendPoints(userId, {
          currencyId: 'coins',
          amount: spendAmount,
          reason: 'Concurrent spend test',
        }),
      );

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;

      // Only 10 should succeed (1000 / 100 = 10)
      expect(successful).toBe(10);

      // Verify final balance is 0 or positive
      const finalWallet = await getWallet(userId);
      expect(finalWallet.balances.get('coins')).toBeGreaterThanOrEqual(0);
    });
  });

  describe('idempotency', () => {
    it('should process same idempotency key only once', async () => {
      const userId = 'idempotency-test-user';
      const idempotencyKey = 'unique-key-' + Date.now();

      await setupWallet(userId, { xp: 0 });

      // Send same request 5 times with same idempotency key
      const promises = Array.from({ length: 5 }, () =>
        service.earnPoints(userId, {
          currencyId: 'xp',
          amount: 100,
          reason: 'Idempotency test',
          idempotencyKey,
        }),
      );

      const results = await Promise.allSettled(promises);

      // Only 1 should succeed
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      expect(successful).toBe(1);

      // Final balance should be 100, not 500
      const finalWallet = await getWallet(userId);
      expect(finalWallet.balances.get('xp')).toBe(100);
    });
  });
});
```

---

### 3. Integration Tests with Rules Engine

```typescript
// integration/earning-rules.integration.spec.ts
import { Test } from '@nestjs/testing';
import { TransactionService } from '../services/transaction.service';
import { EarningRuleService } from '../services/earning-rule.service';

describe('Earning Rules Integration', () => {
  let transactionService: TransactionService;
  let earningRuleService: EarningRuleService;

  beforeAll(async () => {
    // Setup test module
    const module = await Test.createTestingModule({
      // ... module setup
    }).compile();

    transactionService = module.get(TransactionService);
    earningRuleService = module.get(EarningRuleService);
  });

  it('should apply earning rules when user completes quest', async () => {
    const userId = 'test-user-123';

    // Create earning rule
    await earningRuleService.createRule({
      name: 'Quest XP',
      action: 'quest.completed',
      currencyId: 'xp',
      baseAmount: 100,
      multipliers: [
        {
          condition: 'metadata.difficulty === "hard"',
          factor: 2.0,
          description: 'Hard quest bonus',
        },
      ],
    });

    // Evaluate rules
    const evaluation = await earningRuleService.evaluateRules({
      userId,
      action: 'quest.completed',
      metadata: { difficulty: 'hard' },
    });

    expect(evaluation.applicable).toBe(true);
    expect(evaluation.totalAwarded.xp).toBe(200); // 100 * 2.0

    // Award points based on rules
    for (const rule of evaluation.rules) {
      await transactionService.earnPoints(userId, {
        currencyId: rule.currencyId,
        amount: rule.finalAmount,
        reason: rule.ruleName,
        metadata: { ruleId: rule.ruleId },
      });
    }

    // Verify balance
    const wallet = await getWallet(userId);
    expect(wallet.balances.get('xp')).toBe(200);
  });

  it('should respect cooldown periods', async () => {
    const userId = 'cooldown-test-user';

    // Create rule with 60 second cooldown
    await earningRuleService.createRule({
      name: 'Daily Login',
      action: 'user.login',
      currencyId: 'coins',
      baseAmount: 50,
      cooldown: 60,
    });

    // First application should succeed
    const eval1 = await earningRuleService.evaluateRules({
      userId,
      action: 'user.login',
      metadata: {},
    });

    expect(eval1.applicable).toBe(true);
    expect(eval1.totalAwarded.coins).toBe(50);

    // Immediate second application should be blocked
    const eval2 = await earningRuleService.evaluateRules({
      userId,
      action: 'user.login',
      metadata: {},
    });

    expect(eval2.applicable).toBe(false);
    expect(eval2.rules.length).toBe(0);
  });
});
```

---

### 4. Performance Tests for High-Volume Transactions

```typescript
// performance/transaction.performance.spec.ts
import { performance } from 'perf_hooks';

describe('Transaction Performance Tests', () => {
  it('should handle 1000 transactions in under 10 seconds', async () => {
    const startTime = performance.now();
    const userId = 'perf-test-user';
    const transactionCount = 1000;

    await setupWallet(userId, { xp: 0 });

    const promises = Array.from({ length: transactionCount }, (_, i) =>
      transactionService.earnPoints(userId, {
        currencyId: 'xp',
        amount: 10,
        reason: `Performance test ${i}`,
      }),
    );

    await Promise.all(promises);

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    expect(duration).toBeLessThan(10);

    // Verify correctness
    const wallet = await getWallet(userId);
    expect(wallet.balances.get('xp')).toBe(transactionCount * 10);
  });

  it('should maintain sub-100ms p99 latency for single transactions', async () => {
    const userId = 'latency-test-user';
    const iterations = 100;
    const latencies: number[] = [];

    await setupWallet(userId, { xp: 0 });

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      await transactionService.earnPoints(userId, {
        currencyId: 'xp',
        amount: 10,
        reason: 'Latency test',
      });

      const end = performance.now();
      latencies.push(end - start);
    }

    // Calculate p99
    latencies.sort((a, b) => a - b);
    const p99Index = Math.floor(iterations * 0.99);
    const p99Latency = latencies[p99Index];

    expect(p99Latency).toBeLessThan(100); // 100ms
  });
});
```

---

## Integration Patterns

### 1. Achievement Service Integration

**Achievement Service** triggers point awards when achievements are unlocked:

```typescript
// Achievement Service Event Listener
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionService } from '@points-rewards/services';

@Injectable()
export class AchievementPointsListener {
  constructor(private transactionService: TransactionService) {}

  @OnEvent('achievement.unlocked')
  async handleAchievementUnlocked(payload: AchievementUnlockedEvent) {
    const { userId, achievementId, rewards } = payload;

    // Award currency rewards
    for (const reward of rewards) {
      if (reward.type === 'currency') {
        await this.transactionService.earnPoints(userId, {
          currencyId: reward.currencyId,
          amount: reward.amount,
          reason: `Achievement unlocked: ${achievementId}`,
          metadata: {
            achievementId,
            source: 'achievement_service',
          },
        });
      }
    }
  }
}
```

---

### 2. Quest Service Integration

**Quest Service** grants rewards upon quest completion:

```typescript
// Quest Service Integration
import { Injectable } from '@nestjs/common';
import { TransactionService, EarningRuleService } from '@points-rewards/services';

@Injectable()
export class QuestRewardService {
  constructor(
    private transactionService: TransactionService,
    private earningRuleService: EarningRuleService,
  ) {}

  async completeQuest(userId: string, questId: string) {
    // 1. Evaluate earning rules for quest completion
    const evaluation = await this.earningRuleService.evaluateRules({
      userId,
      action: 'quest.completed',
      metadata: { questId },
    });

    // 2. Award points based on earning rules
    for (const rule of evaluation.rules) {
      await this.transactionService.earnPoints(userId, {
        currencyId: rule.currencyId,
        amount: rule.finalAmount,
        reason: `Quest completed: ${questId}`,
        metadata: {
          questId,
          ruleId: rule.ruleId,
          source: 'quest_service',
        },
      });
    }

    // 3. Award quest-specific rewards (if any)
    const quest = await this.getQuest(questId);

    for (const reward of quest.rewards) {
      if (reward.type === 'currency') {
        await this.transactionService.earnPoints(userId, {
          currencyId: reward.currencyId,
          amount: reward.amount,
          reason: `Quest reward: ${quest.name}`,
          metadata: {
            questId,
            rewardType: 'quest_specific',
          },
        });
      }
    }

    return { success: true, totalAwarded: evaluation.totalAwarded };
  }
}
```

---

### 3. Event Publishing for Analytics

```typescript
// Analytics Event Publisher
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AnalyticsService } from '@analytics/services';
import {
  PointsAwardedEvent,
  PointsSpentEvent,
  CurrencyExchangedEvent
} from '../events';

@Injectable()
export class PointsAnalyticsListener {
  constructor(private analyticsService: AnalyticsService) {}

  @OnEvent('points.awarded')
  async trackPointsAwarded(event: PointsAwardedEvent) {
    await this.analyticsService.track({
      userId: event.payload.userId,
      eventType: 'points_awarded',
      eventData: {
        currencyId: event.payload.currencyId,
        amount: event.payload.amount,
        newBalance: event.payload.newBalance,
        reason: event.payload.reason,
        ...event.payload.metadata,
      },
      timestamp: new Date(),
    });
  }

  @OnEvent('points.spent')
  async trackPointsSpent(event: PointsSpentEvent) {
    await this.analyticsService.track({
      userId: event.payload.userId,
      eventType: 'points_spent',
      eventData: {
        currencyId: event.payload.currencyId,
        amount: event.payload.amount,
        newBalance: event.payload.newBalance,
        reason: event.payload.reason,
        ...event.payload.metadata,
      },
      timestamp: new Date(),
    });
  }

  @OnEvent('currency.exchanged')
  async trackCurrencyExchange(event: CurrencyExchangedEvent) {
    await this.analyticsService.track({
      userId: event.payload.userId,
      eventType: 'currency_exchanged',
      eventData: {
        fromCurrency: event.payload.fromCurrencyId,
        toCurrency: event.payload.toCurrencyId,
        amountExchanged: event.payload.amountExchanged,
        amountReceived: event.payload.amountReceived,
        exchangeRate: event.payload.exchangeRate,
      },
      timestamp: new Date(),
    });
  }
}
```

---

### 4. SDK Usage for Client Applications

```typescript
// Client SDK Example
import { GamificationSDK } from '@gamification-engine/sdk';

const sdk = new GamificationSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.gamification.com',
});

// Initialize user wallet
await sdk.points.initializeWallet('user-123', {
  coins: 100,
  xp: 0,
});

// Award points when user completes action
await sdk.points.earn('user-123', {
  currencyId: 'xp',
  amount: 100,
  reason: 'Quest completed',
  metadata: { questId: 'quest-456' },
});

// Spend points for in-game purchase
try {
  await sdk.points.spend('user-123', {
    currencyId: 'coins',
    amount: 50,
    reason: 'Weapon purchased',
    metadata: { itemId: 'sword-789' },
  });
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    console.log('Not enough coins');
  }
}

// Get wallet balance
const wallet = await sdk.points.getWallet('user-123');
console.log(`XP: ${wallet.balances.xp}, Coins: ${wallet.balances.coins}`);

// Exchange currency
await sdk.points.exchange('user-123', {
  fromCurrencyId: 'coins',
  toCurrencyId: 'gems',
  amount: 1000,
});

// Listen to events
sdk.on('points.awarded', (event) => {
  console.log(`Earned ${event.amount} ${event.currencyId}!`);
  showNotification(`+${event.amount} ${event.currencyId}`);
});
```

---

## Real-World Considerations

### 1. Double-Spend Prevention

**Mechanisms**:
- **Optimistic Locking**: Use `walletVersion` to detect concurrent modifications
- **Idempotency Keys**: Prevent duplicate transaction processing
- **Database Transactions**: ACID guarantees via MongoDB sessions
- **Balance Validation**: Check balance before spend operations

**Implementation**:
```typescript
// Double-spend prevention in spend operation
const updateResult = await this.walletModel.updateOne(
  {
    userId,
    walletVersion: wallet.walletVersion,  // Optimistic lock
    [`balances.${currencyId}`]: { $gte: amount }  // Balance check
  },
  {
    $inc: {
      [`balances.${currencyId}`]: -amount,
      walletVersion: 1
    }
  },
  { session }
);

if (updateResult.modifiedCount === 0) {
  throw new ConflictException('Transaction failed - concurrent modification or insufficient balance');
}
```

---

### 2. Transaction Atomicity

**ACID Guarantees**:
- **Atomicity**: All-or-nothing transactions using MongoDB sessions
- **Consistency**: Balance updates and transaction logs are always in sync
- **Isolation**: Transactions don't see uncommitted changes
- **Durability**: Committed transactions persisted to disk

**Multi-Document Transaction**:
```typescript
const session = await this.connection.startSession();
session.startTransaction();

try {
  // Step 1: Create transaction record
  await this.transactionModel.create([transaction], { session });

  // Step 2: Update wallet balance
  await this.walletModel.updateOne(filter, update, { session });

  // Step 3: Commit both operations atomically
  await session.commitTransaction();
} catch (error) {
  // Rollback both operations on any error
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

### 3. Balance Consistency

**Consistency Checks**:
- **Real-time Validation**: Balance checks before every spend
- **Periodic Reconciliation**: Daily job to verify wallet balances match transaction history
- **Audit Trail**: Complete transaction log for debugging discrepancies

**Reconciliation Job**:
```typescript
@Injectable()
export class WalletReconciliationService {
  async reconcileWallet(userId: string): Promise<boolean> {
    // Calculate expected balance from transaction history
    const transactions = await this.transactionModel.find({ userId });

    const calculatedBalances = new Map<string, number>();

    for (const txn of transactions) {
      const current = calculatedBalances.get(txn.currencyId) || 0;
      calculatedBalances.set(txn.currencyId, current + txn.amount);
    }

    // Compare with actual wallet balance
    const wallet = await this.walletModel.findOne({ userId });

    let consistent = true;

    for (const [currencyId, calculatedBalance] of calculatedBalances) {
      const actualBalance = wallet.balances.get(currencyId) || 0;

      if (calculatedBalance !== actualBalance) {
        console.error(
          `Inconsistency detected for user ${userId}, currency ${currencyId}:`,
          `Expected ${calculatedBalance}, Got ${actualBalance}`
        );
        consistent = false;
      }
    }

    return consistent;
  }
}
```

---

### 4. Audit Trails

**Complete Transaction History**:
- Every balance change recorded with full context
- Immutable transaction records (no updates, only inserts)
- Metadata tracking for debugging and compliance
- TTL indexes for automatic old data cleanup

**Query Examples**:
```typescript
// Get all transactions for a user
const allTransactions = await this.transactionModel
  .find({ userId: 'user-123' })
  .sort({ timestamp: -1 });

// Get spend transactions for specific currency
const spendHistory = await this.transactionModel.find({
  userId: 'user-123',
  currencyId: 'coins',
  type: 'spend',
  timestamp: {
    $gte: new Date('2025-11-01'),
    $lte: new Date('2025-11-30')
  }
});

// Trace a specific transaction and related transactions
const transaction = await this.transactionModel.findOne({ id: 'txn-123' });

if (transaction.relatedTransactionId) {
  const relatedTxn = await this.transactionModel.findOne({
    id: transaction.relatedTransactionId
  });
  // Exchange operation - both sides
}
```

---

### 5. Performance Optimization

**Strategies**:
- **Read Replicas**: Separate read and write databases for transaction history queries
- **Caching**: Cache currency definitions and exchange rates in Redis
- **Batch Operations**: Group multiple earn/spend operations in single transaction
- **Index Optimization**: Compound indexes on frequently queried fields
- **Sharding**: Distribute wallets across shards by userId

**Redis Caching**:
```typescript
@Injectable()
export class CurrencyService {
  constructor(
    @InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>,
    @InjectRedis() private redis: Redis,
  ) {}

  async getCurrency(currencyId: string): Promise<Currency> {
    // Try cache first
    const cached = await this.redis.get(`currency:${currencyId}`);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const currency = await this.currencyModel.findOne({ id: currencyId });

    // Cache for 1 hour
    await this.redis.setex(
      `currency:${currencyId}`,
      3600,
      JSON.stringify(currency)
    );

    return currency;
  }
}
```

---

### 6. Error Handling and Retry Logic

**Retry Strategy for Optimistic Locking Conflicts**:
```typescript
import { retry } from 'rxjs';
import { catchError, delay, take } from 'rxjs/operators';

@Injectable()
export class TransactionService {
  async earnPointsWithRetry(
    userId: string,
    earnDto: EarnPointsDto,
    maxRetries = 3,
  ): Promise<{ transaction: Transaction; wallet: UserWallet }> {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await this.earnPoints(userId, earnDto);
      } catch (error) {
        if (
          error instanceof ConflictException &&
          error.message.includes('Concurrent modification') &&
          attempt < maxRetries - 1
        ) {
          attempt++;
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve =>
            setTimeout(resolve, 100 * Math.pow(2, attempt))
          );
          continue;
        }
        throw error;
      }
    }
  }
}
```

---

## Summary

This specification provides a comprehensive implementation guide for the Points & Rewards Service with:

✅ **Complete API Design**: All endpoints with request/response schemas
✅ **Database Architecture**: MongoDB schemas with indexes and sharding strategy
✅ **NestJS Implementation**: Full service layer with ACID transactions
✅ **Code Examples**: Transaction processing, earning rules, currency exchange
✅ **Testing Strategy**: Unit, integration, concurrency, and performance tests
✅ **Integration Patterns**: Achievement, Quest, Analytics, SDK usage
✅ **Production-Ready Considerations**: Double-spend prevention, atomicity, consistency, audit trails, performance optimization

**Next Steps**:
1. Review and approve this specification
2. Set up development environment and database
3. Implement core transaction service with tests
4. Add earning rules engine
5. Integrate with Achievement and Quest services
6. Deploy to staging for load testing
7. Production rollout with monitoring

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-30
**Status**: Ready for Implementation
