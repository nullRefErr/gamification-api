# Quest & Missions Service - Implementation Specification
**Comprehensive Task-Based Engagement and Guided Activities System**

> **Version**: 1.0.0
> **Service Type**: Core Engagement Microservice
> **Phase**: Phase 2 - Engagement & Retention
> **Last Updated**: 2025-11-30

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Quest Types & Mechanics](#quest-types--mechanics)
3. [Complete API Specification](#complete-api-specification)
4. [Database Design](#database-design)
5. [NestJS Implementation Architecture](#nestjs-implementation-architecture)
6. [Complete Code Examples](#complete-code-examples)
7. [Testing Specifications](#testing-specifications)
8. [Integration Patterns](#integration-patterns)
9. [Performance & Scalability](#performance--scalability)
10. [Deployment & Monitoring](#deployment--monitoring)

---

## Service Overview

### Purpose
The Quest & Missions Service manages task-based engagement mechanics including daily/weekly quests, multi-step missions, quest chains, and objective tracking. It provides a structured way for applications to guide user behavior through gamified tasks.

### Core Responsibilities
- Quest template creation and management
- Quest instance lifecycle (available → active → completed/failed/expired)
- Multi-objective progress tracking with validation
- Daily/weekly quest rotation using schedulers
- Quest chain progression with dependencies
- Reward integration with Points & Rewards Service
- Achievement integration for quest completion milestones

### Quest Types Supported

#### 1. **Daily Quests**
- Reset every 24 hours at configured time
- Limited slots (e.g., 3 daily quests per user)
- Fast completion, high engagement
- Example: "Complete 5 actions today"

#### 2. **Weekly Quests**
- Reset every 7 days
- Longer completion windows
- Higher rewards than daily quests
- Example: "Earn 1000 XP this week"

#### 3. **Story/Main Quests**
- Linear narrative progression
- Chain dependencies (Quest A → Quest B → Quest C)
- One-time completion
- Example: Tutorial sequences, onboarding flows

#### 4. **Side Quests**
- Optional tasks independent of main progression
- Can be repeatable or one-time
- Example: "Share content 10 times"

#### 5. **Event Quests**
- Time-limited, tied to specific events
- Expires after event ends
- Example: "Holiday special: Complete 3 event challenges"

#### 6. **Repeatable Quests**
- Can be completed multiple times
- May have cooldown periods
- Example: "Refer a friend" (repeatable)

---

## Quest Types & Mechanics

### Quest Structure

```typescript
interface Quest {
  // Identity
  id: string;
  templateId: string; // Reference to quest template

  // Metadata
  name: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;

  // Type & Behavior
  type: QuestType;
  repeatable: boolean;
  cooldownDuration?: number; // seconds between repeats

  // Objectives
  objectives: QuestObjective[];
  requireAllObjectives: boolean; // true = AND, false = OR logic

  // Prerequisites & Dependencies
  prerequisites?: QuestPrerequisite[];
  chain?: QuestChain;

  // Rewards
  rewards: QuestReward[];

  // Time Management
  expiresAt?: Date;
  duration?: number; // seconds to complete after acceptance

  // Availability
  availableFrom?: Date;
  availableUntil?: Date;

  // Metadata
  metadata: Record<string, any>;
  tags: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

enum QuestType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MAIN = 'main',
  SIDE = 'side',
  EVENT = 'event',
  REPEATABLE = 'repeatable',
}

enum QuestCategory {
  TUTORIAL = 'tutorial',
  ENGAGEMENT = 'engagement',
  SOCIAL = 'social',
  COMPETITIVE = 'competitive',
  COLLECTION = 'collection',
  EXPLORATION = 'exploration',
  MASTERY = 'mastery',
}

enum QuestDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}
```

### Objective System

```typescript
interface QuestObjective {
  // Identity
  id: string;
  questId: string;

  // Definition
  description: string;
  type: ObjectiveType;

  // Target & Tracking
  metric: string; // Event name or action identifier
  target: number; // Required count
  currentCount?: number; // For display purposes

  // Behavior
  optional: boolean; // Can skip this objective
  hidden: boolean; // Secret objective revealed on completion

  // Validation
  validationRule?: ObjectiveValidationRule;

  // Order
  order: number; // Display order
}

enum ObjectiveType {
  COUNT = 'count',           // Count occurrences: "Defeat 10 enemies"
  COLLECT = 'collect',       // Collect items: "Gather 5 coins"
  VISIT = 'visit',           // Visit locations: "Explore 3 areas"
  INTERACT = 'interact',     // Interact with entities: "Talk to 2 NPCs"
  THRESHOLD = 'threshold',   // Reach threshold: "Earn 1000 points"
  STREAK = 'streak',         // Consecutive actions: "Login 7 days in a row"
  UNIQUE = 'unique',         // Unique instances: "Complete 5 different challenges"
  TIME_BASED = 'time_based', // Time-based: "Play for 30 minutes"
}

interface ObjectiveValidationRule {
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
  }>;
  customValidator?: string; // Reference to custom validation function
}
```

### User Quest Instance

```typescript
interface UserQuest {
  // Identity
  id: string;
  userId: string;
  questId: string;

  // Status
  status: UserQuestStatus;

  // Progress
  progress: ObjectiveProgress[];
  completionPercentage: number; // 0-100

  // Timeline
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  expiredAt?: Date;
  expiresAt?: Date;

  // Rewards
  rewardsClaimed: boolean;
  rewardsClaimedAt?: Date;

  // Tracking
  attemptNumber: number; // For repeatable quests
  lastAttemptAt?: Date;

  // Metadata
  metadata: Record<string, any>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

enum UserQuestStatus {
  AVAILABLE = 'available',   // Unlocked but not started
  ACTIVE = 'active',         // In progress
  COMPLETED = 'completed',   // All objectives met
  FAILED = 'failed',         // Failed due to conditions
  EXPIRED = 'expired',       // Time limit exceeded
  ABANDONED = 'abandoned',   // User manually abandoned
}

interface ObjectiveProgress {
  objectiveId: string;
  currentCount: number;
  targetCount: number;
  completed: boolean;
  completedAt?: Date;
  metadata?: Record<string, any>;
}
```

### Quest Chain System

```typescript
interface QuestChain {
  chainId: string;
  chainName: string;
  position: number; // Position in chain (1, 2, 3...)
  previousQuestId?: string;
  nextQuestId?: string;
  branchPoints?: QuestBranch[];
}

interface QuestBranch {
  condition: string; // Condition that determines branch
  trueQuestId: string; // Quest if condition is true
  falseQuestId: string; // Quest if condition is false
}

interface QuestPrerequisite {
  type: PrerequisiteType;
  targetId: string;
  metadata?: Record<string, any>;
}

enum PrerequisiteType {
  QUEST_COMPLETED = 'quest_completed',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  LEVEL_REACHED = 'level_reached',
  POINTS_THRESHOLD = 'points_threshold',
  TIME_BASED = 'time_based', // Available after specific date
}
```

### Quest Rewards

```typescript
interface QuestReward {
  id: string;
  type: RewardType;

  // Currency rewards
  currencyId?: string;
  amount?: number;

  // Item rewards
  itemId?: string;
  quantity?: number;

  // Achievement rewards
  achievementId?: string;

  // XP rewards
  experience?: number;

  // Unlock rewards
  unlockType?: string;
  unlockId?: string;

  // Metadata
  metadata?: Record<string, any>;
}

enum RewardType {
  CURRENCY = 'currency',
  EXPERIENCE = 'experience',
  ITEM = 'item',
  ACHIEVEMENT = 'achievement',
  UNLOCK = 'unlock',
  BOOST = 'boost',
}
```

---

## Complete API Specification

### Quest Catalog Endpoints

#### GET /api/quests/catalog
Get available quests catalog with filtering.

**Query Parameters**:
```typescript
interface QuestCatalogQuery {
  type?: QuestType;
  category?: QuestCategory;
  difficulty?: QuestDifficulty;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'difficulty' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}
```

**Response**:
```typescript
interface QuestCatalogResponse {
  quests: Quest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Example**:
```bash
GET /api/quests/catalog?type=daily&difficulty=easy&page=1&limit=10

Response 200:
{
  "quests": [
    {
      "id": "quest_daily_001",
      "name": "Daily Explorer",
      "description": "Complete 5 actions today",
      "type": "daily",
      "difficulty": "easy",
      "objectives": [...],
      "rewards": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

#### GET /api/quests/available/:userId
Get quests available to a specific user (prerequisites met, not expired).

**Response**:
```typescript
interface AvailableQuestsResponse {
  daily: Quest[];
  weekly: Quest[];
  main: Quest[];
  side: Quest[];
  event: Quest[];
}
```

**Example**:
```bash
GET /api/quests/available/user_123

Response 200:
{
  "daily": [
    {
      "id": "quest_daily_20251130_1",
      "name": "Morning Routine",
      "expiresAt": "2025-11-30T23:59:59Z",
      "objectives": [...]
    }
  ],
  "weekly": [...],
  "main": [...],
  "side": [...],
  "event": [...]
}
```

---

#### GET /api/quests/active/:userId
Get all active (in-progress) quests for a user.

**Response**:
```typescript
interface ActiveQuestsResponse {
  active: UserQuest[];
  totalActive: number;
}
```

---

#### GET /api/quests/:questId
Get detailed information about a specific quest.

**Response**: `Quest`

---

### Quest Lifecycle Endpoints

#### POST /api/quests/:questId/accept
Accept and start a quest.

**Request Body**:
```typescript
interface AcceptQuestRequest {
  userId: string;
}
```

**Response**:
```typescript
interface AcceptQuestResponse {
  userQuest: UserQuest;
  message: string;
}
```

**Validation Rules**:
- User must meet all prerequisites
- Quest must not be expired
- User must not have exceeded max active quests
- For repeatable quests, cooldown must have elapsed

**Example**:
```bash
POST /api/quests/quest_daily_001/accept
{
  "userId": "user_123"
}

Response 201:
{
  "userQuest": {
    "id": "user_quest_001",
    "userId": "user_123",
    "questId": "quest_daily_001",
    "status": "active",
    "progress": [
      {
        "objectiveId": "obj_001",
        "currentCount": 0,
        "targetCount": 5,
        "completed": false
      }
    ],
    "acceptedAt": "2025-11-30T10:00:00Z",
    "expiresAt": "2025-11-30T23:59:59Z"
  },
  "message": "Quest accepted successfully"
}
```

---

#### POST /api/quests/:questId/progress
Update quest progress (called by user actions or events).

**Request Body**:
```typescript
interface UpdateProgressRequest {
  userId: string;
  objectiveId?: string; // Specific objective to update
  metric: string; // Action/event that occurred
  count?: number; // Increment amount (default: 1)
  metadata?: Record<string, any>; // Additional validation data
}
```

**Response**:
```typescript
interface UpdateProgressResponse {
  userQuest: UserQuest;
  objectivesCompleted: string[]; // IDs of newly completed objectives
  questCompleted: boolean;
  rewards?: QuestReward[]; // If auto-claim enabled
  message: string;
}
```

**Example**:
```bash
POST /api/quests/quest_daily_001/progress
{
  "userId": "user_123",
  "metric": "action.completed",
  "count": 1,
  "metadata": {
    "actionType": "post_created"
  }
}

Response 200:
{
  "userQuest": {
    "id": "user_quest_001",
    "status": "active",
    "progress": [
      {
        "objectiveId": "obj_001",
        "currentCount": 1,
        "targetCount": 5,
        "completed": false
      }
    ],
    "completionPercentage": 20
  },
  "objectivesCompleted": [],
  "questCompleted": false,
  "message": "Progress updated"
}
```

---

#### POST /api/quests/:questId/complete
Mark quest as complete and claim rewards.

**Request Body**:
```typescript
interface CompleteQuestRequest {
  userId: string;
  claimRewards?: boolean; // Default: true
}
```

**Response**:
```typescript
interface CompleteQuestResponse {
  userQuest: UserQuest;
  rewards: QuestReward[];
  nextQuestInChain?: Quest;
  achievementsUnlocked?: string[];
  message: string;
}
```

**Example**:
```bash
POST /api/quests/quest_daily_001/complete
{
  "userId": "user_123",
  "claimRewards": true
}

Response 200:
{
  "userQuest": {
    "id": "user_quest_001",
    "status": "completed",
    "completedAt": "2025-11-30T15:30:00Z",
    "rewardsClaimed": true
  },
  "rewards": [
    {
      "type": "currency",
      "currencyId": "xp",
      "amount": 100
    },
    {
      "type": "currency",
      "currencyId": "coins",
      "amount": 50
    }
  ],
  "achievementsUnlocked": ["achievement_daily_master"],
  "message": "Quest completed! Rewards claimed."
}
```

---

#### POST /api/quests/:questId/abandon
Abandon an active quest.

**Request Body**:
```typescript
interface AbandonQuestRequest {
  userId: string;
  reason?: string;
}
```

**Response**:
```typescript
interface AbandonQuestResponse {
  userQuest: UserQuest;
  message: string;
}
```

---

#### POST /api/quests/:questId/claim-rewards
Claim rewards for a completed quest (if not auto-claimed).

**Request Body**:
```typescript
interface ClaimRewardsRequest {
  userId: string;
}
```

**Response**:
```typescript
interface ClaimRewardsResponse {
  rewards: QuestReward[];
  message: string;
}
```

---

### Quest Rotation & Daily System

#### GET /api/quests/daily
Get today's daily quests (for all users).

**Response**:
```typescript
interface DailyQuestsResponse {
  date: string; // YYYY-MM-DD
  quests: Quest[];
  expiresAt: Date;
}
```

---

#### GET /api/quests/weekly
Get this week's weekly quests.

**Response**:
```typescript
interface WeeklyQuestsResponse {
  weekNumber: number;
  year: number;
  quests: Quest[];
  expiresAt: Date;
}
```

---

#### GET /api/quests/:userId/history
Get user's quest completion history.

**Query Parameters**:
```typescript
interface QuestHistoryQuery {
  status?: UserQuestStatus;
  type?: QuestType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

**Response**:
```typescript
interface QuestHistoryResponse {
  history: UserQuest[];
  statistics: {
    totalCompleted: number;
    totalFailed: number;
    totalAbandoned: number;
    completionRate: number; // percentage
    averageCompletionTime: number; // seconds
  };
  pagination: PaginationMeta;
}
```

---

#### GET /api/quests/:userId/statistics
Get user's quest statistics and achievements.

**Response**:
```typescript
interface QuestStatisticsResponse {
  totalAccepted: number;
  totalCompleted: number;
  totalFailed: number;
  completionRate: number;
  currentStreak: number; // Daily quest streak
  longestStreak: number;
  byType: Record<QuestType, {
    completed: number;
    failed: number;
    completionRate: number;
  }>;
  byDifficulty: Record<QuestDifficulty, {
    completed: number;
    averageTime: number;
  }>;
}
```

---

### Admin Endpoints

#### POST /api/quests/admin/create
Create a new quest template (admin only).

**Request Body**: `Quest`

**Response**: Created `Quest`

---

#### PATCH /api/quests/admin/:questId
Update quest template (admin only).

**Request Body**: Partial `Quest`

**Response**: Updated `Quest`

---

#### DELETE /api/quests/admin/:questId
Delete quest template (admin only).

**Response**: 204 No Content

---

#### POST /api/quests/admin/rotation/daily
Manually trigger daily quest rotation (admin only).

**Response**:
```typescript
interface RotationResponse {
  rotatedAt: Date;
  newQuests: Quest[];
  affectedUsers: number;
}
```

---

## Database Design

### MongoDB Schemas

#### Quest Collection

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'quests', timestamps: true })
export class QuestDocument extends Document {
  @Prop({ required: true, unique: true })
  templateId: string;

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: QuestType, required: true, index: true })
  type: QuestType;

  @Prop({ type: String, enum: QuestCategory, required: true, index: true })
  category: QuestCategory;

  @Prop({ type: String, enum: QuestDifficulty, required: true, index: true })
  difficulty: QuestDifficulty;

  @Prop({ default: false })
  repeatable: boolean;

  @Prop({ type: Number })
  cooldownDuration?: number;

  @Prop({ type: [Object], required: true })
  objectives: QuestObjective[];

  @Prop({ default: true })
  requireAllObjectives: boolean;

  @Prop({ type: [Object], default: [] })
  prerequisites: QuestPrerequisite[];

  @Prop({ type: Object })
  chain?: QuestChain;

  @Prop({ type: [Object], required: true })
  rewards: QuestReward[];

  @Prop({ type: Date, index: true })
  expiresAt?: Date;

  @Prop({ type: Number })
  duration?: number;

  @Prop({ type: Date, index: true })
  availableFrom?: Date;

  @Prop({ type: Date, index: true })
  availableUntil?: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const QuestSchema = SchemaFactory.createForClass(QuestDocument);

// Indexes
QuestSchema.index({ type: 1, isActive: 1 });
QuestSchema.index({ category: 1, difficulty: 1 });
QuestSchema.index({ tags: 1 });
QuestSchema.index({ availableFrom: 1, availableUntil: 1 });
QuestSchema.index({ 'chain.chainId': 1, 'chain.position': 1 });
```

---

#### UserQuest Collection

```typescript
@Schema({ collection: 'user_quests', timestamps: true })
export class UserQuestDocument extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Quest', index: true })
  questId: Types.ObjectId;

  @Prop({ type: String, enum: UserQuestStatus, required: true, index: true })
  status: UserQuestStatus;

  @Prop({ type: [Object], required: true })
  progress: ObjectiveProgress[];

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  completionPercentage: number;

  @Prop({ type: Date, index: true })
  acceptedAt?: Date;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date, index: true })
  completedAt?: Date;

  @Prop({ type: Date })
  failedAt?: Date;

  @Prop({ type: Date })
  expiredAt?: Date;

  @Prop({ type: Date, index: true })
  expiresAt?: Date;

  @Prop({ default: false })
  rewardsClaimed: boolean;

  @Prop({ type: Date })
  rewardsClaimedAt?: Date;

  @Prop({ type: Number, default: 1 })
  attemptNumber: number;

  @Prop({ type: Date })
  lastAttemptAt?: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserQuestSchema = SchemaFactory.createForClass(UserQuestDocument);

// Compound Indexes
UserQuestSchema.index({ userId: 1, status: 1 });
UserQuestSchema.index({ userId: 1, questId: 1 });
UserQuestSchema.index({ userId: 1, completedAt: -1 });
UserQuestSchema.index({ status: 1, expiresAt: 1 });
UserQuestSchema.index({ userId: 1, 'progress.completed': 1 });

// TTL Index for expired quests cleanup
UserQuestSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
```

---

#### QuestRotation Collection (Daily/Weekly Management)

```typescript
@Schema({ collection: 'quest_rotations', timestamps: true })
export class QuestRotationDocument extends Document {
  @Prop({ type: String, enum: ['daily', 'weekly'], required: true, index: true })
  rotationType: 'daily' | 'weekly';

  @Prop({ required: true, index: true })
  periodIdentifier: string; // e.g., "2025-11-30" for daily, "2025-W48" for weekly

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Quest' }], required: true })
  questIds: Types.ObjectId[];

  @Prop({ type: Date, required: true, index: true })
  startDate: Date;

  @Prop({ type: Date, required: true, index: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const QuestRotationSchema = SchemaFactory.createForClass(QuestRotationDocument);

QuestRotationSchema.index({ rotationType: 1, periodIdentifier: 1 }, { unique: true });
QuestRotationSchema.index({ startDate: 1, endDate: 1 });
```

---

#### Quest Statistics Collection (Aggregated Data)

```typescript
@Schema({ collection: 'quest_statistics', timestamps: true })
export class QuestStatisticsDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Quest', required: true, unique: true })
  questId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  totalAcceptances: number;

  @Prop({ type: Number, default: 0 })
  totalCompletions: number;

  @Prop({ type: Number, default: 0 })
  totalFailures: number;

  @Prop({ type: Number, default: 0 })
  totalAbandons: number;

  @Prop({ type: Number, default: 0 })
  completionRate: number; // percentage

  @Prop({ type: Number, default: 0 })
  averageCompletionTime: number; // seconds

  @Prop({ type: Object, default: {} })
  objectiveCompletionRates: Record<string, number>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const QuestStatisticsSchema = SchemaFactory.createForClass(QuestStatisticsDocument);
```

---

### Index Strategy

**Query Optimization Indexes**:
```typescript
// User quest queries
{ userId: 1, status: 1 } // Active quests by user
{ userId: 1, questId: 1 } // Check if user has quest
{ userId: 1, completedAt: -1 } // Quest history

// Quest catalog queries
{ type: 1, isActive: 1 } // Get quests by type
{ category: 1, difficulty: 1 } // Filter by category/difficulty
{ tags: 1 } // Tag-based search

// Time-based queries
{ availableFrom: 1, availableUntil: 1 } // Available quests
{ status: 1, expiresAt: 1 } // Expiration cleanup

// Quest chains
{ 'chain.chainId': 1, 'chain.position': 1 } // Chain progression
```

---

## NestJS Implementation Architecture

### Module Structure

```
quest-missions/
├── src/
│   ├── quest/
│   │   ├── quest.module.ts
│   │   ├── quest.controller.ts
│   │   ├── quest.service.ts
│   │   ├── dto/
│   │   │   ├── create-quest.dto.ts
│   │   │   ├── update-quest.dto.ts
│   │   │   ├── accept-quest.dto.ts
│   │   │   ├── update-progress.dto.ts
│   │   │   └── quest-query.dto.ts
│   │   ├── entities/
│   │   │   ├── quest.entity.ts
│   │   │   ├── user-quest.entity.ts
│   │   │   └── quest-rotation.entity.ts
│   │   ├── interfaces/
│   │   │   ├── quest.interface.ts
│   │   │   ├── objective.interface.ts
│   │   │   └── reward.interface.ts
│   │   └── schemas/
│   │       ├── quest.schema.ts
│   │       ├── user-quest.schema.ts
│   │       └── quest-rotation.schema.ts
│   │
│   ├── quest-factory/
│   │   ├── quest-factory.module.ts
│   │   ├── quest-factory.service.ts
│   │   ├── factories/
│   │   │   ├── daily-quest.factory.ts
│   │   │   ├── weekly-quest.factory.ts
│   │   │   ├── story-quest.factory.ts
│   │   │   └── event-quest.factory.ts
│   │   └── templates/
│   │       └── quest-templates.ts
│   │
│   ├── progress-tracker/
│   │   ├── progress-tracker.module.ts
│   │   ├── progress-tracker.service.ts
│   │   ├── validators/
│   │   │   ├── objective-validator.service.ts
│   │   │   ├── count-validator.ts
│   │   │   ├── streak-validator.ts
│   │   │   └── threshold-validator.ts
│   │   └── progress-calculator.service.ts
│   │
│   ├── quest-chain/
│   │   ├── quest-chain.module.ts
│   │   ├── quest-chain.service.ts
│   │   ├── chain-resolver.service.ts
│   │   └── prerequisite-validator.service.ts
│   │
│   ├── rotation/
│   │   ├── rotation.module.ts
│   │   ├── rotation.service.ts
│   │   ├── schedulers/
│   │   │   ├── daily-rotation.scheduler.ts
│   │   │   └── weekly-rotation.scheduler.ts
│   │   └── rotation-strategy.service.ts
│   │
│   ├── reward/
│   │   ├── reward.module.ts
│   │   ├── reward.service.ts
│   │   └── reward-distributor.service.ts
│   │
│   ├── events/
│   │   ├── quest-events.module.ts
│   │   ├── quest.events.ts
│   │   ├── listeners/
│   │   │   ├── user-action.listener.ts
│   │   │   ├── quest-completed.listener.ts
│   │   │   └── achievement-unlocked.listener.ts
│   │   └── emitters/
│   │       └── quest-event.emitter.ts
│   │
│   ├── statistics/
│   │   ├── statistics.module.ts
│   │   ├── statistics.service.ts
│   │   └── aggregation.service.ts
│   │
│   └── main.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── package.json
```

---

### Core Module Implementation

#### quest.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';

import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { QuestSchema } from './schemas/quest.schema';
import { UserQuestSchema } from './schemas/user-quest.schema';
import { QuestRotationSchema } from './schemas/quest-rotation.schema';
import { QuestStatisticsSchema } from './schemas/quest-statistics.schema';

import { QuestFactoryModule } from '../quest-factory/quest-factory.module';
import { ProgressTrackerModule } from '../progress-tracker/progress-tracker.module';
import { QuestChainModule } from '../quest-chain/quest-chain.module';
import { RotationModule } from '../rotation/rotation.module';
import { RewardModule } from '../reward/reward.module';
import { QuestEventsModule } from '../events/quest-events.module';
import { StatisticsModule } from '../statistics/statistics.module';

import { GlobalMongoModule } from '@gamification-api/modules';
import { GlobalCacheModule } from '@gamification-api/modules';

@Module({
  imports: [
    // Database
    MongooseModule.forFeature([
      { name: 'Quest', schema: QuestSchema },
      { name: 'UserQuest', schema: UserQuestSchema },
      { name: 'QuestRotation', schema: QuestRotationSchema },
      { name: 'QuestStatistics', schema: QuestStatisticsSchema },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Events
    EventEmitterModule.forRoot(),

    // Job Queue
    BullModule.registerQueue({
      name: 'quest-processing',
    }),

    // Internal modules
    QuestFactoryModule,
    ProgressTrackerModule,
    QuestChainModule,
    RotationModule,
    RewardModule,
    QuestEventsModule,
    StatisticsModule,

    // Shared modules
    GlobalMongoModule,
    GlobalCacheModule,
  ],
  controllers: [QuestController],
  providers: [QuestService],
  exports: [QuestService],
})
export class QuestModule {}
```

---

### Quest Factory Pattern

#### quest-factory.service.ts

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { DailyQuestFactory } from './factories/daily-quest.factory';
import { WeeklyQuestFactory } from './factories/weekly-quest.factory';
import { StoryQuestFactory } from './factories/story-quest.factory';
import { EventQuestFactory } from './factories/event-quest.factory';
import { Quest, QuestType } from '../interfaces/quest.interface';

export interface QuestFactoryConfig {
  type: QuestType;
  template?: string;
  difficulty?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class QuestFactoryService {
  private factories: Map<QuestType, any>;

  constructor(
    private readonly dailyFactory: DailyQuestFactory,
    private readonly weeklyFactory: WeeklyQuestFactory,
    private readonly storyFactory: StoryQuestFactory,
    private readonly eventFactory: EventQuestFactory,
  ) {
    this.factories = new Map([
      [QuestType.DAILY, this.dailyFactory],
      [QuestType.WEEKLY, this.weeklyFactory],
      [QuestType.MAIN, this.storyFactory],
      [QuestType.SIDE, this.storyFactory],
      [QuestType.EVENT, this.eventFactory],
    ]);
  }

  async createQuest(config: QuestFactoryConfig): Promise<Quest> {
    const factory = this.factories.get(config.type);

    if (!factory) {
      throw new BadRequestException(`Unknown quest type: ${config.type}`);
    }

    return factory.create(config);
  }

  async createBatch(configs: QuestFactoryConfig[]): Promise<Quest[]> {
    return Promise.all(configs.map(config => this.createQuest(config)));
  }
}
```

---

#### daily-quest.factory.ts

```typescript
import { Injectable } from '@nestjs/common';
import { Quest, QuestType, QuestDifficulty } from '../../interfaces/quest.interface';
import { QuestFactoryConfig } from '../quest-factory.service';
import * as dayjs from 'dayjs';

@Injectable()
export class DailyQuestFactory {
  private templates = {
    engagement: {
      easy: [
        {
          name: 'Daily Explorer',
          description: 'Complete 5 actions today',
          objectives: [
            {
              id: 'obj_1',
              description: 'Complete any 5 actions',
              type: 'count',
              metric: 'user.action.completed',
              target: 5,
              optional: false,
              hidden: false,
              order: 1,
            },
          ],
          rewards: [
            { type: 'currency', currencyId: 'xp', amount: 100 },
            { type: 'currency', currencyId: 'coins', amount: 50 },
          ],
        },
        {
          name: 'Social Butterfly',
          description: 'Interact with 3 other users',
          objectives: [
            {
              id: 'obj_1',
              description: 'Send messages or interact with 3 users',
              type: 'unique',
              metric: 'user.interaction',
              target: 3,
              optional: false,
              hidden: false,
              order: 1,
            },
          ],
          rewards: [
            { type: 'currency', currencyId: 'xp', amount: 120 },
            { type: 'currency', currencyId: 'coins', amount: 60 },
          ],
        },
      ],
      medium: [
        {
          name: 'Content Creator',
          description: 'Create 3 posts and get 10 likes',
          objectives: [
            {
              id: 'obj_1',
              description: 'Create 3 posts',
              type: 'count',
              metric: 'post.created',
              target: 3,
              optional: false,
              hidden: false,
              order: 1,
            },
            {
              id: 'obj_2',
              description: 'Receive 10 likes total',
              type: 'threshold',
              metric: 'like.received',
              target: 10,
              optional: false,
              hidden: false,
              order: 2,
            },
          ],
          rewards: [
            { type: 'currency', currencyId: 'xp', amount: 250 },
            { type: 'currency', currencyId: 'coins', amount: 125 },
          ],
        },
      ],
      hard: [
        {
          name: 'Power User',
          description: 'Complete a challenging set of tasks',
          objectives: [
            {
              id: 'obj_1',
              description: 'Complete 10 different types of actions',
              type: 'unique',
              metric: 'user.action.type',
              target: 10,
              optional: false,
              hidden: false,
              order: 1,
            },
            {
              id: 'obj_2',
              description: 'Earn 500 XP from activities',
              type: 'threshold',
              metric: 'xp.earned',
              target: 500,
              optional: false,
              hidden: false,
              order: 2,
            },
          ],
          rewards: [
            { type: 'currency', currencyId: 'xp', amount: 500 },
            { type: 'currency', currencyId: 'coins', amount: 250 },
            { type: 'boost', boostType: 'xp_multiplier', duration: 3600 },
          ],
        },
      ],
    },
  };

  create(config: QuestFactoryConfig): Quest {
    const difficulty = config.difficulty || QuestDifficulty.EASY;
    const category = config.metadata?.category || 'engagement';

    const templatePool = this.templates[category]?.[difficulty] || this.templates.engagement.easy;
    const template = this.selectRandomTemplate(templatePool);

    const today = dayjs().format('YYYY-MM-DD');
    const expiresAt = dayjs().endOf('day').toDate();

    return {
      id: `quest_daily_${today}_${this.generateId()}`,
      templateId: config.template || `template_daily_${category}_${difficulty}`,
      name: template.name,
      description: template.description,
      type: QuestType.DAILY,
      category: category as any,
      difficulty: difficulty as any,
      repeatable: false,
      objectives: template.objectives,
      requireAllObjectives: true,
      prerequisites: [],
      rewards: template.rewards,
      expiresAt,
      duration: 86400, // 24 hours
      metadata: {
        generatedDate: today,
        ...config.metadata,
      },
      tags: ['daily', category, difficulty],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private selectRandomTemplate(pool: any[]): any {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
```

---

### Progress Tracker Service

#### progress-tracker.service.ts

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { UserQuestDocument } from '../schemas/user-quest.schema';
import { QuestDocument } from '../schemas/quest.schema';
import { ObjectiveValidatorService } from './validators/objective-validator.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { UpdateProgressRequest, UpdateProgressResponse } from '../dto/update-progress.dto';
import { UserQuestStatus } from '../interfaces/quest.interface';

@Injectable()
export class ProgressTrackerService {
  private readonly logger = new Logger(ProgressTrackerService.name);

  constructor(
    @InjectModel('UserQuest') private userQuestModel: Model<UserQuestDocument>,
    @InjectModel('Quest') private questModel: Model<QuestDocument>,
    private readonly objectiveValidator: ObjectiveValidatorService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async updateProgress(
    questId: string,
    request: UpdateProgressRequest,
  ): Promise<UpdateProgressResponse> {
    // Find active user quest
    const userQuest = await this.userQuestModel.findOne({
      questId,
      userId: request.userId,
      status: UserQuestStatus.ACTIVE,
    });

    if (!userQuest) {
      throw new NotFoundException(
        `No active quest found with ID ${questId} for user ${request.userId}`,
      );
    }

    // Check if quest has expired
    if (userQuest.expiresAt && new Date() > userQuest.expiresAt) {
      await this.expireQuest(userQuest);
      throw new BadRequestException('Quest has expired');
    }

    // Get quest template
    const quest = await this.questModel.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Quest template not found: ${questId}`);
    }

    // Track objectives that were just completed
    const objectivesCompleted: string[] = [];

    // Update progress for matching objectives
    for (const objective of quest.objectives) {
      // Check if this objective matches the metric
      if (objective.metric !== request.metric) {
        continue;
      }

      // Find progress for this objective
      const progressIndex = userQuest.progress.findIndex(
        p => p.objectiveId === objective.id,
      );

      if (progressIndex === -1) {
        this.logger.warn(`Progress not found for objective ${objective.id}`);
        continue;
      }

      const currentProgress = userQuest.progress[progressIndex];

      // Skip if already completed
      if (currentProgress.completed) {
        continue;
      }

      // Validate the progress update
      const isValid = await this.objectiveValidator.validate(
        objective,
        request.metadata,
      );

      if (!isValid) {
        this.logger.warn(`Progress validation failed for objective ${objective.id}`);
        continue;
      }

      // Update count
      const increment = request.count || 1;
      currentProgress.currentCount = Math.min(
        currentProgress.currentCount + increment,
        currentProgress.targetCount,
      );

      // Check if objective is now completed
      if (currentProgress.currentCount >= currentProgress.targetCount) {
        currentProgress.completed = true;
        currentProgress.completedAt = new Date();
        objectivesCompleted.push(objective.id);

        // Emit objective completed event
        this.eventEmitter.emit('quest.objective.completed', {
          userId: request.userId,
          questId,
          objectiveId: objective.id,
          timestamp: new Date(),
        });
      }

      userQuest.progress[progressIndex] = currentProgress;
    }

    // Calculate overall completion percentage
    userQuest.completionPercentage = this.progressCalculator.calculatePercentage(
      userQuest.progress,
    );

    // Check if quest is completed
    const questCompleted = this.isQuestCompleted(userQuest, quest);

    if (questCompleted) {
      userQuest.status = UserQuestStatus.COMPLETED;
      userQuest.completedAt = new Date();

      // Emit quest completed event
      this.eventEmitter.emit('quest.completed', {
        userId: request.userId,
        questId,
        completedAt: userQuest.completedAt,
        completionTime: userQuest.completedAt.getTime() - userQuest.acceptedAt.getTime(),
      });

      this.logger.log(`Quest ${questId} completed by user ${request.userId}`);
    }

    // Save updated progress
    await userQuest.save();

    return {
      userQuest: userQuest.toObject(),
      objectivesCompleted,
      questCompleted,
      message: questCompleted
        ? 'Quest completed!'
        : `Progress updated: ${userQuest.completionPercentage}% complete`,
    };
  }

  private isQuestCompleted(userQuest: UserQuestDocument, quest: QuestDocument): boolean {
    if (quest.requireAllObjectives) {
      // All non-optional objectives must be completed
      return userQuest.progress.every(
        p => p.completed || this.isObjectiveOptional(p.objectiveId, quest),
      );
    } else {
      // At least one objective must be completed
      return userQuest.progress.some(p => p.completed);
    }
  }

  private isObjectiveOptional(objectiveId: string, quest: QuestDocument): boolean {
    const objective = quest.objectives.find(o => o.id === objectiveId);
    return objective?.optional || false;
  }

  private async expireQuest(userQuest: UserQuestDocument): Promise<void> {
    userQuest.status = UserQuestStatus.EXPIRED;
    userQuest.expiredAt = new Date();
    await userQuest.save();

    this.eventEmitter.emit('quest.expired', {
      userId: userQuest.userId,
      questId: userQuest.questId,
      expiredAt: userQuest.expiredAt,
    });
  }

  async batchUpdateProgress(
    userId: string,
    metric: string,
    count: number = 1,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Find all active quests for user with objectives matching this metric
    const activeQuests = await this.userQuestModel.find({
      userId,
      status: UserQuestStatus.ACTIVE,
    });

    const updatePromises = activeQuests.map(async userQuest => {
      const quest = await this.questModel.findById(userQuest.questId);
      if (!quest) return;

      // Check if any objectives match this metric
      const hasMatchingObjective = quest.objectives.some(obj => obj.metric === metric);
      if (!hasMatchingObjective) return;

      try {
        await this.updateProgress(userQuest.questId.toString(), {
          userId,
          metric,
          count,
          metadata,
        });
      } catch (error) {
        this.logger.error(
          `Failed to update progress for quest ${userQuest.questId}: ${error.message}`,
        );
      }
    });

    await Promise.all(updatePromises);
  }
}
```

---

### Objective Validator Service

#### objective-validator.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { QuestObjective, ObjectiveType } from '../../interfaces/quest.interface';

@Injectable()
export class ObjectiveValidatorService {
  private readonly logger = new Logger(ObjectiveValidatorService.name);

  async validate(
    objective: QuestObjective,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    // If no validation rules, allow all updates
    if (!objective.validationRule) {
      return true;
    }

    const { conditions, customValidator } = objective.validationRule;

    // Custom validator
    if (customValidator) {
      return this.executeCustomValidator(customValidator, metadata);
    }

    // Condition-based validation
    if (conditions && conditions.length > 0) {
      return this.validateConditions(conditions, metadata);
    }

    return true;
  }

  private validateConditions(
    conditions: any[],
    metadata: Record<string, any> = {},
  ): boolean {
    return conditions.every(condition => {
      const { field, operator, value } = condition;
      const actualValue = this.getNestedValue(metadata, field);

      switch (operator) {
        case 'equals':
          return actualValue === value;
        case 'contains':
          return Array.isArray(actualValue)
            ? actualValue.includes(value)
            : String(actualValue).includes(String(value));
        case 'greaterThan':
          return Number(actualValue) > Number(value);
        case 'lessThan':
          return Number(actualValue) < Number(value);
        default:
          this.logger.warn(`Unknown operator: ${operator}`);
          return false;
      }
    });
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private executeCustomValidator(
    validatorName: string,
    metadata?: Record<string, any>,
  ): boolean {
    // Implement custom validators here
    // This could be extended with a validator registry pattern
    this.logger.warn(`Custom validator not implemented: ${validatorName}`);
    return true;
  }
}
```

---

## Complete Code Examples

### Quest Acceptance with Prerequisites Check

```typescript
// quest.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { QuestDocument } from './schemas/quest.schema';
import { UserQuestDocument } from './schemas/user-quest.schema';
import { PrerequisiteValidatorService } from '../quest-chain/prerequisite-validator.service';
import { AcceptQuestRequest, AcceptQuestResponse } from './dto/accept-quest.dto';
import { UserQuestStatus } from './interfaces/quest.interface';

@Injectable()
export class QuestService {
  private readonly MAX_ACTIVE_QUESTS = 10;

  constructor(
    @InjectModel('Quest') private questModel: Model<QuestDocument>,
    @InjectModel('UserQuest') private userQuestModel: Model<UserQuestDocument>,
    @InjectRedis() private readonly redis: Redis,
    private readonly prerequisiteValidator: PrerequisiteValidatorService,
  ) {}

  async acceptQuest(
    questId: string,
    request: AcceptQuestRequest,
  ): Promise<AcceptQuestResponse> {
    const { userId } = request;

    // 1. Find quest template
    const quest = await this.questModel.findById(questId);
    if (!quest) {
      throw new NotFoundException(`Quest not found: ${questId}`);
    }

    if (!quest.isActive) {
      throw new BadRequestException('Quest is not active');
    }

    // 2. Check if quest is still available
    const now = new Date();
    if (quest.availableFrom && now < quest.availableFrom) {
      throw new BadRequestException('Quest is not yet available');
    }
    if (quest.availableUntil && now > quest.availableUntil) {
      throw new BadRequestException('Quest is no longer available');
    }

    // 3. Check if user already has this quest
    const existingQuest = await this.userQuestModel.findOne({
      userId,
      questId,
      status: { $in: [UserQuestStatus.ACTIVE, UserQuestStatus.COMPLETED] },
    });

    if (existingQuest) {
      if (existingQuest.status === UserQuestStatus.ACTIVE) {
        throw new BadRequestException('You already have this quest active');
      }
      if (existingQuest.status === UserQuestStatus.COMPLETED && !quest.repeatable) {
        throw new BadRequestException('Quest already completed and is not repeatable');
      }
    }

    // 4. Check cooldown for repeatable quests
    if (quest.repeatable && quest.cooldownDuration) {
      const lastAttempt = await this.userQuestModel
        .findOne({ userId, questId })
        .sort({ lastAttemptAt: -1 });

      if (lastAttempt?.lastAttemptAt) {
        const cooldownExpires = new Date(
          lastAttempt.lastAttemptAt.getTime() + quest.cooldownDuration * 1000,
        );
        if (now < cooldownExpires) {
          const remainingSeconds = Math.ceil((cooldownExpires.getTime() - now.getTime()) / 1000);
          throw new BadRequestException(
            `Quest is on cooldown. Try again in ${remainingSeconds} seconds`,
          );
        }
      }
    }

    // 5. Check max active quests limit
    const activeQuestsCount = await this.userQuestModel.countDocuments({
      userId,
      status: UserQuestStatus.ACTIVE,
    });

    if (activeQuestsCount >= this.MAX_ACTIVE_QUESTS) {
      throw new BadRequestException(
        `Maximum active quests limit reached (${this.MAX_ACTIVE_QUESTS})`,
      );
    }

    // 6. Validate prerequisites
    const prerequisitesMet = await this.prerequisiteValidator.validateAll(
      userId,
      quest.prerequisites,
    );

    if (!prerequisitesMet.isValid) {
      throw new BadRequestException(
        `Prerequisites not met: ${prerequisitesMet.failedReasons.join(', ')}`,
      );
    }

    // 7. Create user quest instance
    const expiresAt = quest.expiresAt || (quest.duration
      ? new Date(now.getTime() + quest.duration * 1000)
      : undefined);

    const userQuest = new this.userQuestModel({
      userId,
      questId,
      status: UserQuestStatus.ACTIVE,
      progress: quest.objectives.map(objective => ({
        objectiveId: objective.id,
        currentCount: 0,
        targetCount: objective.target,
        completed: false,
      })),
      completionPercentage: 0,
      acceptedAt: now,
      startedAt: now,
      expiresAt,
      rewardsClaimed: false,
      attemptNumber: (existingQuest?.attemptNumber || 0) + 1,
      lastAttemptAt: now,
      metadata: {},
    });

    await userQuest.save();

    // 8. Cache active quest for fast lookup
    await this.cacheActiveQuest(userId, questId);

    // 9. Emit quest accepted event
    // this.eventEmitter.emit('quest.accepted', {...});

    return {
      userQuest: userQuest.toObject(),
      message: 'Quest accepted successfully',
    };
  }

  private async cacheActiveQuest(userId: string, questId: string): Promise<void> {
    const cacheKey = `user:${userId}:active_quests`;
    await this.redis.sadd(cacheKey, questId);
    await this.redis.expire(cacheKey, 86400); // 24 hour TTL
  }
}
```

---

### Daily Quest Rotation Scheduler

```typescript
// daily-rotation.scheduler.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as dayjs from 'dayjs';

import { QuestDocument } from '../../quest/schemas/quest.schema';
import { QuestRotationDocument } from '../../quest/schemas/quest-rotation.schema';
import { QuestFactoryService } from '../../quest-factory/quest-factory.service';
import { QuestType, QuestDifficulty } from '../../quest/interfaces/quest.interface';

@Injectable()
export class DailyRotationScheduler {
  private readonly logger = new Logger(DailyRotationScheduler.name);
  private readonly DAILY_QUEST_COUNT = 3;
  private readonly DIFFICULTY_DISTRIBUTION = {
    easy: 0.5,
    medium: 0.35,
    hard: 0.15,
  };

  constructor(
    @InjectModel('Quest') private questModel: Model<QuestDocument>,
    @InjectModel('QuestRotation') private rotationModel: Model<QuestRotationDocument>,
    private readonly questFactory: QuestFactoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Run every day at midnight UTC
  @Cron('0 0 * * *', {
    name: 'daily-quest-rotation',
    timeZone: 'UTC',
  })
  async rotateDailyQuests(): Promise<void> {
    this.logger.log('Starting daily quest rotation...');

    try {
      const today = dayjs().format('YYYY-MM-DD');

      // Check if rotation already exists for today
      const existingRotation = await this.rotationModel.findOne({
        rotationType: 'daily',
        periodIdentifier: today,
      });

      if (existingRotation) {
        this.logger.warn(`Rotation already exists for ${today}, skipping...`);
        return;
      }

      // Deactivate yesterday's daily quests
      await this.deactivatePreviousRotation();

      // Generate new daily quests
      const newQuests = await this.generateDailyQuests();

      // Create rotation record
      const rotation = new this.rotationModel({
        rotationType: 'daily',
        periodIdentifier: today,
        questIds: newQuests.map(q => q._id),
        startDate: dayjs().startOf('day').toDate(),
        endDate: dayjs().endOf('day').toDate(),
        isActive: true,
      });

      await rotation.save();

      // Emit rotation completed event
      this.eventEmitter.emit('quest.rotation.completed', {
        rotationType: 'daily',
        date: today,
        questCount: newQuests.length,
        timestamp: new Date(),
      });

      this.logger.log(
        `Daily quest rotation completed: ${newQuests.length} quests generated for ${today}`,
      );
    } catch (error) {
      this.logger.error(`Daily quest rotation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async deactivatePreviousRotation(): Promise<void> {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const previousRotation = await this.rotationModel.findOne({
      rotationType: 'daily',
      periodIdentifier: yesterday,
    });

    if (previousRotation) {
      // Mark rotation as inactive
      previousRotation.isActive = false;
      await previousRotation.save();

      // Deactivate quest templates
      await this.questModel.updateMany(
        { _id: { $in: previousRotation.questIds } },
        { $set: { isActive: false } },
      );

      this.logger.log(`Deactivated ${previousRotation.questIds.length} quests from ${yesterday}`);
    }
  }

  private async generateDailyQuests(): Promise<QuestDocument[]> {
    const quests: QuestDocument[] = [];

    // Calculate difficulty distribution
    const difficultyCount = {
      easy: Math.ceil(this.DAILY_QUEST_COUNT * this.DIFFICULTY_DISTRIBUTION.easy),
      medium: Math.ceil(this.DAILY_QUEST_COUNT * this.DIFFICULTY_DISTRIBUTION.medium),
      hard: Math.ceil(this.DAILY_QUEST_COUNT * this.DIFFICULTY_DISTRIBUTION.hard),
    };

    // Adjust to exact count
    const total = Object.values(difficultyCount).reduce((sum, count) => sum + count, 0);
    if (total > this.DAILY_QUEST_COUNT) {
      difficultyCount.easy--;
    }

    // Generate quests for each difficulty
    for (const [difficulty, count] of Object.entries(difficultyCount)) {
      for (let i = 0; i < count; i++) {
        const questData = await this.questFactory.createQuest({
          type: QuestType.DAILY,
          difficulty: difficulty as QuestDifficulty,
          metadata: {
            category: 'engagement',
            rotationDate: dayjs().format('YYYY-MM-DD'),
          },
        });

        const quest = new this.questModel(questData);
        await quest.save();
        quests.push(quest);
      }
    }

    return quests;
  }

  // Manual trigger endpoint (for testing or admin use)
  async triggerRotationManually(): Promise<{ success: boolean; questCount: number }> {
    await this.rotateDailyQuests();

    const today = dayjs().format('YYYY-MM-DD');
    const rotation = await this.rotationModel.findOne({
      rotationType: 'daily',
      periodIdentifier: today,
    });

    return {
      success: true,
      questCount: rotation?.questIds.length || 0,
    };
  }
}
```

---

### Quest Chain Progression Logic

```typescript
// quest-chain.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { QuestDocument } from '../quest/schemas/quest.schema';
import { UserQuestDocument } from '../quest/schemas/user-quest.schema';
import { UserQuestStatus } from '../quest/interfaces/quest.interface';

export interface ChainProgressResponse {
  currentQuest: QuestDocument;
  nextQuest?: QuestDocument;
  chainProgress: {
    position: number;
    totalQuests: number;
    completionPercentage: number;
  };
  chainCompleted: boolean;
}

@Injectable()
export class QuestChainService {
  private readonly logger = new Logger(QuestChainService.name);

  constructor(
    @InjectModel('Quest') private questModel: Model<QuestDocument>,
    @InjectModel('UserQuest') private userQuestModel: Model<UserQuestDocument>,
  ) {}

  async getChainProgress(userId: string, chainId: string): Promise<ChainProgressResponse> {
    // Get all quests in the chain
    const chainQuests = await this.questModel
      .find({ 'chain.chainId': chainId })
      .sort({ 'chain.position': 1 });

    if (chainQuests.length === 0) {
      throw new BadRequestException(`Quest chain not found: ${chainId}`);
    }

    // Find user's progress in this chain
    const userChainQuests = await this.userQuestModel.find({
      userId,
      questId: { $in: chainQuests.map(q => q._id) },
    });

    // Find current position
    let currentPosition = 1;
    let currentQuest = chainQuests[0];

    for (const quest of chainQuests) {
      const userQuest = userChainQuests.find(
        uq => uq.questId.toString() === quest._id.toString(),
      );

      if (!userQuest || userQuest.status !== UserQuestStatus.COMPLETED) {
        currentQuest = quest;
        break;
      }

      currentPosition = quest.chain.position + 1;
    }

    // Calculate progress
    const completedQuests = userChainQuests.filter(
      uq => uq.status === UserQuestStatus.COMPLETED,
    ).length;

    const completionPercentage = (completedQuests / chainQuests.length) * 100;
    const chainCompleted = completedQuests === chainQuests.length;

    // Get next quest
    const nextQuest = chainQuests.find(q => q.chain.position === currentPosition + 1);

    return {
      currentQuest,
      nextQuest,
      chainProgress: {
        position: currentPosition,
        totalQuests: chainQuests.length,
        completionPercentage,
      },
      chainCompleted,
    };
  }

  async unlockNextInChain(userId: string, completedQuestId: string): Promise<QuestDocument | null> {
    // Find the completed quest
    const completedQuest = await this.questModel.findById(completedQuestId);
    if (!completedQuest || !completedQuest.chain) {
      return null;
    }

    // Check if there's a next quest
    if (!completedQuest.chain.nextQuestId) {
      this.logger.log(`Quest ${completedQuestId} is the last in chain ${completedQuest.chain.chainId}`);
      return null;
    }

    // Get next quest
    const nextQuest = await this.questModel.findById(completedQuest.chain.nextQuestId);
    if (!nextQuest) {
      this.logger.error(`Next quest in chain not found: ${completedQuest.chain.nextQuestId}`);
      return null;
    }

    // Handle branching if present
    if (completedQuest.chain.branchPoints && completedQuest.chain.branchPoints.length > 0) {
      return this.resolveBranch(userId, completedQuest);
    }

    this.logger.log(
      `Unlocked next quest in chain for user ${userId}: ${nextQuest.name}`,
    );

    return nextQuest;
  }

  private async resolveBranch(
    userId: string,
    completedQuest: QuestDocument,
  ): Promise<QuestDocument | null> {
    const branchPoint = completedQuest.chain.branchPoints[0]; // For simplicity, take first branch

    // Evaluate branch condition (this would be more sophisticated in production)
    const conditionMet = await this.evaluateBranchCondition(userId, branchPoint.condition);

    const nextQuestId = conditionMet ? branchPoint.trueQuestId : branchPoint.falseQuestId;

    return this.questModel.findById(nextQuestId);
  }

  private async evaluateBranchCondition(userId: string, condition: string): Promise<boolean> {
    // Implement condition evaluation logic
    // This could check user stats, achievements, quest choices, etc.
    // For now, return a placeholder
    return true;
  }

  async getAvailableChainsForUser(userId: string): Promise<any[]> {
    // Get all unique chain IDs
    const chains = await this.questModel.distinct('chain.chainId', {
      'chain.chainId': { $exists: true },
    });

    const chainProgresses = await Promise.all(
      chains.map(chainId => this.getChainProgress(userId, chainId)),
    );

    return chainProgresses;
  }
}
```

---

## Testing Specifications

### Unit Tests

#### Objective Validation Tests

```typescript
// objective-validator.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ObjectiveValidatorService } from './objective-validator.service';
import { QuestObjective, ObjectiveType } from '../../interfaces/quest.interface';

describe('ObjectiveValidatorService', () => {
  let service: ObjectiveValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObjectiveValidatorService],
    }).compile();

    service = module.get<ObjectiveValidatorService>(ObjectiveValidatorService);
  });

  describe('validate', () => {
    it('should return true when no validation rules are present', async () => {
      const objective: QuestObjective = {
        id: 'obj_1',
        description: 'Test objective',
        type: ObjectiveType.COUNT,
        metric: 'test.action',
        target: 10,
        optional: false,
        hidden: false,
        order: 1,
      };

      const result = await service.validate(objective);
      expect(result).toBe(true);
    });

    it('should validate equals condition correctly', async () => {
      const objective: QuestObjective = {
        id: 'obj_1',
        description: 'Test objective',
        type: ObjectiveType.COUNT,
        metric: 'test.action',
        target: 10,
        optional: false,
        hidden: false,
        order: 1,
        validationRule: {
          conditions: [
            { field: 'actionType', operator: 'equals', value: 'post_created' },
          ],
        },
      };

      const result = await service.validate(objective, { actionType: 'post_created' });
      expect(result).toBe(true);

      const failResult = await service.validate(objective, { actionType: 'comment_created' });
      expect(failResult).toBe(false);
    });

    it('should validate greaterThan condition correctly', async () => {
      const objective: QuestObjective = {
        id: 'obj_1',
        description: 'Test objective',
        type: ObjectiveType.THRESHOLD,
        metric: 'points.earned',
        target: 1000,
        optional: false,
        hidden: false,
        order: 1,
        validationRule: {
          conditions: [
            { field: 'points', operator: 'greaterThan', value: 100 },
          ],
        },
      };

      const result = await service.validate(objective, { points: 150 });
      expect(result).toBe(true);

      const failResult = await service.validate(objective, { points: 50 });
      expect(failResult).toBe(false);
    });

    it('should validate nested field paths', async () => {
      const objective: QuestObjective = {
        id: 'obj_1',
        description: 'Test objective',
        type: ObjectiveType.COUNT,
        metric: 'user.action',
        target: 5,
        optional: false,
        hidden: false,
        order: 1,
        validationRule: {
          conditions: [
            { field: 'user.level', operator: 'greaterThan', value: 5 },
          ],
        },
      };

      const result = await service.validate(objective, { user: { level: 10 } });
      expect(result).toBe(true);

      const failResult = await service.validate(objective, { user: { level: 3 } });
      expect(failResult).toBe(false);
    });
  });
});
```

---

### Integration Tests

#### Quest Service Integration Test

```typescript
// quest.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';

import { QuestService } from './quest.service';
import { QuestSchema } from './schemas/quest.schema';
import { UserQuestSchema } from './schemas/user-quest.schema';
import { PrerequisiteValidatorService } from '../quest-chain/prerequisite-validator.service';

describe('QuestService Integration Tests', () => {
  let service: QuestService;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: 'Quest', schema: QuestSchema },
          { name: 'UserQuest', schema: UserQuestSchema },
        ]),
      ],
      providers: [
        QuestService,
        PrerequisiteValidatorService,
        // Mock Redis
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: {
            sadd: jest.fn(),
            expire: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuestService>(QuestService);
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongoServer.stop();
  });

  describe('acceptQuest', () => {
    it('should successfully accept a quest', async () => {
      // Create a test quest
      const quest = await service['questModel'].create({
        templateId: 'test_quest_001',
        name: 'Test Quest',
        description: 'A test quest',
        type: 'daily',
        category: 'engagement',
        difficulty: 'easy',
        objectives: [
          {
            id: 'obj_1',
            description: 'Complete 5 actions',
            type: 'count',
            metric: 'user.action',
            target: 5,
            optional: false,
            hidden: false,
            order: 1,
          },
        ],
        requireAllObjectives: true,
        prerequisites: [],
        rewards: [
          { type: 'currency', currencyId: 'xp', amount: 100 },
        ],
        isActive: true,
      });

      const result = await service.acceptQuest(quest._id.toString(), {
        userId: 'user_123',
      });

      expect(result.userQuest).toBeDefined();
      expect(result.userQuest.userId).toBe('user_123');
      expect(result.userQuest.status).toBe('active');
      expect(result.userQuest.progress).toHaveLength(1);
      expect(result.userQuest.progress[0].currentCount).toBe(0);
      expect(result.message).toBe('Quest accepted successfully');
    });

    it('should prevent accepting same quest twice', async () => {
      const quest = await service['questModel'].create({
        templateId: 'test_quest_002',
        name: 'Non-repeatable Quest',
        type: 'main',
        category: 'tutorial',
        difficulty: 'easy',
        repeatable: false,
        objectives: [],
        rewards: [],
        isActive: true,
      });

      // Accept once
      await service.acceptQuest(quest._id.toString(), { userId: 'user_123' });

      // Try to accept again
      await expect(
        service.acceptQuest(quest._id.toString(), { userId: 'user_123' }),
      ).rejects.toThrow('You already have this quest active');
    });
  });
});
```

---

### E2E Tests

#### Complete Quest Lifecycle E2E Test

```typescript
// quest.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Quest Lifecycle (e2e)', () => {
  let app: INestApplication;
  let questId: string;
  let userId: string = 'test_user_123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Should create a daily quest (admin)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/quests/admin/create')
      .send({
        templateId: 'e2e_test_quest',
        name: 'E2E Test Quest',
        description: 'Complete test objectives',
        type: 'daily',
        category: 'engagement',
        difficulty: 'easy',
        objectives: [
          {
            id: 'obj_1',
            description: 'Complete 3 test actions',
            type: 'count',
            metric: 'test.action',
            target: 3,
            optional: false,
            hidden: false,
            order: 1,
          },
        ],
        requireAllObjectives: true,
        rewards: [
          { type: 'currency', currencyId: 'xp', amount: 150 },
        ],
        isActive: true,
      })
      .expect(201);

    questId = response.body.id;
    expect(questId).toBeDefined();
  });

  it('2. Should get available quests for user', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/quests/available/${userId}`)
      .expect(200);

    expect(response.body.daily).toBeDefined();
    expect(Array.isArray(response.body.daily)).toBe(true);
  });

  it('3. Should accept the quest', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/quests/${questId}/accept`)
      .send({ userId })
      .expect(201);

    expect(response.body.userQuest.status).toBe('active');
    expect(response.body.userQuest.progress[0].currentCount).toBe(0);
  });

  it('4. Should update quest progress (1/3)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/quests/${questId}/progress`)
      .send({
        userId,
        metric: 'test.action',
        count: 1,
      })
      .expect(200);

    expect(response.body.userQuest.progress[0].currentCount).toBe(1);
    expect(response.body.questCompleted).toBe(false);
  });

  it('5. Should update quest progress (2/3)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/quests/${questId}/progress`)
      .send({
        userId,
        metric: 'test.action',
        count: 1,
      })
      .expect(200);

    expect(response.body.userQuest.progress[0].currentCount).toBe(2);
    expect(response.body.questCompleted).toBe(false);
  });

  it('6. Should complete quest (3/3)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/quests/${questId}/progress`)
      .send({
        userId,
        metric: 'test.action',
        count: 1,
      })
      .expect(200);

    expect(response.body.userQuest.progress[0].currentCount).toBe(3);
    expect(response.body.userQuest.progress[0].completed).toBe(true);
    expect(response.body.questCompleted).toBe(true);
  });

  it('7. Should claim rewards', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/quests/${questId}/claim-rewards`)
      .send({ userId })
      .expect(200);

    expect(response.body.rewards).toBeDefined();
    expect(response.body.rewards).toHaveLength(1);
    expect(response.body.rewards[0].currencyId).toBe('xp');
    expect(response.body.rewards[0].amount).toBe(150);
  });

  it('8. Should show quest in user history', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/quests/${userId}/history`)
      .expect(200);

    expect(response.body.history).toBeDefined();
    expect(response.body.history.length).toBeGreaterThan(0);

    const completedQuest = response.body.history.find(
      q => q.questId === questId,
    );
    expect(completedQuest.status).toBe('completed');
  });
});
```

---

### Scheduler Tests

#### Daily Rotation Scheduler Test

```typescript
// daily-rotation.scheduler.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { DailyRotationScheduler } from './daily-rotation.scheduler';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestFactoryService } from '../quest-factory/quest-factory.service';

describe('DailyRotationScheduler', () => {
  let scheduler: DailyRotationScheduler;
  let questModel: any;
  let rotationModel: any;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyRotationScheduler,
        {
          provide: getModelToken('Quest'),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            updateMany: jest.fn(),
          },
        },
        {
          provide: getModelToken('QuestRotation'),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: QuestFactoryService,
          useValue: {
            createQuest: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get<DailyRotationScheduler>(DailyRotationScheduler);
    questModel = module.get(getModelToken('Quest'));
    rotationModel = module.get(getModelToken('QuestRotation'));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('rotateDailyQuests', () => {
    it('should create new daily quests rotation', async () => {
      rotationModel.findOne.mockResolvedValue(null); // No existing rotation
      questModel.create.mockResolvedValue({ _id: 'quest_123' });

      await scheduler.rotateDailyQuests();

      expect(questModel.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'quest.rotation.completed',
        expect.objectContaining({
          rotationType: 'daily',
        }),
      );
    });

    it('should skip rotation if already exists for today', async () => {
      rotationModel.findOne.mockResolvedValue({ _id: 'existing_rotation' });

      await scheduler.rotateDailyQuests();

      expect(questModel.create).not.toHaveBeenCalled();
    });
  });
});
```

---

## Integration Patterns

### Event-Driven Integration

#### Listening to User Actions

```typescript
// user-action.listener.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProgressTrackerService } from '../../progress-tracker/progress-tracker.service';

export interface UserActionEvent {
  userId: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class UserActionListener {
  private readonly logger = new Logger(UserActionListener.name);

  constructor(
    private readonly progressTracker: ProgressTrackerService,
  ) {}

  @OnEvent('user.action.completed')
  async handleUserAction(event: UserActionEvent): Promise<void> {
    this.logger.debug(`Processing user action: ${event.action} for user ${event.userId}`);

    try {
      // Update progress for all active quests that track this action
      await this.progressTracker.batchUpdateProgress(
        event.userId,
        event.action,
        1,
        event.metadata,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update quest progress for action ${event.action}: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('post.created')
  async handlePostCreated(event: { userId: string; postId: string }): Promise<void> {
    await this.progressTracker.batchUpdateProgress(
      event.userId,
      'post.created',
      1,
      { postId: event.postId },
    );
  }

  @OnEvent('comment.created')
  async handleCommentCreated(event: { userId: string; commentId: string }): Promise<void> {
    await this.progressTracker.batchUpdateProgress(
      event.userId,
      'comment.created',
      1,
      { commentId: event.commentId },
    );
  }

  @OnEvent('like.received')
  async handleLikeReceived(event: { userId: string; likeCount: number }): Promise<void> {
    await this.progressTracker.batchUpdateProgress(
      event.userId,
      'like.received',
      event.likeCount,
    );
  }
}
```

---

#### Triggering Point Awards on Completion

```typescript
// quest-completed.listener.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface QuestCompletedEvent {
  userId: string;
  questId: string;
  completedAt: Date;
  completionTime: number; // milliseconds
}

@Injectable()
export class QuestCompletedListener {
  private readonly logger = new Logger(QuestCompletedListener.name);
  private readonly pointsServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.pointsServiceUrl = this.configService.get<string>('services.points.url');
  }

  @OnEvent('quest.completed')
  async handleQuestCompleted(event: QuestCompletedEvent): Promise<void> {
    this.logger.log(`Quest completed: ${event.questId} by user ${event.userId}`);

    try {
      // Award points via Points & Rewards Service
      await this.awardQuestPoints(event);

      // Check for achievements
      await this.checkQuestAchievements(event);

      // Update statistics
      await this.updateStatistics(event);

      // Send notification
      await this.sendCompletionNotification(event);
    } catch (error) {
      this.logger.error(
        `Failed to process quest completion: ${error.message}`,
        error.stack,
      );
    }
  }

  private async awardQuestPoints(event: QuestCompletedEvent): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pointsServiceUrl}/api/wallets/${event.userId}/earn`, {
          currencyId: 'xp',
          amount: 100, // This should come from quest rewards
          reason: `Quest completed: ${event.questId}`,
          metadata: {
            questId: event.questId,
            completionTime: event.completionTime,
          },
        }),
      );

      this.logger.log(`Awarded points to user ${event.userId}: ${JSON.stringify(response.data)}`);
    } catch (error) {
      this.logger.error(`Failed to award points: ${error.message}`);
      throw error;
    }
  }

  private async checkQuestAchievements(event: QuestCompletedEvent): Promise<void> {
    // Call Achievement Service to check for unlocks
    // Example: "Complete 10 quests" achievement
    const achievementServiceUrl = this.configService.get<string>('services.achievements.url');

    try {
      await firstValueFrom(
        this.httpService.post(
          `${achievementServiceUrl}/api/achievements/check`,
          {
            userId: event.userId,
            trigger: 'quest.completed',
            metadata: {
              questId: event.questId,
            },
          },
        ),
      );
    } catch (error) {
      this.logger.warn(`Achievement check failed: ${error.message}`);
    }
  }

  private async updateStatistics(event: QuestCompletedEvent): Promise<void> {
    // Update quest completion statistics
    // This could be handled by the statistics service
  }

  private async sendCompletionNotification(event: QuestCompletedEvent): Promise<void> {
    const notificationServiceUrl = this.configService.get<string>('services.notifications.url');

    try {
      await firstValueFrom(
        this.httpService.post(
          `${notificationServiceUrl}/api/notifications/send`,
          {
            userId: event.userId,
            type: 'quest_completed',
            title: 'Quest Completed!',
            message: 'Congratulations! You completed a quest.',
            channels: ['in_app', 'push'],
            priority: 'medium',
          },
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to send notification: ${error.message}`);
    }
  }
}
```

---

### SDK Quest Tracking Helpers

```typescript
// SDK Example: @gamification-engine/sdk

export class QuestManager {
  constructor(private readonly apiClient: ApiClient) {}

  /**
   * Get available quests for a user
   */
  async getAvailableQuests(userId: string): Promise<AvailableQuestsResponse> {
    return this.apiClient.get(`/api/quests/available/${userId}`);
  }

  /**
   * Accept a quest
   */
  async acceptQuest(questId: string, userId: string): Promise<AcceptQuestResponse> {
    return this.apiClient.post(`/api/quests/${questId}/accept`, { userId });
  }

  /**
   * Track user action and update quest progress automatically
   */
  async trackAction(
    userId: string,
    action: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // This internally calls the event bus
    return this.apiClient.post('/api/events/track', {
      userId,
      eventType: action,
      eventData: metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Get active quests with current progress
   */
  async getActiveQuests(userId: string): Promise<ActiveQuestsResponse> {
    return this.apiClient.get(`/api/quests/active/${userId}`);
  }

  /**
   * Get quest chain progress
   */
  async getChainProgress(
    userId: string,
    chainId: string,
  ): Promise<ChainProgressResponse> {
    return this.apiClient.get(`/api/quests/chains/${chainId}/progress/${userId}`);
  }

  /**
   * Abandon a quest
   */
  async abandonQuest(questId: string, userId: string, reason?: string): Promise<void> {
    return this.apiClient.post(`/api/quests/${questId}/abandon`, {
      userId,
      reason,
    });
  }

  /**
   * Get user quest statistics
   */
  async getStatistics(userId: string): Promise<QuestStatisticsResponse> {
    return this.apiClient.get(`/api/quests/${userId}/statistics`);
  }
}

// Usage Example
const sdk = new GamificationSDK({ apiKey: 'xxx', tenantId: 'yyy' });

// User creates a post
await sdk.events.track({
  userId: 'user_123',
  action: 'post.created',
  metadata: { postId: 'post_456' },
});

// Automatically updates all active quests tracking 'post.created'

// Check active quests
const activeQuests = await sdk.quests.getActiveQuests('user_123');
console.log(`User has ${activeQuests.totalActive} active quests`);
```

---

## Performance & Scalability

### Caching Strategy

```typescript
// quest-cache.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class QuestCacheService {
  private readonly logger = new Logger(QuestCacheService.name);
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Cache active quests for a user
   */
  async cacheActiveQuests(userId: string, quests: any[]): Promise<void> {
    const key = `user:${userId}:active_quests`;
    await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(quests));
  }

  /**
   * Get cached active quests
   */
  async getCachedActiveQuests(userId: string): Promise<any[] | null> {
    const key = `user:${userId}:active_quests`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Invalidate user quest cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}:active_quests`,
      `user:${userId}:quest_progress:*`,
      `user:${userId}:statistics`,
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  /**
   * Cache daily quest rotation
   */
  async cacheDailyRotation(date: string, questIds: string[]): Promise<void> {
    const key = `rotation:daily:${date}`;
    await this.redis.setex(key, 86400, JSON.stringify(questIds)); // 24 hour TTL
  }

  /**
   * Get cached daily rotation
   */
  async getCachedDailyRotation(date: string): Promise<string[] | null> {
    const key = `rotation:daily:${date}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}
```

---

### Database Query Optimization

```typescript
// Optimized queries with proper indexing

// 1. Get active quests for user (uses compound index: userId + status)
const activeQuests = await this.userQuestModel
  .find({ userId, status: UserQuestStatus.ACTIVE })
  .select('questId progress completionPercentage expiresAt')
  .lean();

// 2. Get quest catalog with pagination (uses indexes: type, category, difficulty)
const quests = await this.questModel
  .find({
    type: QuestType.DAILY,
    isActive: true,
    availableFrom: { $lte: new Date() },
    availableUntil: { $gte: new Date() },
  })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();

// 3. Quest chain lookup (uses index: chain.chainId + chain.position)
const chainQuests = await this.questModel
  .find({ 'chain.chainId': chainId })
  .sort({ 'chain.position': 1 })
  .lean();

// 4. User quest history with date range (uses index: userId + completedAt)
const history = await this.userQuestModel
  .find({
    userId,
    completedAt: { $gte: startDate, $lte: endDate },
  })
  .sort({ completedAt: -1 })
  .limit(100)
  .lean();
```

---

### Load Distribution

```typescript
// Use job queues for heavy operations

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QuestService {
  constructor(
    @InjectQueue('quest-processing') private questQueue: Queue,
  ) {}

  async processQuestCompletion(questId: string, userId: string): Promise<void> {
    // Add to queue instead of processing synchronously
    await this.questQueue.add('complete-quest', {
      questId,
      userId,
      timestamp: new Date(),
    });
  }

  async batchRotateQuests(): Promise<void> {
    // Process rotation in background job
    await this.questQueue.add('rotate-daily-quests', {
      date: new Date().toISOString(),
    });
  }
}

// Processor
@Processor('quest-processing')
export class QuestProcessor {
  @Process('complete-quest')
  async handleQuestCompletion(job: Job): Promise<void> {
    const { questId, userId } = job.data;
    // Process completion, award rewards, update stats
  }

  @Process('rotate-daily-quests')
  async handleDailyRotation(job: Job): Promise<void> {
    // Generate new daily quests
  }
}
```

---

## Deployment & Monitoring

### Health Checks

```typescript
// health.controller.ts

import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('mongodb'),
      () => this.checkActiveQuests(),
      () => this.checkRotationStatus(),
    ]);
  }

  private async checkActiveQuests() {
    // Check if quest system is functioning
    const count = await this.userQuestModel.countDocuments({
      status: 'active',
    });

    return {
      activeQuests: {
        status: count >= 0 ? 'up' : 'down',
        count,
      },
    };
  }

  private async checkRotationStatus() {
    // Check if today's rotation exists
    const today = dayjs().format('YYYY-MM-DD');
    const rotation = await this.rotationModel.findOne({
      rotationType: 'daily',
      periodIdentifier: today,
    });

    return {
      dailyRotation: {
        status: rotation ? 'up' : 'down',
        date: today,
      },
    };
  }
}
```

---

### Metrics & Monitoring

```typescript
// Prometheus metrics

import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class QuestMetricsService {
  private readonly questAcceptedCounter: Counter;
  private readonly questCompletedCounter: Counter;
  private readonly questFailedCounter: Counter;
  private readonly progressUpdateHistogram: Histogram;
  private readonly activeQuestsGauge: Gauge;

  constructor() {
    this.questAcceptedCounter = new Counter({
      name: 'quest_accepted_total',
      help: 'Total number of quests accepted',
      labelNames: ['quest_type', 'difficulty'],
    });

    this.questCompletedCounter = new Counter({
      name: 'quest_completed_total',
      help: 'Total number of quests completed',
      labelNames: ['quest_type', 'difficulty'],
    });

    this.questFailedCounter = new Counter({
      name: 'quest_failed_total',
      help: 'Total number of quests failed',
      labelNames: ['quest_type', 'reason'],
    });

    this.progressUpdateHistogram = new Histogram({
      name: 'quest_progress_update_duration_seconds',
      help: 'Quest progress update duration',
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.activeQuestsGauge = new Gauge({
      name: 'quest_active_total',
      help: 'Total number of active quests',
    });
  }

  recordQuestAccepted(type: string, difficulty: string): void {
    this.questAcceptedCounter.inc({ quest_type: type, difficulty });
  }

  recordQuestCompleted(type: string, difficulty: string): void {
    this.questCompletedCounter.inc({ quest_type: type, difficulty });
  }

  recordProgressUpdate(duration: number): void {
    this.progressUpdateHistogram.observe(duration);
  }

  updateActiveQuestsCount(count: number): void {
    this.activeQuestsGauge.set(count);
  }
}
```

---

## Summary

This Quest & Missions Service specification provides:

**Complete Service Design**:
- 6 quest types with different mechanics
- Multi-objective tracking system
- Quest chain progression with branching
- Daily/weekly rotation system

**Production-Ready Implementation**:
- NestJS module architecture
- Factory pattern for quest generation
- Event-driven integration
- Comprehensive validation
- Caching and optimization

**Testing Coverage**:
- Unit tests for validators
- Integration tests for service logic
- E2E tests for complete workflows
- Scheduler tests for rotation

**Integration Support**:
- Event listeners for user actions
- Service-to-service communication
- SDK helpers for client applications
- Webhook support

**Scalability Features**:
- Redis caching strategy
- Job queue processing
- Database query optimization
- Metrics and monitoring

This service integrates seamlessly with the Points & Rewards Service for reward distribution and the Achievement Service for milestone tracking, forming a comprehensive engagement layer in the gamification platform.

**Ready for Phase 2 implementation** as outlined in the roadmap (Weeks 9-11).
