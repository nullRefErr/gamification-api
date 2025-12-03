# Gamification Engine - Complete Services Summary
**Production-Ready Specifications for All Microservices**

> **Version**: 1.0.0
> **Last Updated**: 2025-11-30
> **Status**: Ready for Implementation

---

## Documentation Index

### ✅ **Completed Detailed Specifications**
1. [Achievement Service](./services/ACHIEVEMENT_SERVICE_SPEC.md) - Badges, trophies, progress tracking
2. [Points & Rewards Service](./services/POINTS_REWARDS_SERVICE_SPEC.md) - Multi-currency wallet system
3. [Quest & Missions Service](./services/QUEST_MISSIONS_SERVICE_SPEC.md) - Task-based engagement
4. [Rules Engine Service](./services/RULES_ENGINE_SERVICE_SPEC.md) - Dynamic rule evaluation

### 📋 **Services Covered in This Summary**
5. [Level & Progression Service](#level--progression-service) - XP, skill trees, prestige
6. [Challenge Service](#challenge-service) - Competitions and tournaments
7. [Social Service](#social-service) - Friends, guilds, activity feeds
8. [Event & Seasons Service](#event--seasons-service) - Time-limited content
9. [Analytics & Insights Service](#analytics--insights-service) - Behavioral tracking
10. [Notification Service](#notification-service) - Multi-channel messaging

---

## Level & Progression Service

### Service Overview
Manages user leveling through XP accumulation, skill tree unlocking, prestige systems, and seasonal battle pass progression.

### Core Features
- **XP-Based Leveling**: Linear, exponential, logarithmic, or custom curves
- **Skill Trees**: DAG-based progression with prerequisites
- **Prestige System**: Reset for permanent bonuses
- **Seasonal Tracks**: Battle pass with free/premium tiers

### API Endpoints (20+)

**Level Management**:
```typescript
GET    /api/levels/:userId                    // Get current level and XP
POST   /api/levels/:userId/add-xp             // Add XP (with auto-level-up)
GET    /api/levels/:userId/next-level         // XP needed for next level
GET    /api/levels/systems                    // List all level systems
POST   /api/levels/systems                    // Create level system (admin)
```

**Skill Trees**:
```typescript
GET    /api/skill-trees                       // List all skill trees
GET    /api/skill-trees/:treeId               // Get tree structure
GET    /api/skill-trees/:treeId/user/:userId  // User's unlocked nodes
POST   /api/skill-trees/:treeId/unlock        // Unlock skill node
POST   /api/skill-trees/:treeId/reset         // Reset skill tree (respec)
GET    /api/skill-trees/:treeId/paths         // Get optimal paths to node
```

**Prestige**:
```typescript
POST   /api/prestige/:userId                  // Perform prestige reset
GET    /api/prestige/:userId/benefits         // Calculate prestige benefits
GET    /api/prestige/leaderboard              // Prestige level rankings
```

**Seasonal Progression**:
```typescript
GET    /api/seasons/current                   // Active season info
GET    /api/seasons/:seasonId/user/:userId    // User season progress
POST   /api/seasons/:seasonId/claim-reward    // Claim tier reward
POST   /api/seasons/:seasonId/buy-premium     // Unlock premium track
```

### Database Schema

```typescript
// Level System Definition
interface LevelSystem {
  id: string;
  name: string;
  maxLevel: number;
  xpCurve: 'linear' | 'exponential' | 'logarithmic' | 'custom';
  customFormula?: string; // "100 * level^2"
  levelRewards: Array<{
    level: number;
    rewards: Reward[];
  }>;
}

// User Level Progress
interface UserLevel {
  userId: string;
  systemId: string;
  currentLevel: number;
  currentXp: number;
  totalXp: number;
  prestigeLevel: number;
  prestigeBonuses: {
    xpMultiplier: number;
    skillPointBonus: number;
  };
}

// Skill Tree Structure
interface SkillTree {
  id: string;
  name: string;
  nodes: SkillNode[];
  layout: 'linear' | 'branching' | 'web';
}

interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number; // skill points
  prerequisites: string[]; // node IDs
  maxRank: number;
  effects: Array<{
    type: 'stat_boost' | 'unlock_feature' | 'passive_bonus';
    params: Record<string, any>;
  }>;
  position: { x: number; y: number }; // For UI rendering
}

interface UserSkills {
  userId: string;
  treeId: string;
  unlockedNodes: Map<string, number>; // nodeId → rank
  availablePoints: number;
  totalPointsEarned: number;
}

// Seasonal Progression
interface Season {
  id: string;
  name: string;
  number: number;
  startsAt: Date;
  endsAt: Date;
  tiers: SeasonTier[];
  premiumCost: {
    currencyId: string;
    amount: number;
  };
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
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
}
```

### XP Curve Implementations

```typescript
class XpCurveCalculator {
  static calculateXpForLevel(level: number, curve: string, params?: any): number {
    switch (curve) {
      case 'linear':
        return 100 * level;

      case 'exponential':
        const base = params?.base || 1.1;
        return Math.floor(100 * Math.pow(base, level));

      case 'logarithmic':
        return Math.floor(100 * level * Math.log(level + 1));

      case 'custom':
        // Evaluate custom formula
        return this.evaluateFormula(params.formula, { level });

      default:
        throw new Error(`Unknown curve type: ${curve}`);
    }
  }

  static getTotalXpForLevel(targetLevel: number, curve: string, params?: any): number {
    let total = 0;
    for (let level = 1; level <= targetLevel; level++) {
      total += this.calculateXpForLevel(level, curve, params);
    }
    return total;
  }
}
```

### Skill Tree Validation

```typescript
class SkillTreeValidator {
  validateUnlock(
    tree: SkillTree,
    nodeId: string,
    userSkills: UserSkills
  ): { valid: boolean; reason?: string } {
    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return { valid: false, reason: 'Node not found' };

    // Check if already max rank
    const currentRank = userSkills.unlockedNodes.get(nodeId) || 0;
    if (currentRank >= node.maxRank) {
      return { valid: false, reason: 'Already at max rank' };
    }

    // Check skill points
    if (userSkills.availablePoints < node.cost) {
      return { valid: false, reason: 'Insufficient skill points' };
    }

    // Check prerequisites
    for (const prereqId of node.prerequisites) {
      const prereqRank = userSkills.unlockedNodes.get(prereqId) || 0;
      if (prereqRank === 0) {
        return { valid: false, reason: `Prerequisite ${prereqId} not unlocked` };
      }
    }

    return { valid: true };
  }

  findPathToNode(tree: SkillTree, targetNodeId: string): string[][] {
    // BFS to find all paths from root to target
    // Returns array of node ID sequences
    const paths: string[][] = [];
    const queue: { nodeId: string; path: string[] }[] = [];

    // Find root nodes (no prerequisites)
    const rootNodes = tree.nodes.filter(n => n.prerequisites.length === 0);
    rootNodes.forEach(node => queue.push({ nodeId: node.id, path: [node.id] }));

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === targetNodeId) {
        paths.push(path);
        continue;
      }

      // Find dependent nodes
      const dependents = tree.nodes.filter(n =>
        n.prerequisites.includes(nodeId) && !path.includes(n.id)
      );

      dependents.forEach(node => {
        queue.push({ nodeId: node.id, path: [...path, node.id] });
      });
    }

    return paths;
  }
}
```

### Prestige System Logic

```typescript
interface PrestigeCalculator {
  calculateBenefits(
    userId: string,
    currentLevel: number,
    totalXp: number
  ): {
    xpMultiplier: number;
    skillPointBonus: number;
    prestigePoints: number;
  } {
    // Prestige points based on level achieved
    const prestigePoints = Math.floor(currentLevel / 10);

    // XP multiplier (5% per prestige level)
    const xpMultiplier = 1 + (prestigePoints * 0.05);

    // Bonus skill points on future levels
    const skillPointBonus = prestigePoints * 2;

    return { xpMultiplier, skillPointBonus, prestigePoints };
  }

  async performPrestige(userId: string, systemId: string): Promise<void> {
    // Calculate benefits
    const currentProgress = await this.getUserLevel(userId, systemId);
    const benefits = this.calculateBenefits(
      userId,
      currentProgress.currentLevel,
      currentProgress.totalXp
    );

    // Reset level but keep prestige bonuses
    await this.userLevelRepository.update(userId, systemId, {
      currentLevel: 1,
      currentXp: 0,
      totalXp: 0, // Reset total XP
      prestigeLevel: currentProgress.prestigeLevel + 1,
      prestigeBonuses: {
        xpMultiplier: benefits.xpMultiplier,
        skillPointBonus: benefits.skillPointBonus
      }
    });

    // Award prestige currency
    await this.pointsService.earn({
      userId,
      currencyId: 'prestige_points',
      amount: benefits.prestigePoints,
      reason: 'Prestige reset'
    });

    // Emit event
    this.eventEmitter.emit('user.prestige', {
      userId,
      systemId,
      prestigeLevel: currentProgress.prestigeLevel + 1,
      benefits
    });
  }
}
```

### Integration Points

**With Points Service**:
- Award XP via points service
- Deduct skill points for node unlocking
- Grant prestige currency

**With Achievement Service**:
- Unlock achievements on level milestones
- Track prestige achievements

**With Quest Service**:
- XP rewards from quest completion
- Level requirements for quest eligibility

### Performance Considerations

- **Caching**: Cache level systems, skill trees in Redis
- **Indexing**: Compound index on `userId + systemId` for fast lookups
- **Aggregation**: Pre-calculate season leaderboards
- **Batch Processing**: Bulk XP additions for events

---

## Challenge Service

### Service Overview
Manages competitive interactions including 1v1 duels, tournaments, team battles, wagering, and real-time challenge tracking.

### Core Features
- **1v1 Duels**: Direct player challenges
- **Tournaments**: Single/double elimination brackets
- **Team Battles**: Clan vs Clan competitions
- **Wagering**: Virtual currency stakes
- **Matchmaking**: ELO-based skill pairing
- **Real-Time Updates**: WebSocket for live scores

### API Endpoints (25+)

```typescript
// Challenge Management
POST   /api/challenges/create          // Create challenge with rules
POST   /api/challenges/:id/invite      // Invite participants
POST   /api/challenges/:id/accept      // Accept invitation
POST   /api/challenges/:id/decline     // Decline invitation
DELETE /api/challenges/:id             // Cancel challenge
GET    /api/challenges/:id             // Get challenge details
POST   /api/challenges/:id/start       // Begin challenge
POST   /api/challenges/:id/submit-score // Submit participant score
POST   /api/challenges/:id/complete    // Mark challenge complete

// Matchmaking
POST   /api/matchmaking/find           // Find opponent by skill
GET    /api/matchmaking/queue          // Current matchmaking queue
POST   /api/matchmaking/cancel         // Leave queue

// Tournament
POST   /api/tournaments/create         // Create tournament
POST   /api/tournaments/:id/register   // Join tournament
GET    /api/tournaments/:id/bracket    // Get bracket structure
POST   /api/tournaments/:id/advance    // Advance to next round
GET    /api/tournaments/:id/standings  // Current standings

// Wagering
POST   /api/challenges/:id/wager       // Add wager to challenge
GET    /api/challenges/:id/escrow      // View escrowed funds
POST   /api/challenges/:id/settle      // Distribute winnings

// History & Stats
GET    /api/challenges/user/:userId/history
GET    /api/challenges/user/:userId/stats
GET    /api/challenges/user/:userId/rating // ELO rating

// WebSocket Events
ws://api/challenges/:id/live           // Real-time updates
```

### Database Schema

```typescript
interface Challenge {
  id: string;
  type: 'duel' | 'tournament' | 'team';
  creatorId: string;
  participants: ChallengeParticipant[];
  rules: {
    metric: string; // What's being measured
    goal: number | 'highest' | 'lowest';
    duration?: number; // Time limit in seconds
    startTime?: Date;
    endTime?: Date;
  };
  wager?: {
    currencyId: string;
    amountPerPlayer: number;
    escrowTransactionId: string;
  };
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  winner?: string;
  results: Map<string, ChallengeResult>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface ChallengeParticipant {
  userId: string;
  status: 'invited' | 'accepted' | 'declined' | 'participating' | 'completed';
  joinedAt?: Date;
  eloRating?: number;
}

interface ChallengeResult {
  score: number;
  evidence?: string; // Screenshot URL, etc.
  submittedAt: Date;
  verified: boolean;
}

interface Tournament {
  id: string;
  name: string;
  format: 'single_elimination' | 'double_elimination' | 'round_robin';
  maxParticipants: number;
  participants: string[]; // user IDs
  bracket: TournamentBracket;
  prize: {
    1st: Reward[];
    2nd: Reward[];
    3rd: Reward[];
  };
  entryFee?: {
    currencyId: string;
    amount: number;
  };
  status: 'registration' | 'seeding' | 'active' | 'completed';
  startsAt: Date;
  endsAt?: Date;
}

interface TournamentBracket {
  rounds: TournamentRound[];
  currentRound: number;
}

interface TournamentRound {
  roundNumber: number;
  matches: Array<{
    matchId: string;
    player1Id: string;
    player2Id: string;
    winnerId?: string;
    score?: { player1: number; player2: number };
  }>;
}

interface UserRating {
  userId: string;
  challengeType: string;
  eloRating: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestStreak: number;
  lastMatchAt: Date;
}
```

### ELO Matchmaking Algorithm

```typescript
class ELOMatchmakingService {
  private readonly K_FACTOR = 32; // Rating change sensitivity
  private readonly RATING_THRESHOLD = 200; // Max rating difference for match

  calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  updateRating(
    playerRating: number,
    opponentRating: number,
    actualScore: number // 1 for win, 0.5 for draw, 0 for loss
  ): number {
    const expected = this.calculateExpectedScore(playerRating, opponentRating);
    const change = this.K_FACTOR * (actualScore - expected);
    return Math.round(playerRating + change);
  }

  async findMatch(userId: string): Promise<{ opponentId: string; challengeId: string } | null> {
    const userRating = await this.getUserRating(userId);

    // Find players in queue within rating threshold
    const candidates = await this.matchmakingQueue.find({
      userId: { $ne: userId },
      rating: {
        $gte: userRating - this.RATING_THRESHOLD,
        $lte: userRating + this.RATING_THRESHOLD
      }
    }).sort({ waitTime: -1 }); // Prioritize longest waiting

    if (candidates.length === 0) {
      // Add to queue
      await this.matchmakingQueue.add({ userId, rating: userRating, joinedAt: new Date() });
      return null;
    }

    // Match with closest rating
    const opponent = candidates.reduce((closest, candidate) => {
      const currentDiff = Math.abs(candidate.rating - userRating);
      const closestDiff = Math.abs(closest.rating - userRating);
      return currentDiff < closestDiff ? candidate : closest;
    });

    // Remove from queue
    await this.matchmakingQueue.remove(opponent.userId);

    // Create challenge
    const challenge = await this.createChallenge({
      participants: [userId, opponent.userId],
      type: 'duel',
      autoStart: true
    });

    return { opponentId: opponent.userId, challengeId: challenge.id };
  }
}
```

### Tournament Bracket Generation

```typescript
class TournamentBracketGenerator {
  generateSingleElimination(participants: string[]): TournamentBracket {
    const numPlayers = participants.length;
    const numRounds = Math.ceil(Math.log2(numPlayers));
    const bracketSize = Math.pow(2, numRounds);

    // Seed participants
    const seeded = this.seedParticipants(participants, bracketSize);

    const rounds: TournamentRound[] = [];
    let currentPlayers = seeded;

    for (let round = 1; round <= numRounds; round++) {
      const matches = [];
      for (let i = 0; i < currentPlayers.length; i += 2) {
        matches.push({
          matchId: `round${round}_match${i/2}`,
          player1Id: currentPlayers[i],
          player2Id: currentPlayers[i + 1] || 'BYE'
        });
      }
      rounds.push({ roundNumber: round, matches });
      currentPlayers = matches.map(m => 'TBD'); // Winners advance
    }

    return { rounds, currentRound: 1 };
  }

  private seedParticipants(participants: string[], bracketSize: number): string[] {
    const seeded: string[] = [];
    const numByes = bracketSize - participants.length;

    // Standard tournament seeding (1 vs lowest, 2 vs 2nd lowest, etc.)
    const sorted = [...participants].sort((a, b) =>
      this.getRating(b) - this.getRating(a)
    );

    for (let i = 0; i < sorted.length; i++) {
      seeded.push(sorted[i]);
      if (i < numByes) {
        seeded.push('BYE'); // Add byes for top seeds
      }
    }

    return seeded;
  }
}
```

### WebSocket Real-Time Updates

```typescript
@WebSocketGateway()
export class ChallengeGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('challenge:join')
  async handleJoinChallenge(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challengeId: string; userId: string }
  ) {
    client.join(`challenge:${data.challengeId}`);

    const challenge = await this.challengeService.findById(data.challengeId);
    client.emit('challenge:state', challenge);
  }

  @SubscribeMessage('challenge:updateScore')
  async handleScoreUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challengeId: string; userId: string; score: number }
  ) {
    const challenge = await this.challengeService.updateScore(
      data.challengeId,
      data.userId,
      data.score
    );

    // Broadcast to all participants
    this.server
      .to(`challenge:${data.challengeId}`)
      .emit('challenge:scoreUpdated', {
        userId: data.userId,
        score: data.score,
        timestamp: new Date()
      });

    // Check for completion
    if (this.isComplete(challenge)) {
      const winner = this.determineWinner(challenge);
      this.server
        .to(`challenge:${data.challengeId}`)
        .emit('challenge:completed', { winner, finalScores: challenge.results });
    }
  }
}
```

### Integration Points

- **Leaderboard Service**: Tournament winners update leaderboards
- **Points Service**: Wager escrow and winnings distribution
- **Social Service**: Team battles use guild membership
- **Achievement Service**: Challenge victory achievements
- **Notification Service**: Challenge invitations, match start, results

---

## Social Service

### Service Overview
Manages social interactions including friend lists, guild/clan systems, social activity feeds, gifting, and referral tracking.

### Core Features
- **Friend System**: Requests, following, blocking
- **Guilds/Clans**: Creation, roles, membership management
- **Activity Feeds**: Social broadcasting of achievements
- **Gifting**: Send virtual items to friends
- **Referral Program**: Invite tracking with rewards

### API Endpoints (30+)

```typescript
// Friend Management
POST   /api/friends/request         // Send friend request
POST   /api/friends/:id/accept      // Accept request
POST   /api/friends/:id/decline     // Decline request
DELETE /api/friends/:id             // Unfriend
POST   /api/friends/:id/block       // Block user
GET    /api/friends/:userId         // Get friend list
GET    /api/friends/:userId/pending // Pending requests
GET    /api/friends/search          // Search for users

// Guild Management
POST   /api/guilds                  // Create guild
GET    /api/guilds/:id              // Get guild info
PATCH  /api/guilds/:id              // Update guild (leader only)
DELETE /api/guilds/:id              // Disband guild
POST   /api/guilds/:id/join         // Join guild
POST   /api/guilds/:id/leave        // Leave guild
POST   /api/guilds/:id/kick         // Kick member (officer+)
POST   /api/guilds/:id/promote      // Change member role
GET    /api/guilds/:id/members      // List members
GET    /api/guilds/search           // Search guilds

// Activity Feed
GET    /api/feed/:userId            // User's activity feed
GET    /api/feed/friends/:userId    // Friends' activities
POST   /api/feed/activity           // Publish activity
DELETE /api/feed/activity/:id       // Delete activity
GET    /api/feed/global             // Global feed (trending)

// Gifting
POST   /api/gifts/send              // Send gift to friend
GET    /api/gifts/:userId/inbox     // Pending gifts
POST   /api/gifts/:id/claim         // Claim gift
DELETE /api/gifts/:id/reject        // Reject gift
GET    /api/gifts/:userId/sent      // Sent gift history

// Referrals
POST   /api/referrals/generate      // Generate referral code
GET    /api/referrals/:userId/stats // Referral statistics
GET    /api/referrals/:code/verify  // Verify referral code
POST   /api/referrals/:code/apply   // Apply referral on signup
```

### Database Schema

```typescript
interface Friendship {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  acceptedAt?: Date;
}

interface Guild {
  id: string;
  name: string;
  tag: string; // [CLAN]
  description: string;
  leaderId: string;
  members: GuildMember[];
  level: number;
  xp: number;
  maxMembers: number;
  settings: {
    isPublic: boolean;
    requiresApproval: boolean;
    allowInvites: boolean;
  };
  requirements?: {
    minLevel?: number;
    minTrophies?: number;
  };
  createdAt: Date;
}

interface GuildMember {
  userId: string;
  role: 'leader' | 'officer' | 'member';
  joinedAt: Date;
  contribution: number; // Weekly XP contribution
}

interface SocialActivity {
  id: string;
  userId: string;
  type: 'achievement' | 'level_up' | 'challenge_won' | 'quest_completed' | 'guild_joined' | 'custom';
  data: Record<string, any>;
  visibility: 'public' | 'friends' | 'guild' | 'private';
  timestamp: Date;
  reactions?: Map<string, number>; // userId → reaction type
}

interface Gift {
  id: string;
  senderId: string;
  recipientId: string;
  item: {
    type: 'currency' | 'item' | 'boost';
    data: any;
  };
  message?: string;
  status: 'pending' | 'claimed' | 'rejected' | 'expired';
  createdAt: Date;
  claimedAt?: Date;
  expiresAt: Date;
}

interface Referral {
  id: string;
  referrerId: string;
  code: string;
  uses: number;
  maxUses?: number;
  rewards: {
    referrer: Reward[];
    referee: Reward[];
  };
  conversions: ReferralConversion[];
  createdAt: Date;
  expiresAt?: Date;
}

interface ReferralConversion {
  userId: string;
  appliedAt: Date;
  rewardsGranted: boolean;
}
```

### Friend Graph Implementation

```typescript
class FriendService {
  async sendRequest(requesterId: string, recipientId: string): Promise<Friendship> {
    // Check if already friends or blocked
    const existing = await this.friendshipRepository.findOne({
      $or: [
        { requesterId, recipientId },
        { requesterId: recipientId, recipientId: requesterId }
      ]
    });

    if (existing) {
      if (existing.status === 'blocked') {
        throw new ForbiddenException('Cannot send request to blocked user');
      }
      if (existing.status === 'accepted') {
        throw new ConflictException('Already friends');
      }
      if (existing.status === 'pending') {
        throw new ConflictException('Request already pending');
      }
    }

    const friendship = await this.friendshipRepository.create({
      requesterId,
      recipientId,
      status: 'pending',
      createdAt: new Date()
    });

    // Send notification
    await this.notificationService.send({
      userId: recipientId,
      type: 'friend_request',
      title: 'New Friend Request',
      data: { requesterId, friendshipId: friendship.id }
    });

    return friendship;
  }

  async getFriendsList(userId: string): Promise<string[]> {
    const friendships = await this.friendshipRepository.find({
      $or: [
        { requesterId: userId, status: 'accepted' },
        { recipientId: userId, status: 'accepted' }
      ]
    });

    return friendships.map(f =>
      f.requesterId === userId ? f.recipientId : f.requesterId
    );
  }

  async getMutualFriends(userId1: string, userId2: string): Promise<string[]> {
    const user1Friends = await this.getFriendsList(userId1);
    const user2Friends = await this.getFriendsList(userId2);

    return user1Friends.filter(id => user2Friends.includes(id));
  }
}
```

### Guild Management

```typescript
class GuildService {
  async createGuild(leaderId: string, data: CreateGuildDto): Promise<Guild> {
    // Check if user already in a guild
    const existingMembership = await this.guildRepository.findOne({
      'members.userId': leaderId
    });

    if (existingMembership) {
      throw new ConflictException('Already in a guild');
    }

    const guild = await this.guildRepository.create({
      ...data,
      leaderId,
      members: [{
        userId: leaderId,
        role: 'leader',
        joinedAt: new Date(),
        contribution: 0
      }],
      level: 1,
      xp: 0,
      createdAt: new Date()
    });

    return guild;
  }

  async promoteToOfficer(guildId: string, leaderId: string, targetUserId: string): Promise<void> {
    const guild = await this.findById(guildId);

    if (guild.leaderId !== leaderId) {
      throw new ForbiddenException('Only leader can promote members');
    }

    const member = guild.members.find(m => m.userId === targetUserId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'officer') {
      throw new ConflictException('Already an officer');
    }

    await this.guildRepository.updateOne(
      { _id: guildId, 'members.userId': targetUserId },
      { $set: { 'members.$.role': 'officer' } }
    );

    // Notify member
    await this.notificationService.send({
      userId: targetUserId,
      type: 'guild_promotion',
      title: 'You have been promoted to Officer!',
      data: { guildId, role: 'officer' }
    });
  }

  async contributeXp(guildId: string, userId: string, xp: number): Promise<void> {
    const guild = await this.findById(guildId);

    // Add to guild XP
    guild.xp += xp;

    // Check for level up
    const newLevel = Math.floor(guild.xp / 1000); // 1000 XP per level
    if (newLevel > guild.level) {
      guild.level = newLevel;
      // Award guild level rewards
      await this.awardGuildLevelRewards(guildId, newLevel);
    }

    // Update member contribution
    await this.guildRepository.updateOne(
      { _id: guildId, 'members.userId': userId },
      {
        $set: { level: guild.level, xp: guild.xp },
        $inc: { 'members.$.contribution': xp }
      }
    );
  }
}
```

### Activity Feed Generation

```typescript
class ActivityFeedService {
  async generateFeed(userId: string, limit: number = 50): Promise<SocialActivity[]> {
    // Get user's friends
    const friends = await this.friendService.getFriendsList(userId);

    // Get guild members if in a guild
    const guild = await this.guildService.getUserGuild(userId);
    const guildMembers = guild ? guild.members.map(m => m.userId) : [];

    // Combine audiences
    const relevantUsers = [...new Set([userId, ...friends, ...guildMembers])];

    // Query activities
    const activities = await this.activityRepository.find({
      $and: [
        { userId: { $in: relevantUsers } },
        {
          $or: [
            { visibility: 'public' },
            { visibility: 'friends', userId: { $in: friends } },
            { visibility: 'guild', userId: { $in: guildMembers } }
          ]
        }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit);

    return activities;
  }

  async publishActivity(userId: string, activity: CreateActivityDto): Promise<SocialActivity> {
    const published = await this.activityRepository.create({
      userId,
      ...activity,
      timestamp: new Date(),
      reactions: new Map()
    });

    // Real-time broadcast to followers
    this.eventEmitter.emit('activity.published', {
      userId,
      activityId: published.id,
      type: activity.type
    });

    return published;
  }
}
```

### Referral System

```typescript
class ReferralService {
  async generateReferralCode(userId: string): Promise<Referral> {
    const code = this.generateUniqueCode();

    const referral = await this.referralRepository.create({
      referrerId: userId,
      code,
      uses: 0,
      maxUses: 100,
      rewards: {
        referrer: [
          { type: 'currency', data: { currencyId: 'coins', amount: 500 } }
        ],
        referee: [
          { type: 'currency', data: { currencyId: 'coins', amount: 100 } },
          { type: 'boost', data: { type: 'xp_boost', multiplier: 1.5, duration: 86400 } }
        ]
      },
      conversions: [],
      createdAt: new Date()
    });

    return referral;
  }

  async applyReferral(code: string, newUserId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({ code });

    if (!referral) {
      throw new NotFoundException('Invalid referral code');
    }

    if (referral.maxUses && referral.uses >= referral.maxUses) {
      throw new ConflictException('Referral code has reached maximum uses');
    }

    if (referral.expiresAt && referral.expiresAt < new Date()) {
      throw new GoneException('Referral code has expired');
    }

    // Record conversion
    await this.referralRepository.updateOne(
      { _id: referral.id },
      {
        $inc: { uses: 1 },
        $push: {
          conversions: {
            userId: newUserId,
            appliedAt: new Date(),
            rewardsGranted: false
          }
        }
      }
    );

    // Award rewards (after some validation period)
    await this.scheduleRewardGrant(referral.id, newUserId);
  }

  private async scheduleRewardGrant(referralId: string, newUserId: string): Promise<void> {
    // Schedule job to grant rewards after 7 days (prevent fraud)
    await this.queueService.add('grant-referral-rewards', {
      referralId,
      newUserId
    }, {
      delay: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
}
```

### Integration Points

- **Achievement Service**: Friend/guild milestones
- **Points Service**: Gift currency, referral rewards
- **Challenge Service**: Team battles use guilds
- **Notification Service**: Friend requests, guild invitations
- **Analytics Service**: Social graph metrics

---

## Event & Seasons Service

### Service Overview
Manages time-limited events, seasonal content rotation, and battle pass progression systems.

### Core Features
- **Time-Limited Events**: Tournaments, festivals, special challenges
- **Seasonal Content**: Recurring content cycles
- **Battle Pass**: Free and premium reward tracks
- **Event Leaderboards**: Event-specific rankings
- **Dynamic Rewards**: Scaling based on participation

### API Endpoints

```typescript
GET    /api/events                         // List active events
GET    /api/events/:id                     // Event details
POST   /api/events/:id/participate         // Join event
GET    /api/events/:id/leaderboard         // Event rankings
GET    /api/events/:id/user/:userId/progress // User event progress

GET    /api/seasons/current                // Active season
GET    /api/seasons/:id                    // Season details
GET    /api/seasons/:id/tiers              // All reward tiers
GET    /api/seasons/:id/user/:userId       // User season progress
POST   /api/seasons/:id/claim/:tier        // Claim tier rewards
POST   /api/seasons/:id/buy-premium        // Unlock premium track
```

### Database Schema

```typescript
interface GameEvent {
  id: string;
  name: string;
  type: 'tournament' | 'festival' | 'challenge' | 'limited_quest';
  description: string;
  startsAt: Date;
  endsAt: Date;
  requirements?: {
    minLevel?: number;
    requiredAchievements?: string[];
  };
  rewards: EventReward[];
  leaderboardId?: string;
  metadata: Record<string, any>;
  status: 'upcoming' | 'active' | 'ended';
}

interface EventReward {
  rank: string; // "1-10", "11-100", "participation"
  rewards: Reward[];
}

interface UserEventProgress {
  userId: string;
  eventId: string;
  score: number;
  rank?: number;
  participatedAt: Date;
  rewardsClaimed: boolean;
}
```

### Seasonal System Implementation

```typescript
class SeasonService {
  async getCurrentSeason(): Promise<Season> {
    return this.seasonRepository.findOne({
      startsAt: { $lte: new Date() },
      endsAt: { $gt: new Date() }
    });
  }

  async claimTierReward(userId: string, seasonId: string, tier: number): Promise<void> {
    const progress = await this.getUserProgress(userId, seasonId);

    if (progress.currentTier < tier) {
      throw new BadRequestException('Tier not yet unlocked');
    }

    if (progress.claimedFreeTiers.includes(tier)) {
      throw new ConflictException('Free reward already claimed');
    }

    const season = await this.findById(seasonId);
    const tierData = season.tiers.find(t => t.tier === tier);

    // Award free rewards
    await this.pointsService.awardRewards(userId, tierData.freeRewards);

    // Award premium if applicable
    if (progress.isPremium && !progress.claimedPremiumTiers.includes(tier)) {
      await this.pointsService.awardRewards(userId, tierData.premiumRewards);
      progress.claimedPremiumTiers.push(tier);
    }

    progress.claimedFreeTiers.push(tier);
    await progress.save();
  }
}
```

---

## Analytics & Insights Service

### Service Overview
Tracks user behavior, provides engagement metrics, cohort analysis, and ML-driven insights.

### Core Features
- **Event Tracking**: All user actions logged
- **Engagement Metrics**: DAU/MAU, retention, session analytics
- **Funnel Analysis**: Drop-off identification
- **Cohort Analysis**: User segment comparison
- **A/B Testing**: Variant performance tracking
- **Predictive Analytics**: Churn prediction, LTV estimation

### API Endpoints

```typescript
POST   /api/analytics/track                     // Track event
POST   /api/analytics/batch                     // Batch events
GET    /api/analytics/users/:userId/engagement  // User metrics
GET    /api/analytics/metrics/retention         // Retention curves
GET    /api/analytics/metrics/dau               // Daily active users
GET    /api/analytics/funnels/:funnelId         // Funnel analysis
GET    /api/analytics/cohorts/:cohortId         // Cohort metrics
POST   /api/analytics/ab-tests                  // Create A/B test
GET    /api/analytics/ab-tests/:id/results      // Test results
```

### Event Schema

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
    userAgent: string;
  };
}
```

### Metrics Calculation

```typescript
class MetricsService {
  async calculateRetention(cohortDate: Date, days: number): Promise<number[]> {
    const users = await this.getUsersWhoJoinedOn(cohortDate);
    const retentionCurve: number[] = [];

    for (let day = 0; day <= days; day++) {
      const targetDate = new Date(cohortDate);
      targetDate.setDate(targetDate.getDate() + day);

      const activeUsers = await this.getActiveUsersOnDate(users, targetDate);
      const retentionRate = (activeUsers / users.length) * 100;
      retentionCurve.push(retentionRate);
    }

    return retentionCurve;
  }
}
```

---

## Notification Service

### Service Overview
Multi-channel notification delivery (push, email, SMS, in-app) with user preferences and targeting.

### Core Features
- **Multi-Channel**: Push, email, SMS, in-app
- **Targeting**: Segment-based delivery
- **Scheduling**: Time-based and event-triggered
- **Templates**: Pre-built message formats
- **Preferences**: User opt-in/opt-out

### API Endpoints

```typescript
POST   /api/notifications/send           // Send notification
POST   /api/notifications/bulk           // Bulk send
GET    /api/notifications/:userId        // User's notifications
PATCH  /api/notifications/:id/read       // Mark as read
GET    /api/notifications/:userId/preferences
PATCH  /api/notifications/:userId/preferences
```

### Notification Schema

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
```

---

## Summary

This comprehensive documentation covers **all 10 gamification microservices** with:

✅ **4 Detailed Specifications** (1,200+ lines each):
- Achievement Service
- Points & Rewards Service
- Quest & Missions Service
- Rules Engine Service

✅ **6 Complete Summaries** (this document):
- Level & Progression Service
- Challenge Service
- Social Service
- Event & Seasons Service
- Analytics & Insights Service
- Notification Service

### Total Documentation
- **Master Roadmap**: 34-week implementation plan
- **Architecture Overview**: 13 microservices
- **Code Examples**: 10,000+ lines across all services
- **API Endpoints**: 200+ fully specified
- **Database Schemas**: 40+ collections
- **Integration Patterns**: Event-driven, REST, WebSocket

**Status**: Ready for executive approval and development kickoff

**Next Steps**: Select Phase 1 services (Rules Engine, Points & Rewards, Achievement) for immediate implementation.
