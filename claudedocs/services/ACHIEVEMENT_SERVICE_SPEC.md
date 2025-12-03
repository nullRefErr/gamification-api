# Achievement Service Implementation Specification

> **Version**: 1.0.0
> **Status**: Production-Ready Specification
> **Last Updated**: 2025-11-30
> **Service Type**: Core Gamification Microservice

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Complete API Specification](#complete-api-specification)
3. [Database Design](#database-design)
4. [NestJS Implementation Architecture](#nestjs-implementation-architecture)
5. [Complete Code Examples](#complete-code-examples)
6. [Testing Specifications](#testing-specifications)
7. [Integration Patterns](#integration-patterns)
8. [Performance & Optimization](#performance--optimization)
9. [Security & Authorization](#security--authorization)
10. [Error Handling & Recovery](#error-handling--recovery)
11. [Monitoring & Observability](#monitoring--observability)

---

## Service Overview

### Purpose
The Achievement Service manages badges, trophies, and milestone tracking within the gamification platform. It handles achievement definition, progress tracking, unlocking logic, and showcasing functionality.

### Responsibilities
- **Achievement Definition**: Create and manage achievement templates with criteria
- **Progress Tracking**: Monitor user progress toward multi-step achievements
- **Unlock Logic**: Evaluate criteria and trigger achievement unlocks
- **Rarity System**: Classify and track achievement difficulty and exclusivity
- **Showcase Management**: Enable users to display earned achievements
- **Collection Sets**: Group related achievements for completion bonuses
- **Event Integration**: Emit events for cross-service coordination

### Key Features
- **Simple Achievements**: One-time unlocks (First Login, Welcome Badge)
- **Progressive Achievements**: Multi-level progression (Bronze → Silver → Gold)
- **Hidden Achievements**: Secret unlocks revealed on completion
- **Time-Limited**: Seasonal or event-based achievements
- **Collection Sets**: Groups with bonus rewards
- **Prerequisites**: Achievement chains requiring prior unlocks
- **Real-time Tracking**: Live progress updates
- **Leaderboard Integration**: Achievement point rankings

### Architecture Position
```
┌─────────────────────────────────────────────────┐
│              API Gateway                        │
└───────────────┬─────────────────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼────┐  ┌──▼────────┐ ┌▼─────────┐
│Account │  │Achievement│ │ Points & │
│Service │  │  Service  │ │ Rewards  │
└───┬────┘  └──┬────┬───┘ └┬─────────┘
    │          │    │      │
    └──────┬───┘    │      │
           │        │      │
       ┌───▼────────▼──────▼────┐
       │   Event Bus (Redis)    │
       └────────────────────────┘
```

---

## Complete API Specification

### Base Configuration
```yaml
service:
  name: achievement-service
  version: 1.0.0
  basePath: /api/v1/achievements
  port: 3002

authentication:
  type: API_KEY
  header: x-api-key

rateLimit:
  windowMs: 60000
  maxRequests: 100

cors:
  origin: '*'
  credentials: true
```

### REST Endpoints

#### 1. Get All Achievements
```typescript
GET /api/v1/achievements
```

**Query Parameters**:
```typescript
interface GetAchievementsQuery {
  category?: 'milestone' | 'mastery' | 'collection' | 'social' | 'event';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  isHidden?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rarity' | 'createdAt' | 'unlockedCount';
  sortOrder?: 'asc' | 'desc';
}
```

**Response** (200 OK):
```typescript
interface GetAchievementsResponse {
  data: {
    achievements: Achievement[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  status: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'mastery' | 'collection' | 'social' | 'event';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  criteria: AchievementCriteria;
  rewards: Reward[];
  prerequisites?: string[];
  isHidden: boolean;
  isActive: boolean;
  expiresAt?: Date;
  collectionId?: string;
  unlockedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AchievementCriteria {
  type: 'count' | 'streak' | 'threshold' | 'collection' | 'time' | 'composite';
  target: number;
  metric: string;
  conditions?: CriteriaCondition[];
  operator?: 'and' | 'or';
}

interface CriteriaCondition {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: any;
}

interface Reward {
  type: 'currency' | 'item' | 'unlock' | 'boost';
  currencyId?: string;
  amount?: number;
  itemId?: string;
  unlockType?: string;
  boostType?: string;
  duration?: number;
}
```

**Error Responses**:
- `400`: Invalid query parameters
- `429`: Rate limit exceeded
- `500`: Internal server error

---

#### 2. Get Achievement by ID
```typescript
GET /api/v1/achievements/:achievementId
```

**Path Parameters**:
- `achievementId` (string, required): Achievement unique identifier

**Response** (200 OK):
```typescript
interface GetAchievementResponse {
  data: {
    achievement: Achievement;
    globalStats: {
      totalUnlocked: number;
      unlockPercentage: number;
      averageUnlockTime: number;
    };
  };
  status: boolean;
}
```

**Error Responses**:
- `404`: Achievement not found
- `500`: Internal server error

---

#### 3. Update Achievement Progress
```typescript
POST /api/v1/achievements/progress
```

**Request Body**:
```typescript
interface UpdateProgressRequest {
  body: {
    userId: string;
    achievementId?: string;
    metric: string;
    value: number;
    increment?: boolean;
    metadata?: Record<string, any>;
  };
  reqMeta: {
    reqId: string;
    service: string;
  };
  client: {
    ip: string;
  };
}
```

**Response** (200 OK):
```typescript
interface UpdateProgressResponse {
  data: {
    updated: UserAchievement[];
    unlocked: UserAchievement[];
    rewards: Reward[];
  };
  status: boolean;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  targetProgress: number;
  percentComplete: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  isShowcased: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Error Responses**:
- `400`: Invalid request body
- `404`: Achievement or user not found
- `409`: Progress update conflict (race condition)
- `500`: Internal server error

---

#### 4. Get User Achievements
```typescript
GET /api/v1/achievements/users/:userId
```

**Path Parameters**:
- `userId` (string, required): User unique identifier

**Query Parameters**:
```typescript
interface GetUserAchievementsQuery {
  status?: 'locked' | 'in_progress' | 'unlocked';
  category?: 'milestone' | 'mastery' | 'collection' | 'social' | 'event';
  showcased?: boolean;
  page?: number;
  limit?: number;
}
```

**Response** (200 OK):
```typescript
interface GetUserAchievementsResponse {
  data: {
    achievements: UserAchievementDetail[];
    summary: {
      totalUnlocked: number;
      totalPoints: number;
      completionPercentage: number;
      rarityBreakdown: Record<string, number>;
      categoryBreakdown: Record<string, number>;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  status: boolean;
}

interface UserAchievementDetail extends UserAchievement {
  achievement: Achievement;
}
```

**Error Responses**:
- `404`: User not found
- `500`: Internal server error

---

#### 5. Showcase Achievement
```typescript
POST /api/v1/achievements/users/:userId/showcase
```

**Path Parameters**:
- `userId` (string, required): User unique identifier

**Request Body**:
```typescript
interface ShowcaseAchievementRequest {
  body: {
    achievementIds: string[];
    maxShowcased?: number;
  };
  reqMeta: {
    reqId: string;
    service: string;
  };
  client: {
    ip: string;
  };
}
```

**Response** (200 OK):
```typescript
interface ShowcaseAchievementResponse {
  data: {
    showcased: string[];
    removed: string[];
  };
  status: boolean;
}
```

**Error Responses**:
- `400`: Invalid achievement IDs or limit exceeded
- `404`: User or achievement not found
- `403`: Achievement not unlocked
- `500`: Internal server error

---

#### 6. Get Showcased Achievements
```typescript
GET /api/v1/achievements/users/:userId/showcased
```

**Path Parameters**:
- `userId` (string, required): User unique identifier

**Response** (200 OK):
```typescript
interface GetShowcasedResponse {
  data: {
    showcased: UserAchievementDetail[];
  };
  status: boolean;
}
```

---

#### 7. Create Achievement (Admin)
```typescript
POST /api/v1/achievements
```

**Request Body**:
```typescript
interface CreateAchievementRequest {
  body: {
    name: string;
    description: string;
    icon: string;
    category: 'milestone' | 'mastery' | 'collection' | 'social' | 'event';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    points: number;
    criteria: AchievementCriteria;
    rewards: Reward[];
    prerequisites?: string[];
    isHidden?: boolean;
    isActive?: boolean;
    expiresAt?: Date;
    collectionId?: string;
  };
  reqMeta: {
    reqId: string;
    service: string;
  };
  client: {
    ip: string;
  };
}
```

**Response** (201 Created):
```typescript
interface CreateAchievementResponse {
  data: {
    achievement: Achievement;
  };
  status: boolean;
}
```

**Error Responses**:
- `400`: Validation failed
- `409`: Achievement with same name exists
- `500`: Internal server error

---

#### 8. Update Achievement (Admin)
```typescript
PATCH /api/v1/achievements/:achievementId
```

**Request Body**:
```typescript
interface UpdateAchievementRequest {
  body: Partial<CreateAchievementRequest['body']>;
  reqMeta: {
    reqId: string;
    service: string;
  };
  client: {
    ip: string;
  };
}
```

**Response** (200 OK):
```typescript
interface UpdateAchievementResponse {
  data: {
    achievement: Achievement;
  };
  status: boolean;
}
```

---

#### 9. Delete Achievement (Admin)
```typescript
DELETE /api/v1/achievements/:achievementId
```

**Response** (200 OK):
```typescript
interface DeleteAchievementResponse {
  data: {
    deleted: boolean;
    affectedUsers: number;
  };
  status: boolean;
}
```

---

#### 10. Check Achievement Eligibility
```typescript
POST /api/v1/achievements/check
```

**Request Body**:
```typescript
interface CheckEligibilityRequest {
  body: {
    userId: string;
    achievementIds?: string[];
    autoUnlock?: boolean;
  };
  reqMeta: {
    reqId: string;
    service: string;
  };
  client: {
    ip: string;
  };
}
```

**Response** (200 OK):
```typescript
interface CheckEligibilityResponse {
  data: {
    eligible: Array<{
      achievementId: string;
      canUnlock: boolean;
      progress: number;
      missingPrerequisites?: string[];
    }>;
    unlocked?: UserAchievement[];
  };
  status: boolean;
}
```

---

### Error Codes

```typescript
enum AchievementErrorCode {
  // Client Errors (4xx)
  INVALID_REQUEST = 'ACHIEVEMENT_001',
  ACHIEVEMENT_NOT_FOUND = 'ACHIEVEMENT_002',
  USER_NOT_FOUND = 'ACHIEVEMENT_003',
  ALREADY_UNLOCKED = 'ACHIEVEMENT_004',
  PREREQUISITES_NOT_MET = 'ACHIEVEMENT_005',
  SHOWCASE_LIMIT_EXCEEDED = 'ACHIEVEMENT_006',
  ACHIEVEMENT_NOT_UNLOCKED = 'ACHIEVEMENT_007',
  ACHIEVEMENT_EXPIRED = 'ACHIEVEMENT_008',
  DUPLICATE_ACHIEVEMENT = 'ACHIEVEMENT_009',

  // Server Errors (5xx)
  DATABASE_ERROR = 'ACHIEVEMENT_500',
  CACHE_ERROR = 'ACHIEVEMENT_501',
  EVENT_PUBLISH_ERROR = 'ACHIEVEMENT_502',
  PROGRESS_UPDATE_CONFLICT = 'ACHIEVEMENT_503',
}

interface ErrorResponse {
  data: null;
  status: false;
  error: {
    code: AchievementErrorCode;
    message: string;
    details?: any;
    timestamp: Date;
    reqId: string;
  };
}
```

---

## Database Design

### MongoDB Collections

#### 1. `achievements` Collection

**Purpose**: Store achievement templates

**Schema**:
```typescript
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'achievements' })
export class AchievementDocument extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, trim: true })
  icon: string;

  @Prop({
    required: true,
    enum: ['milestone', 'mastery', 'collection', 'social', 'event']
  })
  category: string;

  @Prop({
    required: true,
    enum: ['common', 'rare', 'epic', 'legendary']
  })
  rarity: string;

  @Prop({ required: true, min: 0 })
  points: number;

  @Prop({
    required: true,
    type: {
      type: String,
      enum: ['count', 'streak', 'threshold', 'collection', 'time', 'composite'],
      required: true
    },
    target: { type: Number, required: true },
    metric: { type: String, required: true },
    conditions: [{
      field: String,
      operator: { type: String, enum: ['==', '!=', '>', '<', '>=', '<='] },
      value: Schema.Types.Mixed
    }],
    operator: { type: String, enum: ['and', 'or'] }
  })
  criteria: {
    type: string;
    target: number;
    metric: string;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    operator?: string;
  };

  @Prop({
    type: [{
      type: { type: String, enum: ['currency', 'item', 'unlock', 'boost'], required: true },
      currencyId: String,
      amount: Number,
      itemId: String,
      unlockType: String,
      boostType: String,
      duration: Number
    }],
    default: []
  })
  rewards: Array<{
    type: string;
    currencyId?: string;
    amount?: number;
    itemId?: string;
    unlockType?: string;
    boostType?: string;
    duration?: number;
  }>;

  @Prop({ type: [String], default: [] })
  prerequisites: string[];

  @Prop({ default: false })
  isHidden: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  expiresAt?: Date;

  @Prop({ type: String, default: null })
  collectionId?: string;

  @Prop({ default: 0 })
  unlockedCount: number;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export const AchievementSchema = SchemaFactory.createForClass(AchievementDocument);
```

**Indexes**:
```typescript
// Performance indexes
AchievementSchema.index({ category: 1, rarity: 1 });
AchievementSchema.index({ isActive: 1, expiresAt: 1 });
AchievementSchema.index({ collectionId: 1 });
AchievementSchema.index({ 'criteria.metric': 1 });
AchievementSchema.index({ name: 'text', description: 'text' });

// Unique constraint
AchievementSchema.index({ name: 1 }, { unique: true });

// TTL index for expired achievements
AchievementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
```

**Index Rationale**:
- `category + rarity`: Filter achievements by type (common query pattern)
- `isActive + expiresAt`: Efficiently find active/expired achievements
- `collectionId`: Group achievements in collections
- `criteria.metric`: Fast lookup for progress tracking
- Text index: Search achievements by name/description
- TTL index: Auto-delete expired achievements

---

#### 2. `user_achievements` Collection

**Purpose**: Track user progress and unlocks

**Schema**:
```typescript
@Schema({ timestamps: true, collection: 'user_achievements' })
export class UserAchievementDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  achievementId: string;

  @Prop({ required: true, default: 0, min: 0 })
  progress: number;

  @Prop({ required: true })
  targetProgress: number;

  @Prop({ default: false })
  isUnlocked: boolean;

  @Prop({ type: Date, default: null })
  unlockedAt?: Date;

  @Prop({ default: false })
  isShowcased: boolean;

  @Prop({ type: Number, default: 0 })
  showcaseOrder: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const UserAchievementSchema = SchemaFactory.createForClass(UserAchievementDocument);
```

**Indexes**:
```typescript
// Compound indexes for queries
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
UserAchievementSchema.index({ userId: 1, isUnlocked: 1 });
UserAchievementSchema.index({ userId: 1, isShowcased: 1 });
UserAchievementSchema.index({ achievementId: 1, isUnlocked: 1 });
UserAchievementSchema.index({ unlockedAt: -1 });

// Partial index for showcased achievements (sparse)
UserAchievementSchema.index(
  { userId: 1, showcaseOrder: 1 },
  { sparse: true, partialFilterExpression: { isShowcased: true } }
);
```

**Index Rationale**:
- `userId + achievementId`: Unique constraint and progress lookup
- `userId + isUnlocked`: Filter user's locked/unlocked achievements
- `userId + isShowcased`: Retrieve showcased achievements
- `achievementId + isUnlocked`: Global achievement stats
- `unlockedAt`: Recent unlocks timeline
- Partial index on `showcaseOrder`: Efficient ordering of showcased items

---

#### 3. `achievement_collections` Collection

**Purpose**: Group related achievements

**Schema**:
```typescript
@Schema({ timestamps: true, collection: 'achievement_collections' })
export class AchievementCollectionDocument extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, trim: true })
  icon: string;

  @Prop({ type: [String], default: [] })
  achievementIds: string[];

  @Prop({
    type: [{
      type: { type: String, enum: ['currency', 'item', 'unlock', 'boost'] },
      currencyId: String,
      amount: Number,
      itemId: String,
      unlockType: String,
      boostType: String,
      duration: Number
    }],
    default: []
  })
  completionRewards: Array<{
    type: string;
    currencyId?: string;
    amount?: number;
    itemId?: string;
    unlockType?: string;
    boostType?: string;
    duration?: number;
  }>;

  @Prop({ default: true })
  isActive: boolean;
}

export const AchievementCollectionSchema = SchemaFactory.createForClass(AchievementCollectionDocument);
```

**Indexes**:
```typescript
AchievementCollectionSchema.index({ name: 1 }, { unique: true });
AchievementCollectionSchema.index({ isActive: 1 });
```

---

### MongoDB Migration Script Example

```typescript
// migrations/001_create_achievements_indexes.ts
import { MongoClient } from 'mongodb';

export async function up(client: MongoClient) {
  const db = client.db();

  // Create achievements collection indexes
  await db.collection('achievements').createIndexes([
    { key: { category: 1, rarity: 1 }, name: 'idx_category_rarity' },
    { key: { isActive: 1, expiresAt: 1 }, name: 'idx_active_expires' },
    { key: { collectionId: 1 }, name: 'idx_collection' },
    { key: { 'criteria.metric': 1 }, name: 'idx_criteria_metric' },
    {
      key: { name: 'text', description: 'text' },
      name: 'idx_text_search',
      weights: { name: 2, description: 1 }
    },
    {
      key: { name: 1 },
      name: 'idx_name_unique',
      unique: true
    },
    {
      key: { expiresAt: 1 },
      name: 'idx_ttl',
      expireAfterSeconds: 0,
      sparse: true
    }
  ]);

  // Create user_achievements collection indexes
  await db.collection('user_achievements').createIndexes([
    {
      key: { userId: 1, achievementId: 1 },
      name: 'idx_user_achievement_unique',
      unique: true
    },
    { key: { userId: 1, isUnlocked: 1 }, name: 'idx_user_unlocked' },
    { key: { userId: 1, isShowcased: 1 }, name: 'idx_user_showcased' },
    { key: { achievementId: 1, isUnlocked: 1 }, name: 'idx_achievement_unlocked' },
    { key: { unlockedAt: -1 }, name: 'idx_unlocked_at' },
    {
      key: { userId: 1, showcaseOrder: 1 },
      name: 'idx_showcase_order',
      sparse: true,
      partialFilterExpression: { isShowcased: true }
    }
  ]);

  // Create achievement_collections collection indexes
  await db.collection('achievement_collections').createIndexes([
    { key: { name: 1 }, name: 'idx_name_unique', unique: true },
    { key: { isActive: 1 }, name: 'idx_active' }
  ]);

  console.log('Indexes created successfully');
}

export async function down(client: MongoClient) {
  const db = client.db();

  await db.collection('achievements').dropIndexes();
  await db.collection('user_achievements').dropIndexes();
  await db.collection('achievement_collections').dropIndexes();

  console.log('Indexes dropped successfully');
}
```

---

## NestJS Implementation Architecture

### Module Structure

```
apps/achievement/
├── src/
│   ├── modules/
│   │   ├── achievement.module.ts
│   │   ├── controllers/
│   │   │   ├── achievement.controller.ts
│   │   │   ├── user-achievement.controller.ts
│   │   │   └── admin-achievement.controller.ts
│   │   ├── services/
│   │   │   ├── achievement.service.ts
│   │   │   ├── user-achievement.service.ts
│   │   │   ├── achievement-unlock.service.ts
│   │   │   └── achievement-criteria.service.ts
│   │   ├── repositories/
│   │   │   ├── achievement.repository.ts
│   │   │   ├── user-achievement.repository.ts
│   │   │   └── achievement-collection.repository.ts
│   │   ├── dto/
│   │   │   ├── create-achievement.dto.ts
│   │   │   ├── update-progress.dto.ts
│   │   │   ├── showcase-achievement.dto.ts
│   │   │   └── query-achievements.dto.ts
│   │   ├── events/
│   │   │   ├── achievement-unlocked.event.ts
│   │   │   ├── progress-updated.event.ts
│   │   │   └── collection-completed.event.ts
│   │   └── guards/
│   │       ├── api-key.guard.ts
│   │       └── admin.guard.ts
│   ├── main.ts
│   └── app.module.ts
└── test/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Module Definition

```typescript
// achievement.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GlobalConfigModule,
  GlobalMongoModule,
  GlobalCacheModule
} from '@gamification-api/modules';

import { AchievementController } from './controllers/achievement.controller';
import { UserAchievementController } from './controllers/user-achievement.controller';
import { AdminAchievementController } from './controllers/admin-achievement.controller';

import { AchievementService } from './services/achievement.service';
import { UserAchievementService } from './services/user-achievement.service';
import { AchievementUnlockService } from './services/achievement-unlock.service';
import { AchievementCriteriaService } from './services/achievement-criteria.service';

import { AchievementRepository } from './repositories/achievement.repository';
import { UserAchievementRepository } from './repositories/user-achievement.repository';
import { AchievementCollectionRepository } from './repositories/achievement-collection.repository';

import {
  AchievementDocument,
  AchievementSchema
} from './schemas/achievement.schema';
import {
  UserAchievementDocument,
  UserAchievementSchema
} from './schemas/user-achievement.schema';
import {
  AchievementCollectionDocument,
  AchievementCollectionSchema
} from './schemas/achievement-collection.schema';

@Module({
  imports: [
    GlobalConfigModule,
    GlobalMongoModule,
    GlobalCacheModule,
    MongooseModule.forFeature([
      { name: AchievementDocument.name, schema: AchievementSchema },
      { name: UserAchievementDocument.name, schema: UserAchievementSchema },
      { name: AchievementCollectionDocument.name, schema: AchievementCollectionSchema }
    ])
  ],
  controllers: [
    AchievementController,
    UserAchievementController,
    AdminAchievementController
  ],
  providers: [
    AchievementService,
    UserAchievementService,
    AchievementUnlockService,
    AchievementCriteriaService,
    AchievementRepository,
    UserAchievementRepository,
    AchievementCollectionRepository
  ],
  exports: [
    AchievementService,
    UserAchievementService
  ]
})
export class AchievementModule {}
```

### DTOs and Validation

```typescript
// dto/update-progress.dto.ts
import { IsString, IsNumber, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProgressBodyDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  achievementId?: string;

  @IsString()
  metric: string;

  @IsNumber()
  @Type(() => Number)
  value: number;

  @IsBoolean()
  @IsOptional()
  increment?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateProgressDto {
  body: UpdateProgressBodyDto;
  reqMeta: {
    reqId: string;
    service: string;
  };
  client: {
    ip: string;
  };
}
```

```typescript
// dto/showcase-achievement.dto.ts
import { IsString, IsArray, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ShowcaseAchievementBodyDto {
  @IsArray()
  @IsString({ each: true })
  achievementIds: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxShowcased?: number;
}

export class ShowcaseAchievementDto {
  body: ShowcaseAchievementBodyDto;
  reqMeta: {
    reqId: string;
    service: string;
  };
  client: {
    ip: string;
  };
}
```

### Event Emitters

```typescript
// events/achievement-unlocked.event.ts
export class AchievementUnlockedEvent {
  constructor(
    public readonly userId: string,
    public readonly achievementId: string,
    public readonly achievementName: string,
    public readonly rarity: string,
    public readonly points: number,
    public readonly rewards: any[],
    public readonly timestamp: Date
  ) {}
}

// events/progress-updated.event.ts
export class ProgressUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly achievementId: string,
    public readonly progress: number,
    public readonly targetProgress: number,
    public readonly percentComplete: number,
    public readonly timestamp: Date
  ) {}
}

// events/collection-completed.event.ts
export class CollectionCompletedEvent {
  constructor(
    public readonly userId: string,
    public readonly collectionId: string,
    public readonly collectionName: string,
    public readonly achievementIds: string[],
    public readonly rewards: any[],
    public readonly timestamp: Date
  ) {}
}
```

### Error Handling Strategy

```typescript
// exceptions/achievement.exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class AchievementNotFoundException extends HttpException {
  constructor(achievementId: string) {
    super(
      {
        status: false,
        error: {
          code: 'ACHIEVEMENT_002',
          message: `Achievement not found: ${achievementId}`,
          timestamp: new Date()
        }
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(
      {
        status: false,
        error: {
          code: 'ACHIEVEMENT_003',
          message: `User not found: ${userId}`,
          timestamp: new Date()
        }
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class AlreadyUnlockedException extends HttpException {
  constructor(achievementId: string) {
    super(
      {
        status: false,
        error: {
          code: 'ACHIEVEMENT_004',
          message: `Achievement already unlocked: ${achievementId}`,
          timestamp: new Date()
        }
      },
      HttpStatus.CONFLICT
    );
  }
}

export class PrerequisitesNotMetException extends HttpException {
  constructor(missingPrerequisites: string[]) {
    super(
      {
        status: false,
        error: {
          code: 'ACHIEVEMENT_005',
          message: 'Prerequisites not met',
          details: { missingPrerequisites },
          timestamp: new Date()
        }
      },
      HttpStatus.FORBIDDEN
    );
  }
}

export class ProgressUpdateConflictException extends HttpException {
  constructor(details?: any) {
    super(
      {
        status: false,
        error: {
          code: 'ACHIEVEMENT_503',
          message: 'Progress update conflict detected',
          details,
          timestamp: new Date()
        }
      },
      HttpStatus.CONFLICT
    );
  }
}
```

### Logging Strategy

```typescript
// Using existing LoggerService from @gamification-api/utility
import { LoggerService } from '@gamification-api/utility';

// In services
export class AchievementService {
  private readonly logger = LoggerService.logger();

  async createAchievement(data: any) {
    this.logger.info({
      type: 'ACHIEVEMENT_CREATE',
      name: data.name,
      category: data.category
    });

    try {
      const achievement = await this.achievementRepository.create(data);

      this.logger.info({
        type: 'ACHIEVEMENT_CREATED',
        achievementId: achievement.id,
        name: achievement.name
      });

      return achievement;
    } catch (error) {
      this.logger.error({
        type: 'ACHIEVEMENT_CREATE_ERROR',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
```

---

## Complete Code Examples

### 1. Controller Implementation

```typescript
// controllers/user-achievement.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UsePipes,
  ValidationPipe,
  UseInterceptors
} from '@nestjs/common';
import { CustomBodyParser } from '@gamification-api/decorators';
import { LoggerInterceptor } from '@gamification-api/interceptors';
import { BaseResponseDto } from '@gamification-api/core';

import { UserAchievementService } from '../services/user-achievement.service';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import { ShowcaseAchievementDto } from '../dto/showcase-achievement.dto';
import { GetUserAchievementsQuery } from '../dto/query-achievements.dto';

@Controller('api/v1/achievements')
@UseInterceptors(LoggerInterceptor)
export class UserAchievementController {
  constructor(
    private readonly userAchievementService: UserAchievementService
  ) {}

  @Post('progress')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateProgress(
    @CustomBodyParser() request: UpdateProgressDto
  ): Promise<BaseResponseDto<any>> {
    const result = await this.userAchievementService.updateProgress({
      userId: request.body.userId,
      achievementId: request.body.achievementId,
      metric: request.body.metric,
      value: request.body.value,
      increment: request.body.increment ?? true,
      metadata: request.body.metadata ?? {}
    });

    return {
      data: result,
      status: true
    };
  }

  @Get('users/:userId')
  async getUserAchievements(
    @Param('userId') userId: string,
    @Query() query: GetUserAchievementsQuery
  ): Promise<BaseResponseDto<any>> {
    const result = await this.userAchievementService.getUserAchievements({
      userId,
      status: query.status,
      category: query.category,
      showcased: query.showcased,
      page: query.page ?? 1,
      limit: query.limit ?? 20
    });

    return {
      data: result,
      status: true
    };
  }

  @Post('users/:userId/showcase')
  @UsePipes(new ValidationPipe({ transform: true }))
  async showcaseAchievements(
    @Param('userId') userId: string,
    @CustomBodyParser() request: ShowcaseAchievementDto
  ): Promise<BaseResponseDto<any>> {
    const result = await this.userAchievementService.showcaseAchievements({
      userId,
      achievementIds: request.body.achievementIds,
      maxShowcased: request.body.maxShowcased ?? 5
    });

    return {
      data: result,
      status: true
    };
  }

  @Get('users/:userId/showcased')
  async getShowcasedAchievements(
    @Param('userId') userId: string
  ): Promise<BaseResponseDto<any>> {
    const result = await this.userAchievementService.getShowcasedAchievements(userId);

    return {
      data: {
        showcased: result
      },
      status: true
    };
  }
}
```

### 2. Service Layer Business Logic

```typescript
// services/achievement-unlock.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { LoggerService } from '@gamification-api/utility';

import { AchievementRepository } from '../repositories/achievement.repository';
import { UserAchievementRepository } from '../repositories/user-achievement.repository';
import { AchievementCriteriaService } from './achievement-criteria.service';
import {
  AchievementUnlockedEvent,
  ProgressUpdatedEvent,
  CollectionCompletedEvent
} from '../events';
import {
  AlreadyUnlockedException,
  PrerequisitesNotMetException,
  ProgressUpdateConflictException
} from '../exceptions/achievement.exceptions';

interface UpdateProgressParams {
  userId: string;
  achievementId?: string;
  metric: string;
  value: number;
  increment?: boolean;
  metadata?: Record<string, any>;
}

interface UnlockResult {
  updated: any[];
  unlocked: any[];
  rewards: any[];
}

@Injectable()
export class AchievementUnlockService {
  private readonly logger = LoggerService.logger();
  private readonly LOCK_TTL = 5000; // 5 seconds
  private readonly LOCK_RETRY_DELAY = 100; // 100ms

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly achievementRepository: AchievementRepository,
    private readonly userAchievementRepository: UserAchievementRepository,
    private readonly criteriaService: AchievementCriteriaService
  ) {}

  async updateProgress(params: UpdateProgressParams): Promise<UnlockResult> {
    const { userId, achievementId, metric, value, increment = true, metadata = {} } = params;

    // Acquire distributed lock to prevent race conditions
    const lockKey = `achievement:lock:${userId}:${metric}`;
    const lockAcquired = await this.acquireLock(lockKey);

    if (!lockAcquired) {
      this.logger.warn({
        type: 'ACHIEVEMENT_LOCK_FAILED',
        userId,
        metric,
        message: 'Could not acquire lock for progress update'
      });
      throw new ProgressUpdateConflictException({ userId, metric });
    }

    try {
      // Find achievements matching this metric
      const relevantAchievements = achievementId
        ? [await this.achievementRepository.findById(achievementId)]
        : await this.achievementRepository.findByMetric(metric);

      const updated = [];
      const unlocked = [];
      const rewards = [];

      for (const achievement of relevantAchievements) {
        if (!achievement.isActive) continue;
        if (achievement.expiresAt && new Date() > achievement.expiresAt) continue;

        // Get or create user achievement record
        let userAchievement = await this.userAchievementRepository.findOne({
          userId,
          achievementId: achievement.id
        });

        if (!userAchievement) {
          userAchievement = await this.userAchievementRepository.create({
            userId,
            achievementId: achievement.id,
            progress: 0,
            targetProgress: achievement.criteria.target,
            isUnlocked: false,
            metadata: {}
          });
        }

        // Skip if already unlocked
        if (userAchievement.isUnlocked) continue;

        // Check prerequisites
        if (achievement.prerequisites?.length > 0) {
          const prerequisitesMet = await this.checkPrerequisites(
            userId,
            achievement.prerequisites
          );

          if (!prerequisitesMet) {
            this.logger.info({
              type: 'PREREQUISITES_NOT_MET',
              userId,
              achievementId: achievement.id,
              prerequisites: achievement.prerequisites
            });
            continue;
          }
        }

        // Update progress
        const previousProgress = userAchievement.progress;
        const newProgress = increment
          ? previousProgress + value
          : value;

        userAchievement.progress = Math.min(newProgress, achievement.criteria.target);
        userAchievement.metadata = { ...userAchievement.metadata, ...metadata };

        // Check if criteria met
        const criteriaMet = await this.criteriaService.evaluateCriteria({
          achievement,
          userAchievement,
          currentValue: userAchievement.progress
        });

        if (criteriaMet && !userAchievement.isUnlocked) {
          // Unlock achievement
          userAchievement.isUnlocked = true;
          userAchievement.unlockedAt = new Date();
          userAchievement.progress = achievement.criteria.target;

          // Increment global unlock counter
          await this.achievementRepository.incrementUnlockCount(achievement.id);

          // Collect rewards
          rewards.push(...achievement.rewards);

          unlocked.push(userAchievement);

          // Emit unlock event
          await this.emitUnlockEvent(userId, achievement, userAchievement);

          // Check collection completion
          if (achievement.collectionId) {
            await this.checkCollectionCompletion(userId, achievement.collectionId);
          }

          this.logger.info({
            type: 'ACHIEVEMENT_UNLOCKED',
            userId,
            achievementId: achievement.id,
            achievementName: achievement.name,
            rarity: achievement.rarity
          });
        } else {
          updated.push(userAchievement);

          // Emit progress event
          await this.emitProgressEvent(userId, achievement, userAchievement);
        }

        // Save progress
        await this.userAchievementRepository.update(
          userAchievement.id,
          userAchievement
        );
      }

      // Invalidate cache
      await this.invalidateUserCache(userId);

      return { updated, unlocked, rewards };

    } finally {
      // Always release lock
      await this.releaseLock(lockKey);
    }
  }

  private async checkPrerequisites(
    userId: string,
    prerequisiteIds: string[]
  ): Promise<boolean> {
    const userAchievements = await this.userAchievementRepository.findMany({
      userId,
      achievementId: { $in: prerequisiteIds },
      isUnlocked: true
    });

    return userAchievements.length === prerequisiteIds.length;
  }

  private async checkCollectionCompletion(
    userId: string,
    collectionId: string
  ): Promise<void> {
    const collection = await this.achievementRepository.findCollectionById(collectionId);

    if (!collection) return;

    const userCollectionAchievements = await this.userAchievementRepository.findMany({
      userId,
      achievementId: { $in: collection.achievementIds },
      isUnlocked: true
    });

    if (userCollectionAchievements.length === collection.achievementIds.length) {
      // Collection completed
      this.logger.info({
        type: 'COLLECTION_COMPLETED',
        userId,
        collectionId,
        collectionName: collection.name
      });

      // Emit collection completion event
      await this.emitCollectionEvent(userId, collection);
    }
  }

  private async emitUnlockEvent(
    userId: string,
    achievement: any,
    userAchievement: any
  ): Promise<void> {
    const event = new AchievementUnlockedEvent(
      userId,
      achievement.id,
      achievement.name,
      achievement.rarity,
      achievement.points,
      achievement.rewards,
      userAchievement.unlockedAt
    );

    // Publish to Redis pub/sub
    await this.redis.publish(
      'achievement.unlocked',
      JSON.stringify(event)
    );
  }

  private async emitProgressEvent(
    userId: string,
    achievement: any,
    userAchievement: any
  ): Promise<void> {
    const percentComplete = (userAchievement.progress / achievement.criteria.target) * 100;

    const event = new ProgressUpdatedEvent(
      userId,
      achievement.id,
      userAchievement.progress,
      achievement.criteria.target,
      percentComplete,
      new Date()
    );

    await this.redis.publish(
      'achievement.progress',
      JSON.stringify(event)
    );
  }

  private async emitCollectionEvent(
    userId: string,
    collection: any
  ): Promise<void> {
    const event = new CollectionCompletedEvent(
      userId,
      collection.id,
      collection.name,
      collection.achievementIds,
      collection.completionRewards,
      new Date()
    );

    await this.redis.publish(
      'achievement.collection.completed',
      JSON.stringify(event)
    );
  }

  private async acquireLock(key: string): Promise<boolean> {
    const result = await this.redis.set(
      key,
      '1',
      'PX',
      this.LOCK_TTL,
      'NX'
    );
    return result === 'OK';
  }

  private async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const cacheKeys = [
      `user:achievements:${userId}`,
      `user:achievements:showcased:${userId}`,
      `user:achievements:stats:${userId}`
    ];

    await this.redis.del(...cacheKeys);
  }
}
```

### 3. Repository Data Access Pattern

```typescript
// repositories/user-achievement.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { LoggerService } from '@gamification-api/utility';

import { UserAchievementDocument } from '../schemas/user-achievement.schema';

@Injectable()
export class UserAchievementRepository {
  private readonly logger = LoggerService.logger();

  constructor(
    @InjectModel(UserAchievementDocument.name)
    private readonly userAchievementModel: Model<UserAchievementDocument>
  ) {}

  async create(data: Partial<UserAchievementDocument>): Promise<UserAchievementDocument> {
    try {
      const userAchievement = new this.userAchievementModel(data);
      return await userAchievement.save();
    } catch (error) {
      this.logger.error({
        type: 'USER_ACHIEVEMENT_CREATE_ERROR',
        error: error.message,
        data
      });
      throw error;
    }
  }

  async findOne(
    filter: FilterQuery<UserAchievementDocument>
  ): Promise<UserAchievementDocument | null> {
    try {
      return await this.userAchievementModel.findOne(filter).exec();
    } catch (error) {
      this.logger.error({
        type: 'USER_ACHIEVEMENT_FIND_ERROR',
        error: error.message,
        filter
      });
      throw error;
    }
  }

  async findMany(
    filter: FilterQuery<UserAchievementDocument>
  ): Promise<UserAchievementDocument[]> {
    try {
      return await this.userAchievementModel.find(filter).exec();
    } catch (error) {
      this.logger.error({
        type: 'USER_ACHIEVEMENT_FIND_MANY_ERROR',
        error: error.message,
        filter
      });
      throw error;
    }
  }

  async findUserAchievementsWithDetails(params: {
    userId: string;
    status?: 'locked' | 'in_progress' | 'unlocked';
    category?: string;
    showcased?: boolean;
    page: number;
    limit: number;
  }): Promise<{ achievements: any[], total: number }> {
    const { userId, status, category, showcased, page, limit } = params;
    const skip = (page - 1) * limit;

    try {
      // Build filter
      const filter: any = { userId };

      if (status === 'unlocked') {
        filter.isUnlocked = true;
      } else if (status === 'in_progress') {
        filter.isUnlocked = false;
        filter.progress = { $gt: 0 };
      } else if (status === 'locked') {
        filter.isUnlocked = false;
        filter.progress = 0;
      }

      if (showcased !== undefined) {
        filter.isShowcased = showcased;
      }

      // Aggregation pipeline for join with achievements
      const pipeline: any[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'achievements',
            localField: 'achievementId',
            foreignField: '_id',
            as: 'achievement'
          }
        },
        { $unwind: '$achievement' },
        {
          $addFields: {
            percentComplete: {
              $multiply: [
                { $divide: ['$progress', '$targetProgress'] },
                100
              ]
            }
          }
        }
      ];

      // Category filter
      if (category) {
        pipeline.push({
          $match: { 'achievement.category': category }
        });
      }

      // Count total
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await this.userAchievementModel.aggregate(countPipeline).exec();
      const total = countResult[0]?.total ?? 0;

      // Get paginated results
      pipeline.push(
        { $sort: { unlockedAt: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      );

      const achievements = await this.userAchievementModel.aggregate(pipeline).exec();

      return { achievements, total };

    } catch (error) {
      this.logger.error({
        type: 'USER_ACHIEVEMENT_DETAILS_ERROR',
        error: error.message,
        params
      });
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<UserAchievementDocument>
  ): Promise<UserAchievementDocument | null> {
    try {
      return await this.userAchievementModel
        .findByIdAndUpdate(id, data, { new: true })
        .exec();
    } catch (error) {
      this.logger.error({
        type: 'USER_ACHIEVEMENT_UPDATE_ERROR',
        error: error.message,
        id,
        data
      });
      throw error;
    }
  }

  async updateMany(
    filter: FilterQuery<UserAchievementDocument>,
    update: any
  ): Promise<number> {
    try {
      const result = await this.userAchievementModel
        .updateMany(filter, update)
        .exec();
      return result.modifiedCount;
    } catch (error) {
      this.logger.error({
        type: 'USER_ACHIEVEMENT_UPDATE_MANY_ERROR',
        error: error.message,
        filter,
        update
      });
      throw error;
    }
  }

  async getUserStats(userId: string): Promise<any> {
    try {
      const pipeline = [
        { $match: { userId, isUnlocked: true } },
        {
          $lookup: {
            from: 'achievements',
            localField: 'achievementId',
            foreignField: '_id',
            as: 'achievement'
          }
        },
        { $unwind: '$achievement' },
        {
          $group: {
            _id: null,
            totalUnlocked: { $sum: 1 },
            totalPoints: { $sum: '$achievement.points' },
            rarityBreakdown: {
              $push: {
                k: '$achievement.rarity',
                v: 1
              }
            },
            categoryBreakdown: {
              $push: {
                k: '$achievement.category',
                v: 1
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalUnlocked: 1,
            totalPoints: 1,
            rarityBreakdown: { $arrayToObject: '$rarityBreakdown' },
            categoryBreakdown: { $arrayToObject: '$categoryBreakdown' }
          }
        }
      ];

      const result = await this.userAchievementModel.aggregate(pipeline).exec();
      return result[0] ?? {
        totalUnlocked: 0,
        totalPoints: 0,
        rarityBreakdown: {},
        categoryBreakdown: {}
      };

    } catch (error) {
      this.logger.error({
        type: 'USER_ACHIEVEMENT_STATS_ERROR',
        error: error.message,
        userId
      });
      throw error;
    }
  }
}
```

### 4. Event Publishing Example

```typescript
// services/user-achievement.service.ts (showcase method)
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { UserAchievementRepository } from '../repositories/user-achievement.repository';
import {
  AchievementNotFoundException,
  AchievementNotUnlockedException
} from '../exceptions/achievement.exceptions';

@Injectable()
export class UserAchievementService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly userAchievementRepository: UserAchievementRepository
  ) {}

  async showcaseAchievements(params: {
    userId: string;
    achievementIds: string[];
    maxShowcased: number;
  }): Promise<{ showcased: string[]; removed: string[] }> {
    const { userId, achievementIds, maxShowcased } = params;

    // Validate all achievements are unlocked
    const userAchievements = await this.userAchievementRepository.findMany({
      userId,
      achievementId: { $in: achievementIds }
    });

    const unlockedMap = new Map(
      userAchievements
        .filter(ua => ua.isUnlocked)
        .map(ua => [ua.achievementId, ua])
    );

    // Check all requested achievements are unlocked
    for (const achievementId of achievementIds) {
      if (!unlockedMap.has(achievementId)) {
        throw new AchievementNotUnlockedException(achievementId);
      }
    }

    // Enforce max showcased limit
    const toShowcase = achievementIds.slice(0, maxShowcased);

    // Remove existing showcased achievements
    await this.userAchievementRepository.updateMany(
      { userId, isShowcased: true },
      { isShowcased: false, showcaseOrder: 0 }
    );

    const removed = userAchievements
      .filter(ua => ua.isShowcased && !toShowcase.includes(ua.achievementId))
      .map(ua => ua.achievementId);

    // Set new showcased achievements with order
    for (let i = 0; i < toShowcase.length; i++) {
      const achievementId = toShowcase[i];
      const userAchievement = unlockedMap.get(achievementId);

      if (userAchievement) {
        await this.userAchievementRepository.update(userAchievement.id, {
          isShowcased: true,
          showcaseOrder: i + 1
        });
      }
    }

    // Invalidate cache
    await this.redis.del(`user:achievements:showcased:${userId}`);

    // Publish event
    await this.redis.publish(
      'achievement.showcased',
      JSON.stringify({
        userId,
        showcased: toShowcase,
        timestamp: new Date()
      })
    );

    return { showcased: toShowcase, removed };
  }
}
```

---

## Testing Specifications

### Unit Test Cases

```typescript
// test/unit/achievement-unlock.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRedisToken } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { AchievementUnlockService } from '../../src/services/achievement-unlock.service';
import { AchievementRepository } from '../../src/repositories/achievement.repository';
import { UserAchievementRepository } from '../../src/repositories/user-achievement.repository';
import { AchievementCriteriaService } from '../../src/services/achievement-criteria.service';

describe('AchievementUnlockService', () => {
  let service: AchievementUnlockService;
  let achievementRepo: jest.Mocked<AchievementRepository>;
  let userAchievementRepo: jest.Mocked<UserAchievementRepository>;
  let criteriaService: jest.Mocked<AchievementCriteriaService>;
  let redis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementUnlockService,
        {
          provide: AchievementRepository,
          useValue: {
            findById: jest.fn(),
            findByMetric: jest.fn(),
            incrementUnlockCount: jest.fn(),
            findCollectionById: jest.fn()
          }
        },
        {
          provide: UserAchievementRepository,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn()
          }
        },
        {
          provide: AchievementCriteriaService,
          useValue: {
            evaluateCriteria: jest.fn()
          }
        },
        {
          provide: getRedisToken(),
          useValue: {
            set: jest.fn(),
            del: jest.fn(),
            publish: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<AchievementUnlockService>(AchievementUnlockService);
    achievementRepo = module.get(AchievementRepository);
    userAchievementRepo = module.get(UserAchievementRepository);
    criteriaService = module.get(AchievementCriteriaService);
    redis = module.get(getRedisToken());
  });

  describe('updateProgress', () => {
    it('should unlock achievement when criteria is met', async () => {
      // Arrange
      const userId = 'user123';
      const metric = 'posts.created';
      const value = 10;

      const mockAchievement = {
        id: 'achievement123',
        name: 'Content Creator',
        isActive: true,
        expiresAt: null,
        prerequisites: [],
        criteria: {
          type: 'count',
          target: 10,
          metric: 'posts.created'
        },
        rewards: [
          { type: 'currency', currencyId: 'xp', amount: 100 }
        ],
        rarity: 'common',
        points: 50
      };

      const mockUserAchievement = {
        id: 'userAch123',
        userId,
        achievementId: 'achievement123',
        progress: 5,
        targetProgress: 10,
        isUnlocked: false,
        metadata: {}
      };

      redis.set.mockResolvedValue('OK');
      achievementRepo.findByMetric.mockResolvedValue([mockAchievement]);
      userAchievementRepo.findOne.mockResolvedValue(mockUserAchievement);
      criteriaService.evaluateCriteria.mockResolvedValue(true);
      userAchievementRepo.update.mockResolvedValue(mockUserAchievement);

      // Act
      const result = await service.updateProgress({
        userId,
        metric,
        value,
        increment: true
      });

      // Assert
      expect(result.unlocked).toHaveLength(1);
      expect(result.unlocked[0].isUnlocked).toBe(true);
      expect(result.unlocked[0].progress).toBe(10);
      expect(result.rewards).toHaveLength(1);
      expect(redis.publish).toHaveBeenCalledWith(
        'achievement.unlocked',
        expect.any(String)
      );
      expect(redis.del).toHaveBeenCalled();
    });

    it('should update progress without unlocking when criteria not met', async () => {
      // Arrange
      const userId = 'user123';
      const metric = 'posts.created';
      const value = 3;

      const mockAchievement = {
        id: 'achievement123',
        name: 'Content Creator',
        isActive: true,
        expiresAt: null,
        prerequisites: [],
        criteria: {
          type: 'count',
          target: 10,
          metric: 'posts.created'
        },
        rewards: []
      };

      const mockUserAchievement = {
        id: 'userAch123',
        userId,
        achievementId: 'achievement123',
        progress: 5,
        targetProgress: 10,
        isUnlocked: false
      };

      redis.set.mockResolvedValue('OK');
      achievementRepo.findByMetric.mockResolvedValue([mockAchievement]);
      userAchievementRepo.findOne.mockResolvedValue(mockUserAchievement);
      criteriaService.evaluateCriteria.mockResolvedValue(false);

      // Act
      const result = await service.updateProgress({
        userId,
        metric,
        value,
        increment: true
      });

      // Assert
      expect(result.updated).toHaveLength(1);
      expect(result.unlocked).toHaveLength(0);
      expect(result.updated[0].progress).toBe(8);
      expect(result.updated[0].isUnlocked).toBe(false);
    });

    it('should skip already unlocked achievements', async () => {
      // Arrange
      const userId = 'user123';
      const metric = 'posts.created';
      const value = 5;

      const mockAchievement = {
        id: 'achievement123',
        isActive: true,
        criteria: { metric: 'posts.created', target: 10 }
      };

      const mockUserAchievement = {
        userId,
        achievementId: 'achievement123',
        isUnlocked: true,
        progress: 10
      };

      redis.set.mockResolvedValue('OK');
      achievementRepo.findByMetric.mockResolvedValue([mockAchievement]);
      userAchievementRepo.findOne.mockResolvedValue(mockUserAchievement);

      // Act
      const result = await service.updateProgress({
        userId,
        metric,
        value
      });

      // Assert
      expect(result.updated).toHaveLength(0);
      expect(result.unlocked).toHaveLength(0);
      expect(criteriaService.evaluateCriteria).not.toHaveBeenCalled();
    });

    it('should skip inactive achievements', async () => {
      // Arrange
      const mockAchievement = {
        id: 'achievement123',
        isActive: false,
        criteria: { metric: 'posts.created' }
      };

      redis.set.mockResolvedValue('OK');
      achievementRepo.findByMetric.mockResolvedValue([mockAchievement]);

      // Act
      const result = await service.updateProgress({
        userId: 'user123',
        metric: 'posts.created',
        value: 5
      });

      // Assert
      expect(result.updated).toHaveLength(0);
      expect(result.unlocked).toHaveLength(0);
    });

    it('should throw conflict exception when lock cannot be acquired', async () => {
      // Arrange
      redis.set.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateProgress({
          userId: 'user123',
          metric: 'posts.created',
          value: 5
        })
      ).rejects.toThrow('Progress update conflict detected');
    });
  });
});
```

### Integration Test Scenarios

```typescript
// test/integration/achievement-flow.spec.ts
import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Redis from 'ioredis-mock';

import { AchievementModule } from '../../src/modules/achievement.module';
import { AchievementService } from '../../src/services/achievement.service';
import { UserAchievementService } from '../../src/services/user-achievement.service';
import { AchievementUnlockService } from '../../src/services/achievement-unlock.service';

describe('Achievement Flow Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let achievementService: AchievementService;
  let userAchievementService: UserAchievementService;
  let unlockService: AchievementUnlockService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AchievementModule
      ]
    })
      .overrideProvider('REDIS')
      .useValue(new Redis())
      .compile();

    achievementService = module.get(AchievementService);
    userAchievementService = module.get(UserAchievementService);
    unlockService = module.get(AchievementUnlockService);
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it('should complete full achievement unlock flow', async () => {
    // 1. Create achievement
    const achievement = await achievementService.createAchievement({
      name: 'First Post',
      description: 'Create your first post',
      icon: 'https://example.com/icon.png',
      category: 'milestone',
      rarity: 'common',
      points: 10,
      criteria: {
        type: 'count',
        target: 1,
        metric: 'posts.created'
      },
      rewards: [
        { type: 'currency', currencyId: 'xp', amount: 50 }
      ],
      isHidden: false,
      isActive: true
    });

    expect(achievement.id).toBeDefined();

    // 2. Update progress (should unlock)
    const result = await unlockService.updateProgress({
      userId: 'user123',
      metric: 'posts.created',
      value: 1,
      increment: true
    });

    expect(result.unlocked).toHaveLength(1);
    expect(result.unlocked[0].achievementId).toBe(achievement.id);
    expect(result.rewards).toHaveLength(1);

    // 3. Verify user achievements
    const userAchievements = await userAchievementService.getUserAchievements({
      userId: 'user123',
      page: 1,
      limit: 10
    });

    expect(userAchievements.achievements).toHaveLength(1);
    expect(userAchievements.summary.totalUnlocked).toBe(1);
    expect(userAchievements.summary.totalPoints).toBe(10);

    // 4. Showcase achievement
    const showcaseResult = await userAchievementService.showcaseAchievements({
      userId: 'user123',
      achievementIds: [achievement.id],
      maxShowcased: 5
    });

    expect(showcaseResult.showcased).toContain(achievement.id);

    // 5. Verify showcased
    const showcased = await userAchievementService.getShowcasedAchievements('user123');
    expect(showcased).toHaveLength(1);
    expect(showcased[0].achievementId).toBe(achievement.id);
  });

  it('should handle progressive achievements correctly', async () => {
    // Create progressive achievement (Bronze → Silver → Gold)
    const bronzeAch = await achievementService.createAchievement({
      name: 'Content Creator - Bronze',
      description: 'Create 10 posts',
      icon: 'bronze.png',
      category: 'mastery',
      rarity: 'common',
      points: 25,
      criteria: {
        type: 'count',
        target: 10,
        metric: 'posts.created'
      },
      rewards: [],
      isActive: true
    });

    const silverAch = await achievementService.createAchievement({
      name: 'Content Creator - Silver',
      description: 'Create 50 posts',
      icon: 'silver.png',
      category: 'mastery',
      rarity: 'rare',
      points: 100,
      criteria: {
        type: 'count',
        target: 50,
        metric: 'posts.created'
      },
      rewards: [],
      prerequisites: [bronzeAch.id],
      isActive: true
    });

    // Progress to bronze unlock
    await unlockService.updateProgress({
      userId: 'user456',
      metric: 'posts.created',
      value: 10,
      increment: false
    });

    // Verify bronze unlocked
    let userAchs = await userAchievementService.getUserAchievements({
      userId: 'user456',
      status: 'unlocked',
      page: 1,
      limit: 10
    });

    expect(userAchs.achievements.some(a => a.achievementId === bronzeAch.id)).toBe(true);

    // Progress to silver unlock
    await unlockService.updateProgress({
      userId: 'user456',
      metric: 'posts.created',
      value: 50,
      increment: false
    });

    // Verify silver unlocked
    userAchs = await userAchievementService.getUserAchievements({
      userId: 'user456',
      status: 'unlocked',
      page: 1,
      limit: 10
    });

    expect(userAchs.achievements).toHaveLength(2);
    expect(userAchs.summary.totalPoints).toBe(125);
  });
});
```

### E2E Test Flow Examples

```typescript
// test/e2e/achievement.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { AppModule } from '../../src/app.module';

describe('Achievement API E2E Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let achievementId: string;
  const userId = 'testuser123';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGO_URI = mongoServer.getUri();
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('POST /api/v1/achievements', () => {
    it('should create a new achievement', () => {
      return request(app.getHttpServer())
        .post('/api/v1/achievements')
        .send({
          body: {
            name: 'E2E Test Achievement',
            description: 'Test achievement for E2E',
            icon: 'https://example.com/icon.png',
            category: 'milestone',
            rarity: 'common',
            points: 10,
            criteria: {
              type: 'count',
              target: 5,
              metric: 'test.action'
            },
            rewards: [
              { type: 'currency', currencyId: 'xp', amount: 100 }
            ],
            isActive: true
          },
          reqMeta: {
            reqId: 'test-req-1',
            service: 'e2e-test'
          },
          client: {
            ip: '127.0.0.1'
          }
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.achievement).toBeDefined();
          expect(res.body.data.achievement.name).toBe('E2E Test Achievement');
          achievementId = res.body.data.achievement.id;
        });
    });
  });

  describe('POST /api/v1/achievements/progress', () => {
    it('should update progress and unlock achievement', async () => {
      // First progress update
      await request(app.getHttpServer())
        .post('/api/v1/achievements/progress')
        .send({
          body: {
            userId,
            metric: 'test.action',
            value: 3,
            increment: true
          },
          reqMeta: {
            reqId: 'test-req-2',
            service: 'e2e-test'
          },
          client: {
            ip: '127.0.0.1'
          }
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.updated).toBeDefined();
          expect(res.body.data.unlocked).toHaveLength(0);
        });

      // Second progress update (should unlock)
      return request(app.getHttpServer())
        .post('/api/v1/achievements/progress')
        .send({
          body: {
            userId,
            metric: 'test.action',
            value: 2,
            increment: true
          },
          reqMeta: {
            reqId: 'test-req-3',
            service: 'e2e-test'
          },
          client: {
            ip: '127.0.0.1'
          }
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.unlocked).toHaveLength(1);
          expect(res.body.data.rewards).toHaveLength(1);
        });
    });
  });

  describe('GET /api/v1/achievements/users/:userId', () => {
    it('should return user achievements with stats', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/achievements/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.achievements).toBeDefined();
          expect(res.body.data.summary.totalUnlocked).toBe(1);
          expect(res.body.data.summary.totalPoints).toBe(10);
        });
    });
  });

  describe('POST /api/v1/achievements/users/:userId/showcase', () => {
    it('should showcase achievement', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/achievements/users/${userId}/showcase`)
        .send({
          body: {
            achievementIds: [achievementId],
            maxShowcased: 5
          },
          reqMeta: {
            reqId: 'test-req-4',
            service: 'e2e-test'
          },
          client: {
            ip: '127.0.0.1'
          }
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.showcased).toContain(achievementId);
        });
    });
  });
});
```

### Performance Benchmarks

```typescript
// test/performance/achievement-unlock.bench.ts
import { performance } from 'perf_hooks';

describe('Achievement Unlock Performance Benchmarks', () => {
  it('should unlock achievement in < 100ms', async () => {
    const start = performance.now();

    await unlockService.updateProgress({
      userId: 'perf-user',
      metric: 'test.metric',
      value: 10
    });

    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle 1000 concurrent progress updates', async () => {
    const promises = [];

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      promises.push(
        unlockService.updateProgress({
          userId: `user${i}`,
          metric: 'test.metric',
          value: 1
        })
      );
    }

    await Promise.all(promises);

    const end = performance.now();
    const duration = end - start;
    const avgDuration = duration / 1000;

    expect(avgDuration).toBeLessThan(200);
  });

  it('should retrieve user achievements in < 50ms', async () => {
    const start = performance.now();

    await userAchievementService.getUserAchievements({
      userId: 'perf-user',
      page: 1,
      limit: 20
    });

    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(50);
  });
});
```

---

## Integration Patterns

### Integration with Points & Rewards Service

**Event-Driven Communication**:

```typescript
// Achievement Service publishes unlock events
// Points & Rewards Service subscribes to award points

// In Achievement Service
class AchievementUnlockService {
  private async emitUnlockEvent(userId: string, achievement: any) {
    await this.redis.publish(
      'achievement.unlocked',
      JSON.stringify({
        userId,
        achievementId: achievement.id,
        points: achievement.points,
        rewards: achievement.rewards,
        timestamp: new Date()
      })
    );
  }
}

// In Points & Rewards Service (subscriber)
class PointsEventSubscriber {
  async onAchievementUnlocked(event: any) {
    const { userId, points, rewards } = event;

    // Award achievement points
    await this.pointsService.awardPoints({
      userId,
      currencyId: 'achievement-points',
      amount: points,
      reason: `Achievement unlocked: ${event.achievementId}`
    });

    // Process rewards
    for (const reward of rewards) {
      if (reward.type === 'currency') {
        await this.pointsService.awardPoints({
          userId,
          currencyId: reward.currencyId,
          amount: reward.amount,
          reason: 'Achievement reward'
        });
      }
    }
  }
}
```

### Webhook Payload Examples

```typescript
// Webhook sent to client application when achievement unlocked
interface AchievementWebhookPayload {
  event: 'achievement.unlocked';
  timestamp: string;
  data: {
    userId: string;
    achievement: {
      id: string;
      name: string;
      description: string;
      category: string;
      rarity: string;
      icon: string;
    };
    unlockedAt: string;
    rewards: Array<{
      type: string;
      currencyId?: string;
      amount?: number;
    }>;
  };
  metadata: {
    appId: string;
    environment: 'production' | 'staging';
  };
}

// Example webhook delivery
POST https://client-app.com/webhooks/gamification
Content-Type: application/json
X-Webhook-Signature: sha256=...

{
  "event": "achievement.unlocked",
  "timestamp": "2025-11-30T12:00:00Z",
  "data": {
    "userId": "user123",
    "achievement": {
      "id": "achievement456",
      "name": "Content Creator - Bronze",
      "description": "Create 10 posts",
      "category": "mastery",
      "rarity": "common",
      "icon": "https://cdn.example.com/bronze.png"
    },
    "unlockedAt": "2025-11-30T12:00:00Z",
    "rewards": [
      {
        "type": "currency",
        "currencyId": "xp",
        "amount": 100
      }
    ]
  },
  "metadata": {
    "appId": "app789",
    "environment": "production"
  }
}
```

### SDK Usage Examples (TypeScript Client)

```typescript
// @gamification-api/sdk-typescript
import { GamificationSDK } from '@gamification-api/sdk';

const sdk = new GamificationSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.gamification.com',
  appId: 'your-app-id'
});

// Track user action and trigger achievement check
async function onUserCreatedPost(userId: string, postId: string) {
  try {
    const result = await sdk.achievements.updateProgress({
      userId,
      metric: 'posts.created',
      value: 1,
      increment: true,
      metadata: { postId }
    });

    // Check if achievements unlocked
    if (result.unlocked.length > 0) {
      for (const achievement of result.unlocked) {
        console.log(`Achievement unlocked: ${achievement.achievementId}`);

        // Show notification to user
        await showAchievementNotification(userId, achievement);
      }
    }

    // Process rewards
    if (result.rewards.length > 0) {
      await processRewards(userId, result.rewards);
    }

  } catch (error) {
    console.error('Failed to update achievement progress:', error);
  }
}

// Get user's achievement showcase
async function getUserShowcase(userId: string) {
  const showcased = await sdk.achievements.getShowcased(userId);
  return showcased.data.showcased;
}

// Showcase achievement
async function showcaseAchievement(userId: string, achievementId: string) {
  await sdk.achievements.showcase(userId, {
    achievementIds: [achievementId],
    maxShowcased: 5
  });
}

// Get all user achievements with filters
async function getUserAchievements(userId: string) {
  const achievements = await sdk.achievements.getUserAchievements(userId, {
    status: 'unlocked',
    category: 'mastery',
    page: 1,
    limit: 20
  });

  console.log(`User has unlocked ${achievements.data.summary.totalUnlocked} achievements`);
  console.log(`Total points: ${achievements.data.summary.totalPoints}`);

  return achievements.data.achievements;
}

// Listen to achievement events (WebSocket)
sdk.on('achievement.unlocked', (event) => {
  console.log('Real-time achievement unlock:', event);
  displayAchievementPopup(event.achievement);
});

sdk.on('achievement.progress', (event) => {
  console.log('Progress update:', event);
  updateProgressBar(event.achievementId, event.percentComplete);
});
```

### REST API Integration Example

```typescript
// Direct REST API usage without SDK
import axios from 'axios';

const API_BASE = 'https://api.gamification.com';
const API_KEY = 'your-api-key';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Update progress
async function trackUserAction(userId: string, action: string, value: number) {
  const response = await client.post('/api/v1/achievements/progress', {
    body: {
      userId,
      metric: action,
      value,
      increment: true
    },
    reqMeta: {
      reqId: generateRequestId(),
      service: 'my-app'
    },
    client: {
      ip: getUserIP()
    }
  });

  return response.data;
}

// Get user achievements
async function fetchUserAchievements(userId: string) {
  const response = await client.get(`/api/v1/achievements/users/${userId}`, {
    params: {
      status: 'unlocked',
      page: 1,
      limit: 20
    }
  });

  return response.data;
}
```

---

## Performance & Optimization

### Caching Strategy

```typescript
// Cache Layer Implementation
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class AchievementCacheService {
  private readonly CACHE_TTL = {
    ACHIEVEMENT: 3600,           // 1 hour
    USER_ACHIEVEMENTS: 300,      // 5 minutes
    SHOWCASED: 600,              // 10 minutes
    GLOBAL_STATS: 1800          // 30 minutes
  };

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getAchievement(achievementId: string): Promise<any | null> {
    const cached = await this.redis.get(`achievement:${achievementId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setAchievement(achievement: any): Promise<void> {
    await this.redis.setex(
      `achievement:${achievement.id}`,
      this.CACHE_TTL.ACHIEVEMENT,
      JSON.stringify(achievement)
    );
  }

  async getUserAchievements(userId: string, cacheKey: string): Promise<any | null> {
    const cached = await this.redis.get(`user:achievements:${userId}:${cacheKey}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setUserAchievements(userId: string, cacheKey: string, data: any): Promise<void> {
    await this.redis.setex(
      `user:achievements:${userId}:${cacheKey}`,
      this.CACHE_TTL.USER_ACHIEVEMENTS,
      JSON.stringify(data)
    );
  }

  async invalidateUserCache(userId: string): Promise<void> {
    const keys = await this.redis.keys(`user:achievements:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Database Query Optimization

```typescript
// Optimized queries using indexes
class UserAchievementRepository {
  // Use projection to reduce data transfer
  async findUserAchievementIds(userId: string): Promise<string[]> {
    return await this.userAchievementModel
      .find({ userId, isUnlocked: true })
      .select('achievementId')
      .lean()
      .exec()
      .then(docs => docs.map(d => d.achievementId));
  }

  // Use aggregation for complex queries
  async getUserAchievementStats(userId: string): Promise<any> {
    return await this.userAchievementModel.aggregate([
      { $match: { userId, isUnlocked: true } },
      {
        $lookup: {
          from: 'achievements',
          localField: 'achievementId',
          foreignField: '_id',
          as: 'achievement'
        }
      },
      { $unwind: '$achievement' },
      {
        $group: {
          _id: '$achievement.rarity',
          count: { $sum: 1 },
          totalPoints: { $sum: '$achievement.points' }
        }
      }
    ]).exec();
  }

  // Batch operations for efficiency
  async batchUpdateProgress(updates: Array<{ id: string; progress: number }>): Promise<void> {
    const bulkOps = updates.map(({ id, progress }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { progress, updatedAt: new Date() } }
      }
    }));

    await this.userAchievementModel.bulkWrite(bulkOps);
  }
}
```

### Rate Limiting

```typescript
// Rate limiting configuration
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100
    })
  ]
})
export class AchievementModule {}

// Controller with rate limiting
import { Throttle } from '@nestjs/throttler';

@Controller('api/v1/achievements')
export class AchievementController {
  @Post('progress')
  @Throttle(20, 60) // 20 requests per 60 seconds
  async updateProgress() {
    // ...
  }
}
```

---

## Security & Authorization

### API Key Authentication

```typescript
// guards/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    const validApiKey = this.configService.get<string>('API_KEY');

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}

// Usage in controller
@Controller('api/v1/achievements')
@UseGuards(ApiKeyGuard)
export class AchievementController {
  // All routes protected by API key
}
```

### Input Validation

```typescript
// Validation pipes with custom validators
import { IsString, IsNumber, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AchievementCriteriaDto {
  @IsEnum(['count', 'streak', 'threshold', 'collection', 'time', 'composite'])
  type: string;

  @IsNumber()
  @Min(1)
  @Max(1000000)
  target: number;

  @IsString()
  metric: string;
}

export class CreateAchievementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ValidateNested()
  @Type(() => AchievementCriteriaDto)
  criteria: AchievementCriteriaDto;
}
```

### Data Sanitization

```typescript
// Sanitize user inputs
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';

export class UpdateProgressBodyDto {
  @IsString()
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [] }))
  userId: string;

  @IsString()
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [] }))
  metric: string;
}
```

---

## Error Handling & Recovery

### Graceful Degradation

```typescript
// Service with fallback logic
@Injectable()
export class AchievementService {
  async getAchievements(query: any): Promise<any> {
    try {
      // Try cache first
      const cached = await this.cacheService.getAchievements(query);
      if (cached) return cached;

      // Fallback to database
      const achievements = await this.achievementRepository.findAll(query);
      await this.cacheService.setAchievements(query, achievements);

      return achievements;

    } catch (error) {
      this.logger.error('Failed to get achievements', error);

      // Final fallback: return empty result
      return {
        achievements: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      };
    }
  }
}
```

### Retry Logic

```typescript
// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
await retryWithBackoff(
  () => this.achievementRepository.findById(id),
  3,
  500
);
```

### Circuit Breaker

```typescript
// Simple circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt = Date.now();

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

---

## Monitoring & Observability

### Metrics Collection

```typescript
// Custom metrics using prom-client
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly achievementUnlockCounter = new Counter({
    name: 'achievement_unlocked_total',
    help: 'Total number of achievements unlocked',
    labelNames: ['rarity', 'category'],
    registers: [this.registry]
  });

  private readonly progressUpdateHistogram = new Histogram({
    name: 'achievement_progress_update_duration_ms',
    help: 'Duration of progress update operations',
    buckets: [10, 50, 100, 200, 500, 1000],
    registers: [this.registry]
  });

  recordAchievementUnlock(rarity: string, category: string) {
    this.achievementUnlockCounter.inc({ rarity, category });
  }

  recordProgressUpdate(durationMs: number) {
    this.progressUpdateHistogram.observe(durationMs);
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### Health Checks

```typescript
// Health check endpoint
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      () => this.checkRedis(),
      () => this.checkAchievementService()
    ]);
  }

  private async checkRedis() {
    // Redis health check logic
  }

  private async checkAchievementService() {
    // Service-specific health check
  }
}
```

### Distributed Tracing

```typescript
// OpenTelemetry integration
import { Injectable } from '@nestjs/common';
import { trace, context } from '@opentelemetry/api';

@Injectable()
export class AchievementService {
  async updateProgress(params: any) {
    const tracer = trace.getTracer('achievement-service');

    return tracer.startActiveSpan('updateProgress', async (span) => {
      span.setAttribute('userId', params.userId);
      span.setAttribute('metric', params.metric);

      try {
        const result = await this.unlockService.updateProgress(params);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

---

## Conclusion

This specification provides a complete, production-ready implementation guide for the Achievement Service, including:

- Complete API design with OpenAPI-compatible endpoints
- Robust database schema with optimized indexes
- Full NestJS implementation with best practices
- Comprehensive testing strategies
- Real-world integration patterns
- Performance optimization techniques
- Security and error handling

The service is designed to scale horizontally, handle race conditions with distributed locks, and integrate seamlessly with other gamification microservices through event-driven architecture.
