# Gamification Microservices Architecture
**Comprehensive Engine/SDK Design for Multi-Application Gamification**

> **Version**: 1.0.0
> **Status**: Brainstorming & Requirements Discovery
> **Last Updated**: 2025-11-30

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Microservices](#core-microservices)
3. [Service Specifications](#service-specifications)
4. [Cross-Cutting Concerns](#cross-cutting-concerns)
5. [Integration Patterns](#integration-patterns)
6. [Data Models](#data-models)
7. [Technology Stack](#technology-stack)
8. [Deployment Architecture](#deployment-architecture)

---

## Executive Summary

### Vision
A modular, scalable gamification engine delivered as microservices with SDK wrappers, enabling any application to integrate comprehensive game mechanics through simple API calls.

### Architecture Principles
- **Service Independence**: Each microservice owns its domain with clear boundaries
- **Event-Driven**: Services communicate via events for loose coupling
- **Multi-Tenancy**: Single deployment serves multiple client applications
- **Extensibility**: Plugin architecture for custom rules and mechanics
- **Real-Time Capable**: WebSocket support for live updates
- **Analytics-First**: Built-in tracking for behavioral insights

---

## Core Microservices

### 1. **Account Service** ✅ (Existing)
**Purpose**: User identity and profile management

**Responsibilities**:
- User registration and authentication
- Profile CRUD operations
- User metadata and preferences
- Account linking across applications

**Key Endpoints**:
```typescript
POST   /api/users/register
POST   /api/users/login
GET    /api/users/:userId
PATCH  /api/users/:userId
DELETE /api/users/:userId
GET    /api/users/:userId/stats
```

---

### 2. **Leaderboard Service** ✅ (Existing)
**Purpose**: Ranking and competitive positioning

**Responsibilities**:
- Global and scoped leaderboards
- Time-based rankings (daily, weekly, all-time)
- Category-based leaderboards
- Real-time rank updates

**Key Endpoints**:
```typescript
GET    /api/leaderboards/:boardId
GET    /api/leaderboards/:boardId/top/:limit
GET    /api/leaderboards/:boardId/user/:userId/rank
POST   /api/leaderboards/:boardId/scores
GET    /api/leaderboards/search?category=&timeframe=
```

**Extensions Needed**:
- Tournament brackets
- League systems (divisions)
- Clan/team leaderboards

---

### 3. **Achievement Service** 🆕
**Purpose**: Badges, trophies, and milestone tracking

**Responsibilities**:
- Achievement definition and configuration
- Progress tracking (multi-step achievements)
- Achievement unlocking logic
- Rarity and difficulty classification
- Achievement showcase/display

**Key Features**:
- **Simple Achievements**: One-time unlocks (First Login, Welcome Badge)
- **Progressive Achievements**: Multi-level (Bronze → Silver → Gold)
- **Hidden Achievements**: Secret unlocks revealed on completion
- **Time-Limited**: Seasonal or event-based achievements
- **Collection Sets**: Groups of related achievements

**Data Model**:
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'mastery' | 'collection' | 'social' | 'event';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: 'count' | 'streak' | 'threshold' | 'collection' | 'time';
    target: number;
    metric: string;
  };
  rewards: Reward[];
  prerequisites?: string[]; // Achievement IDs
  isHidden: boolean;
  expiresAt?: Date;
}

interface UserAchievement {
  userId: string;
  achievementId: string;
  progress: number;
  unlockedAt?: Date;
  showcased: boolean;
}
```

**Endpoints**:
```typescript
GET    /api/achievements
GET    /api/achievements/:achievementId
POST   /api/achievements/:achievementId/progress
GET    /api/users/:userId/achievements
GET    /api/users/:userId/achievements/showcased
POST   /api/users/:userId/achievements/:achievementId/showcase
```

---

### 4. **Points & Rewards Service** 🆕
**Purpose**: Virtual currency, XP, and reward distribution

**Responsibilities**:
- Multiple currency types (XP, coins, gems, etc.)
- Point earning rules and triggers
- Reward claiming and inventory
- Currency exchange/conversion
- Expiration and decay logic

**Key Features**:
- **Multi-Currency Support**: Different point types per application
- **Earning Rules**: Action → Points mapping
- **Multipliers**: Bonus periods, streak multipliers
- **Decay/Expiration**: Points lose value over time
- **Transaction History**: Full audit trail

**Data Model**:
```typescript
interface Currency {
  id: string;
  name: string;
  symbol: string;
  type: 'experience' | 'soft' | 'hard' | 'premium';
  decayRate?: number; // percentage per period
  exchangeRates?: Map<string, number>;
}

interface UserWallet {
  userId: string;
  balances: Map<string, number>; // currencyId → amount
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  userId: string;
  currencyId: string;
  amount: number;
  type: 'earn' | 'spend' | 'grant' | 'decay' | 'exchange';
  reason: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

interface EarningRule {
  id: string;
  action: string; // 'user.signup', 'post.created', 'challenge.completed'
  currencyId: string;
  baseAmount: number;
  multipliers?: {
    condition: string;
    factor: number;
  }[];
  cooldown?: number; // seconds between applications
}
```

**Endpoints**:
```typescript
GET    /api/wallets/:userId
POST   /api/wallets/:userId/earn
POST   /api/wallets/:userId/spend
POST   /api/wallets/:userId/exchange
GET    /api/wallets/:userId/history
GET    /api/currencies
POST   /api/earning-rules
```

---

### 5. **Level & Progression Service** 🆕
**Purpose**: User leveling, skill trees, and progression paths

**Responsibilities**:
- XP-based leveling systems
- Skill tree progression
- Unlock gates and prerequisites
- Prestige/rebirth mechanics
- Multi-path progression

**Key Features**:
- **Linear Leveling**: Traditional XP → Level progression
- **Skill Trees**: Branch-based unlocks (RPG-style)
- **Prestige Systems**: Reset for permanent bonuses
- **Seasonal Progression**: Battle pass style tracks
- **Mastery Levels**: Beyond max level advancement

**Data Model**:
```typescript
interface LevelSystem {
  id: string;
  name: string;
  maxLevel: number;
  xpCurve: 'linear' | 'exponential' | 'logarithmic' | 'custom';
  xpFormula: string; // e.g., "100 * level^2"
  levelRewards: Map<number, Reward[]>;
}

interface UserLevel {
  userId: string;
  systemId: string;
  currentLevel: number;
  currentXp: number;
  totalXp: number;
  prestigeLevel?: number;
}

interface SkillTree {
  id: string;
  name: string;
  nodes: SkillNode[];
}

interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number; // skill points
  prerequisites: string[]; // node IDs
  effects: Effect[];
  maxRank: number;
}

interface UserSkills {
  userId: string;
  treeId: string;
  unlockedNodes: Map<string, number>; // nodeId → rank
  availablePoints: number;
}
```

**Endpoints**:
```typescript
GET    /api/levels/:userId
POST   /api/levels/:userId/add-xp
GET    /api/skill-trees
GET    /api/skill-trees/:treeId/user/:userId
POST   /api/skill-trees/:treeId/unlock-node
POST   /api/levels/:userId/prestige
```

---

### 6. **Quest & Missions Service** 🆕
**Purpose**: Task-based engagement and guided activities

**Responsibilities**:
- Quest creation and lifecycle
- Multi-step mission tracking
- Daily/weekly quest rotation
- Quest chains and storylines
- Objective validation

**Key Features**:
- **Quest Types**: Single-step, multi-step, repeatable, daily, story chains
- **Objective Tracking**: Multiple parallel objectives
- **Branching Quests**: Choice-driven paths
- **Time-Limited**: Dailies, weeklies, events
- **Difficulty Scaling**: Dynamic based on user level

**Data Model**:
```typescript
interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'side' | 'daily' | 'weekly' | 'event' | 'repeatable';
  objectives: Objective[];
  rewards: Reward[];
  prerequisites?: string[]; // quest IDs
  expiresAt?: Date;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  chain?: {
    previous?: string;
    next?: string;
  };
}

interface Objective {
  id: string;
  description: string;
  type: 'count' | 'collect' | 'visit' | 'interact' | 'defeat';
  target: number;
  metric: string; // what to track
  optional: boolean;
}

interface UserQuest {
  userId: string;
  questId: string;
  status: 'available' | 'active' | 'completed' | 'failed' | 'expired';
  progress: Map<string, number>; // objectiveId → current count
  startedAt?: Date;
  completedAt?: Date;
}
```

**Endpoints**:
```typescript
GET    /api/quests/available/:userId
GET    /api/quests/active/:userId
POST   /api/quests/:questId/accept
POST   /api/quests/:questId/progress
POST   /api/quests/:questId/complete
POST   /api/quests/:questId/abandon
GET    /api/quests/daily
```

---

### 7. **Challenge Service** 🆕
**Purpose**: User-vs-user competitions and time-limited events

**Responsibilities**:
- 1v1 and group challenges
- Challenge matching and invitations
- Real-time challenge tracking
- Wagering and betting systems
- Challenge history and stats

**Key Features**:
- **Challenge Types**: Head-to-head, tournaments, team battles
- **Matchmaking**: Skill-based pairing
- **Wagering**: Stakes with virtual currency
- **Live Events**: Time-boxed competitions
- **Spectator Mode**: Watch ongoing challenges

**Data Model**:
```typescript
interface Challenge {
  id: string;
  type: 'duel' | 'tournament' | 'team' | 'event';
  participants: string[]; // user IDs
  rules: {
    metric: string; // what's being measured
    goal: number;
    duration: number; // seconds
    wager?: {
      currencyId: string;
      amount: number;
    };
  };
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  winner?: string;
  results: Map<string, number>; // userId → score
  createdAt: Date;
  startsAt?: Date;
  endsAt?: Date;
}
```

**Endpoints**:
```typescript
POST   /api/challenges/create
POST   /api/challenges/:challengeId/accept
POST   /api/challenges/:challengeId/decline
GET    /api/challenges/:challengeId
POST   /api/challenges/:challengeId/update-score
GET    /api/challenges/user/:userId/active
GET    /api/challenges/matchmaking
```

---

### 8. **Social Service** 🆕
**Purpose**: Friend systems, guilds, and social interactions

**Responsibilities**:
- Friend lists and connections
- Guild/clan management
- Social feeds and activity streams
- Gifting and sharing
- Referral tracking

**Key Features**:
- **Friendship**: Friend requests, following, blocking
- **Guilds/Clans**: Group creation, roles, membership
- **Social Feed**: Activity broadcasting
- **Gifting**: Send rewards to friends
- **Referrals**: Invite tracking and bonuses

**Data Model**:
```typescript
interface Friendship {
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

interface Guild {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  members: GuildMember[];
  level: number;
  xp: number;
  maxMembers: number;
  isPublic: boolean;
  requirements?: {
    minLevel?: number;
    minTrophies?: number;
  };
}

interface GuildMember {
  userId: string;
  role: 'leader' | 'officer' | 'member';
  joinedAt: Date;
  contribution: number;
}

interface SocialActivity {
  id: string;
  userId: string;
  type: 'achievement' | 'level_up' | 'challenge_won' | 'quest_completed';
  data: Record<string, any>;
  timestamp: Date;
}
```

**Endpoints**:
```typescript
POST   /api/friends/request
POST   /api/friends/accept
GET    /api/friends/:userId
POST   /api/guilds/create
POST   /api/guilds/:guildId/join
GET    /api/guilds/:guildId
GET    /api/feed/:userId
POST   /api/gifts/send
```

---

### 9. **Event & Seasons Service** 🆕
**Purpose**: Time-limited events and seasonal content

**Responsibilities**:
- Event creation and scheduling
- Season/battle pass management
- Event-specific rewards
- Limited-time challenges
- Event leaderboards

**Key Features**:
- **Event Types**: Tournaments, festivals, limited quests
- **Seasons**: Recurring content cycles (Battle Pass)
- **Exclusive Rewards**: Event-only items
- **Dynamic Difficulty**: Scales with participation
- **Event Calendar**: Scheduled content rotation

**Data Model**:
```typescript
interface GameEvent {
  id: string;
  name: string;
  type: 'tournament' | 'festival' | 'season' | 'limited_quest';
  description: string;
  startsAt: Date;
  endsAt: Date;
  rewards: Reward[];
  leaderboardId?: string;
  requirements?: {
    minLevel?: number;
    requiredAchievements?: string[];
  };
  metadata: Record<string, any>;
}

interface Season {
  id: string;
  name: string;
  number: number;
  startsAt: Date;
  endsAt: Date;
  tiers: SeasonTier[];
  xpMultiplier: number;
}

interface SeasonTier {
  tier: number;
  requiredXp: number;
  freeRewards: Reward[];
  premiumRewards: Reward[];
}

interface UserSeasonProgress {
  userId: string;
  seasonId: string;
  currentTier: number;
  currentXp: number;
  isPremium: boolean;
  claimedTiers: number[];
}
```

**Endpoints**:
```typescript
GET    /api/events/active
GET    /api/events/:eventId
POST   /api/events/:eventId/participate
GET    /api/seasons/current
GET    /api/seasons/:seasonId/user/:userId/progress
POST   /api/seasons/:seasonId/claim-reward
```

---

### 10. **Analytics & Insights Service** 🆕
**Purpose**: Player behavior tracking and engagement metrics

**Responsibilities**:
- Event tracking and logging
- Player engagement metrics
- Cohort analysis
- A/B testing framework
- Predictive churn analysis
- Custom report generation

**Key Features**:
- **Event Tracking**: All user actions logged
- **Funnel Analysis**: Drop-off identification
- **Retention Metrics**: Daily/weekly/monthly active users
- **Segment Analysis**: User cohort comparison
- **Heatmaps**: Feature usage visualization
- **Recommendations**: ML-driven personalization

**Data Model**:
```typescript
interface AnalyticsEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  context: {
    appVersion: string;
    platform: string;
    deviceType: string;
  };
}

interface EngagementMetrics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  sessionsCount: number;
  averageSessionDuration: number;
  actionsPerformed: Map<string, number>;
  pointsEarned: number;
  achievementsUnlocked: number;
  lastActiveAt: Date;
}

interface ABTest {
  id: string;
  name: string;
  hypothesis: string;
  variants: Variant[];
  metric: string;
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'active' | 'completed';
}
```

**Endpoints**:
```typescript
POST   /api/analytics/track
GET    /api/analytics/users/:userId/engagement
GET    /api/analytics/metrics/retention
GET    /api/analytics/cohorts/:cohortId
POST   /api/analytics/ab-tests
GET    /api/analytics/reports/custom
```

---

### 11. **Notification Service** 🆕
**Purpose**: Push notifications and in-app messaging

**Responsibilities**:
- Push notification delivery
- In-app notification center
- Email/SMS notifications
- Notification preferences
- Targeted messaging

**Key Features**:
- **Multi-Channel**: Push, email, SMS, in-app
- **Targeting**: Segment-based delivery
- **Scheduling**: Time-based sending
- **Templates**: Pre-built message formats
- **Preferences**: User opt-in/opt-out

**Data Model**:
```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'achievement' | 'level_up' | 'challenge' | 'social' | 'event' | 'system';
  title: string;
  message: string;
  actionUrl?: string;
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
}

interface NotificationPreferences {
  userId: string;
  channels: Map<string, boolean>; // channel → enabled
  quietHours?: {
    start: string; // HH:mm
    end: string;
  };
  categories: Map<string, boolean>; // category → enabled
}
```

**Endpoints**:
```typescript
POST   /api/notifications/send
GET    /api/notifications/:userId
PATCH  /api/notifications/:notificationId/read
GET    /api/notifications/:userId/preferences
PATCH  /api/notifications/:userId/preferences
POST   /api/notifications/bulk
```

---

### 12. **Rules Engine Service** 🆕
**Purpose**: Dynamic rule evaluation and business logic

**Responsibilities**:
- Rule definition and storage
- Real-time rule evaluation
- Conditional logic execution
- Dynamic reward calculation
- A/B testing support

**Key Features**:
- **Rule Types**: Points, unlocks, restrictions, multipliers
- **Expression Language**: JSON-based rule DSL
- **Version Control**: Rule history and rollback
- **Testing**: Rule simulation and validation
- **Performance**: Cached rule evaluation

**Data Model**:
```typescript
interface Rule {
  id: string;
  name: string;
  description: string;
  type: 'earning' | 'unlock' | 'restriction' | 'multiplier';
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
  validFrom?: Date;
  validUntil?: Date;
}

interface RuleCondition {
  operator: 'and' | 'or' | 'not';
  conditions: Array<{
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
    value: any;
  }>;
}

interface RuleAction {
  type: 'award_points' | 'unlock_achievement' | 'trigger_event' | 'send_notification';
  params: Record<string, any>;
}
```

**Endpoints**:
```typescript
POST   /api/rules/evaluate
GET    /api/rules
POST   /api/rules
PATCH  /api/rules/:ruleId
POST   /api/rules/:ruleId/simulate
GET    /api/rules/:ruleId/history
```

---

## Cross-Cutting Concerns

### Gateway Service ✅ (Existing)
**Responsibilities**:
- API Gateway and routing
- Authentication/authorization
- Rate limiting
- Request/response transformation
- Service discovery integration

### Configuration Service
**Responsibilities**:
- Feature flags
- Application-wide settings
- Multi-tenant configuration
- A/B test variants
- Dynamic configuration updates

### Audit & Compliance Service
**Responsibilities**:
- Action audit trail
- GDPR compliance (data export, deletion)
- Fraud detection
- Cheating prevention
- Data retention policies

---

## Integration Patterns

### SDK Architecture

```typescript
// Client SDK Example
import { GamificationSDK } from '@gamification-engine/sdk';

const sdk = new GamificationSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.gamification.com',
  tenantId: 'your-tenant-id'
});

// Track user action
await sdk.track({
  userId: '123',
  action: 'post.created',
  metadata: { postId: '456' }
});

// Award points
await sdk.points.award({
  userId: '123',
  currencyId: 'xp',
  amount: 100,
  reason: 'Post created'
});

// Check achievements
const achievements = await sdk.achievements.check({
  userId: '123',
  action: 'post.created'
});

// Get user stats
const stats = await sdk.users.getStats('123');
```

### Event-Driven Integration

```typescript
// Event Bus Patterns
interface GameEvent {
  type: string;
  userId: string;
  timestamp: Date;
  data: Record<string, any>;
}

// Example events:
// - user.action.completed
// - achievement.unlocked
// - level.increased
// - challenge.accepted
// - quest.completed
```

### Webhook Support

```typescript
// Client application receives webhooks
POST /webhooks/gamification
{
  "event": "achievement.unlocked",
  "userId": "123",
  "data": {
    "achievementId": "first-post",
    "timestamp": "2025-11-30T12:00:00Z"
  }
}
```

---

## Data Models - Shared Types

### Reward Model
```typescript
interface Reward {
  id: string;
  type: 'currency' | 'item' | 'achievement' | 'unlock' | 'boost';
  data: {
    currencyId?: string;
    amount?: number;
    itemId?: string;
    achievementId?: string;
    unlockType?: string;
    boostType?: string;
    duration?: number;
  };
}
```

### User Stats Aggregate
```typescript
interface UserStats {
  userId: string;
  level: number;
  totalXp: number;
  currencies: Map<string, number>;
  achievementsCount: number;
  questsCompleted: number;
  challengesWon: number;
  rank: number;
  joinedAt: Date;
  lastActiveAt: Date;
}
```

---

## Technology Stack

### Backend Services
- **Runtime**: Node.js 22 + NestJS 10
- **Language**: TypeScript 5.7
- **Database**: MongoDB (documents), Redis (cache/sessions)
- **Message Queue**: RabbitMQ or Kafka (events)
- **API Protocol**: REST + GraphQL + WebSocket
- **Build Tool**: Nx 22 monorepo

### Infrastructure
- **Containerization**: Docker + Kubernetes
- **Service Mesh**: Istio (optional)
- **API Gateway**: Kong or custom NestJS gateway
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger or Zipkin

### SDKs
- **JavaScript/TypeScript**: Browser + Node.js
- **Python**: Server-side integration
- **Mobile**: React Native wrapper
- **Unity**: Game engine integration

---

## Deployment Architecture

### Multi-Tenant Strategy
```
Tenant A (App 1) ──┐
Tenant B (App 2) ──┼──> API Gateway ──> Services (shared)
Tenant C (App 3) ──┘

Data Isolation:
- Option 1: Separate databases per tenant
- Option 2: Shared DB with tenantId column
- Option 3: Schema-per-tenant in same DB
```

### Scalability Patterns
- **Horizontal Scaling**: Stateless services behind load balancers
- **Caching**: Multi-layer (Redis, CDN, application)
- **Database Sharding**: User-based or tenant-based
- **Read Replicas**: Separate read/write databases
- **Event Sourcing**: For audit and replay capabilities

---

## Next Steps - Decision Points

### Phase 1: MVP Scope
**Which services are critical for v1.0?**
- [ ] Account ✅
- [ ] Leaderboard ✅
- [ ] Achievement
- [ ] Points & Rewards
- [ ] Analytics (basic)

### Phase 2: Engagement Features
- [ ] Quest & Missions
- [ ] Challenge
- [ ] Notification

### Phase 3: Social & Advanced
- [ ] Social
- [ ] Event & Seasons
- [ ] Advanced Analytics

### Architecture Decisions Needed
1. **Communication**: REST-only or add GraphQL/gRPC?
2. **Events**: Sync webhooks or async message queue?
3. **Multi-tenancy**: Shared DB or separate per tenant?
4. **Real-time**: WebSocket for live updates?
5. **SDK Priority**: Which language first?

---

**Document Status**: Ready for stakeholder review and refinement
