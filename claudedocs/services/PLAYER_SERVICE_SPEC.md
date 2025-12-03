# Player Service Specification

## Service Overview

The Player Service is the core gamification entity service that manages player-specific game state, progression, inventory, and statistics. It acts as the central aggregation layer for player data across all gamification microservices, distinct from the Account service which handles higher-level authentication and user management.

### Responsibilities

- **Player Profile Management**: Game-specific player profiles, avatars, display names
- **Player State**: Current session state, active quests, equipped items
- **Player Inventory**: Virtual items, collectibles, consumables management
- **Player Statistics**: Aggregated gameplay metrics and performance stats
- **Player Sessions**: Session tracking, playtime analytics, activity logging
- **Cross-Service Aggregation**: Unified player view across all gamification services
- **Player Analytics**: Real-time player insights, engagement metrics
- **Player Progression**: Overall progression tracking and milestone completion

### Key Differentiators from Account Service

| Aspect | Account Service | Player Service |
|--------|----------------|----------------|
| **Scope** | Platform-wide user management | Gamification-specific player data |
| **Authentication** | Login, JWT, OAuth, 2FA | Session tokens, game authentication |
| **Data** | Email, password, KYC, billing | Avatar, stats, inventory, progression |
| **Lifecycle** | User registration to deletion | Game onboarding to retirement |
| **Multi-tenancy** | One account across all clients | Player profiles per client/game |

### Technology Stack

- **Framework**: NestJS 10.4.15
- **Database**: MongoDB 8.0+ (primary), Redis 7.0+ (caching)
- **ODM**: Mongoose 8.9+
- **Message Broker**: RabbitMQ / Kafka (event streaming)
- **Cache**: Redis with TTL-based invalidation
- **API Style**: REST (primary), GraphQL (optional for complex queries)

---

## API Specification

### Player Profile Endpoints

#### 1. Create Player Profile
```http
POST /api/v1/players
Authorization: Bearer {accountToken}
Content-Type: application/json

{
  "accountId": "acc_123456",
  "clientId": "client_game1",
  "displayName": "DragonSlayer42",
  "avatar": {
    "url": "https://cdn.example.com/avatars/dragon.png",
    "frameId": "frame_legendary_001"
  },
  "preferredLanguage": "en",
  "timezone": "America/New_York",
  "metadata": {
    "platform": "ios",
    "deviceId": "device_abc123",
    "appVersion": "2.1.0"
  }
}
```

**Response** (201 Created):
```json
{
  "playerId": "player_1234567890",
  "accountId": "acc_123456",
  "clientId": "client_game1",
  "displayName": "DragonSlayer42",
  "level": 1,
  "experience": 0,
  "avatar": {
    "url": "https://cdn.example.com/avatars/dragon.png",
    "frameId": "frame_legendary_001"
  },
  "stats": {
    "totalPlaytime": 0,
    "gamesPlayed": 0,
    "lastLoginAt": "2025-11-30T10:00:00Z"
  },
  "createdAt": "2025-11-30T10:00:00Z",
  "updatedAt": "2025-11-30T10:00:00Z"
}
```

#### 2. Get Player Profile
```http
GET /api/v1/players/{playerId}
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "accountId": "acc_123456",
  "clientId": "client_game1",
  "displayName": "DragonSlayer42",
  "level": 25,
  "experience": 125000,
  "experienceToNextLevel": 5000,
  "avatar": {
    "url": "https://cdn.example.com/avatars/dragon.png",
    "frameId": "frame_legendary_001"
  },
  "title": "Legendary Hero",
  "stats": {
    "totalPlaytime": 360000,
    "gamesPlayed": 1543,
    "winRate": 0.67,
    "achievements": 89,
    "questsCompleted": 234,
    "lastLoginAt": "2025-11-30T10:00:00Z",
    "loginStreak": 14
  },
  "inventory": {
    "slots": 100,
    "usedSlots": 47,
    "items": 47
  },
  "currency": {
    "gold": 25000,
    "gems": 450,
    "premiumCurrency": 120
  },
  "badges": ["beta_tester", "early_adopter", "guild_leader"],
  "createdAt": "2025-01-15T08:00:00Z",
  "updatedAt": "2025-11-30T10:00:00Z"
}
```

#### 3. Update Player Profile
```http
PATCH /api/v1/players/{playerId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "DragonMaster99",
  "avatar": {
    "url": "https://cdn.example.com/avatars/phoenix.png"
  },
  "title": "Phoenix Rider",
  "preferredLanguage": "es"
}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "displayName": "DragonMaster99",
  "avatar": {
    "url": "https://cdn.example.com/avatars/phoenix.png",
    "frameId": "frame_legendary_001"
  },
  "title": "Phoenix Rider",
  "updatedAt": "2025-11-30T10:05:00Z"
}
```

#### 4. Get Players by Account
```http
GET /api/v1/accounts/{accountId}/players
Authorization: Bearer {accountToken}
```

**Response** (200 OK):
```json
{
  "accountId": "acc_123456",
  "players": [
    {
      "playerId": "player_1234567890",
      "clientId": "client_game1",
      "displayName": "DragonMaster99",
      "level": 25,
      "lastLoginAt": "2025-11-30T10:00:00Z"
    },
    {
      "playerId": "player_9876543210",
      "clientId": "client_game2",
      "displayName": "SpaceExplorer",
      "level": 12,
      "lastLoginAt": "2025-11-28T15:30:00Z"
    }
  ],
  "total": 2
}
```

---

### Player Stats Endpoints

#### 5. Get Player Stats
```http
GET /api/v1/players/{playerId}/stats
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "stats": {
    "gameplay": {
      "totalPlaytime": 360000,
      "sessionsPlayed": 456,
      "averageSessionDuration": 789,
      "gamesPlayed": 1543,
      "gamesWon": 1034,
      "gamesLost": 509,
      "winRate": 0.67
    },
    "progression": {
      "level": 25,
      "experience": 125000,
      "prestigeLevel": 2,
      "skillPoints": 47
    },
    "achievements": {
      "total": 150,
      "unlocked": 89,
      "completionRate": 0.59,
      "rareAchievements": 12,
      "legendaryAchievements": 3
    },
    "social": {
      "friends": 45,
      "guildMembers": 28,
      "giftsGiven": 123,
      "giftsReceived": 98
    },
    "economy": {
      "totalGoldEarned": 450000,
      "totalGoldSpent": 425000,
      "totalGemsEarned": 1200,
      "totalGemsSpent": 750,
      "itemsPurchased": 234,
      "itemsSold": 156
    },
    "engagement": {
      "loginStreak": 14,
      "longestLoginStreak": 45,
      "dailyQuestsCompleted": 178,
      "eventsParticipated": 23
    }
  },
  "rankings": {
    "global": 1247,
    "regional": 89,
    "guild": 5
  },
  "updatedAt": "2025-11-30T10:00:00Z"
}
```

#### 6. Update Player Stats
```http
POST /api/v1/players/{playerId}/stats
Authorization: Bearer {token}
Content-Type: application/json

{
  "category": "gameplay",
  "updates": {
    "gamesPlayed": { "$inc": 1 },
    "gamesWon": { "$inc": 1 },
    "totalPlaytime": { "$inc": 1200 }
  }
}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "category": "gameplay",
  "stats": {
    "gamesPlayed": 1544,
    "gamesWon": 1035,
    "totalPlaytime": 361200,
    "winRate": 0.6704
  },
  "updatedAt": "2025-11-30T10:30:00Z"
}
```

---

### Player Inventory Endpoints

#### 7. Get Player Inventory
```http
GET /api/v1/players/{playerId}/inventory
Authorization: Bearer {token}
Query: ?category=consumable&rarity=legendary&page=1&limit=50
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "inventory": {
    "slots": 100,
    "usedSlots": 47,
    "items": [
      {
        "itemId": "item_health_potion_001",
        "name": "Greater Health Potion",
        "category": "consumable",
        "rarity": "rare",
        "quantity": 25,
        "maxStack": 99,
        "equipped": false,
        "acquiredAt": "2025-11-20T12:00:00Z",
        "metadata": {
          "effect": "Restores 500 HP",
          "cooldown": 30
        }
      },
      {
        "itemId": "item_sword_legendary_003",
        "name": "Dragonbane Sword",
        "category": "weapon",
        "rarity": "legendary",
        "quantity": 1,
        "maxStack": 1,
        "equipped": true,
        "slot": "mainHand",
        "acquiredAt": "2025-11-15T18:30:00Z",
        "metadata": {
          "attack": 450,
          "durability": 95,
          "enchantments": ["fire_damage_3", "critical_strike_2"]
        }
      }
    ],
    "filters": {
      "category": "consumable",
      "rarity": "legendary"
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 47,
      "pages": 1
    }
  }
}
```

#### 8. Add Item to Inventory
```http
POST /api/v1/players/{playerId}/inventory/items
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemId": "item_shield_epic_012",
  "quantity": 1,
  "source": "quest_reward",
  "sourceId": "quest_dragon_slayer",
  "metadata": {
    "defense": 320,
    "durability": 100
  }
}
```

**Response** (201 Created):
```json
{
  "playerId": "player_1234567890",
  "itemId": "item_shield_epic_012",
  "name": "Dragon Scale Shield",
  "category": "armor",
  "rarity": "epic",
  "quantity": 1,
  "equipped": false,
  "acquiredAt": "2025-11-30T10:45:00Z",
  "source": "quest_reward",
  "inventory": {
    "usedSlots": 48,
    "totalSlots": 100
  }
}
```

#### 9. Remove Item from Inventory
```http
DELETE /api/v1/players/{playerId}/inventory/items/{itemId}
Authorization: Bearer {token}
Query: ?quantity=5
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "itemId": "item_health_potion_001",
  "quantityRemoved": 5,
  "remainingQuantity": 20,
  "reason": "consumed",
  "inventory": {
    "usedSlots": 47,
    "totalSlots": 100
  }
}
```

#### 10. Equip Item
```http
POST /api/v1/players/{playerId}/inventory/items/{itemId}/equip
Authorization: Bearer {token}
Content-Type: application/json

{
  "slot": "mainHand"
}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "itemId": "item_sword_legendary_003",
  "equipped": true,
  "slot": "mainHand",
  "previouslyEquipped": {
    "itemId": "item_sword_rare_045",
    "unequipped": true
  },
  "totalStats": {
    "attack": 450,
    "defense": 320,
    "health": 1200
  }
}
```

#### 11. Unequip Item
```http
POST /api/v1/players/{playerId}/inventory/items/{itemId}/unequip
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "itemId": "item_sword_legendary_003",
  "equipped": false,
  "slot": null,
  "totalStats": {
    "attack": 0,
    "defense": 320,
    "health": 1200
  }
}
```

---

### Player Session Endpoints

#### 12. Start Player Session
```http
POST /api/v1/players/{playerId}/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "platform": "ios",
  "deviceId": "device_abc123",
  "appVersion": "2.1.0",
  "ipAddress": "192.168.1.100",
  "metadata": {
    "screenResolution": "1920x1080",
    "connectionType": "wifi"
  }
}
```

**Response** (201 Created):
```json
{
  "sessionId": "session_1234567890",
  "playerId": "player_1234567890",
  "startedAt": "2025-11-30T10:00:00Z",
  "platform": "ios",
  "deviceId": "device_abc123",
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-11-30T18:00:00Z"
}
```

#### 13. End Player Session
```http
POST /api/v1/players/{playerId}/sessions/{sessionId}/end
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "user_logout",
  "stats": {
    "gamesPlayed": 5,
    "experienceGained": 2500,
    "goldEarned": 1200
  }
}
```

**Response** (200 OK):
```json
{
  "sessionId": "session_1234567890",
  "playerId": "player_1234567890",
  "startedAt": "2025-11-30T10:00:00Z",
  "endedAt": "2025-11-30T12:30:00Z",
  "duration": 9000,
  "stats": {
    "gamesPlayed": 5,
    "experienceGained": 2500,
    "goldEarned": 1200
  },
  "reason": "user_logout"
}
```

#### 14. Get Active Sessions
```http
GET /api/v1/players/{playerId}/sessions/active
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "activeSessions": [
    {
      "sessionId": "session_1234567890",
      "platform": "ios",
      "deviceId": "device_abc123",
      "startedAt": "2025-11-30T10:00:00Z",
      "lastActivityAt": "2025-11-30T12:25:00Z",
      "duration": 8700
    }
  ],
  "total": 1
}
```

#### 15. Get Session History
```http
GET /api/v1/players/{playerId}/sessions/history
Authorization: Bearer {token}
Query: ?startDate=2025-11-01&endDate=2025-11-30&page=1&limit=20
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "sessions": [
    {
      "sessionId": "session_1234567890",
      "startedAt": "2025-11-30T10:00:00Z",
      "endedAt": "2025-11-30T12:30:00Z",
      "duration": 9000,
      "platform": "ios",
      "stats": {
        "gamesPlayed": 5,
        "experienceGained": 2500
      }
    }
  ],
  "aggregates": {
    "totalSessions": 456,
    "totalPlaytime": 360000,
    "averageSessionDuration": 789
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 456,
    "pages": 23
  }
}
```

---

### Player State Endpoints

#### 16. Get Player State
```http
GET /api/v1/players/{playerId}/state
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "state": {
    "location": {
      "mapId": "world_map_001",
      "zoneId": "zone_dragon_peaks",
      "coordinates": { "x": 1250, "y": 3400, "z": 150 }
    },
    "activeQuests": [
      {
        "questId": "quest_dragon_slayer",
        "progress": 0.75,
        "objectives": [
          { "id": "obj_1", "completed": true },
          { "id": "obj_2", "completed": true },
          { "id": "obj_3", "completed": true },
          { "id": "obj_4", "completed": false }
        ]
      }
    ],
    "activeBuffs": [
      {
        "buffId": "buff_strength_potion",
        "expiresAt": "2025-11-30T11:00:00Z",
        "effect": { "attack": 50 }
      }
    ],
    "equippedItems": {
      "mainHand": "item_sword_legendary_003",
      "offHand": "item_shield_epic_012",
      "head": "item_helmet_rare_034",
      "chest": "item_armor_epic_021"
    },
    "cooldowns": [
      {
        "abilityId": "ability_dragon_strike",
        "expiresAt": "2025-11-30T10:35:00Z"
      }
    ]
  },
  "updatedAt": "2025-11-30T10:30:00Z"
}
```

#### 17. Update Player State
```http
PATCH /api/v1/players/{playerId}/state
Authorization: Bearer {token}
Content-Type: application/json

{
  "location": {
    "mapId": "world_map_001",
    "zoneId": "zone_crystal_cavern",
    "coordinates": { "x": 2100, "y": 4500, "z": 50 }
  },
  "activeBuffs": {
    "$push": {
      "buffId": "buff_defense_aura",
      "expiresAt": "2025-11-30T12:00:00Z",
      "effect": { "defense": 75 }
    }
  }
}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "state": {
    "location": {
      "mapId": "world_map_001",
      "zoneId": "zone_crystal_cavern",
      "coordinates": { "x": 2100, "y": 4500, "z": 50 }
    },
    "activeBuffs": [
      {
        "buffId": "buff_strength_potion",
        "expiresAt": "2025-11-30T11:00:00Z",
        "effect": { "attack": 50 }
      },
      {
        "buffId": "buff_defense_aura",
        "expiresAt": "2025-11-30T12:00:00Z",
        "effect": { "defense": 75 }
      }
    ]
  },
  "updatedAt": "2025-11-30T10:32:00Z"
}
```

---

### Player Progression Endpoints

#### 18. Get Player Progression
```http
GET /api/v1/players/{playerId}/progression
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "progression": {
    "level": {
      "current": 25,
      "experience": 125000,
      "experienceToNextLevel": 5000,
      "totalExperienceRequired": 130000,
      "progress": 0.96
    },
    "prestige": {
      "level": 2,
      "experienceInPrestige": 25000,
      "benefits": {
        "xpMultiplier": 1.2,
        "goldMultiplier": 1.15,
        "exclusiveItems": ["prestige_frame_002", "prestige_badge_002"]
      }
    },
    "skillTree": {
      "totalPoints": 100,
      "spentPoints": 53,
      "availablePoints": 47,
      "branches": {
        "combat": 25,
        "magic": 15,
        "support": 13
      }
    },
    "milestones": {
      "total": 50,
      "completed": 28,
      "nextMilestone": {
        "id": "milestone_level_30",
        "requirement": "Reach level 30",
        "progress": 0.83,
        "reward": {
          "gold": 5000,
          "item": "legendary_chest_001"
        }
      }
    }
  },
  "updatedAt": "2025-11-30T10:30:00Z"
}
```

#### 19. Award Experience
```http
POST /api/v1/players/{playerId}/progression/experience
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 2500,
  "source": "quest_completion",
  "sourceId": "quest_dragon_slayer",
  "multipliers": {
    "prestige": 1.2,
    "event": 1.5,
    "boost": 1.1
  }
}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "experienceAwarded": 2500,
  "multipliers": {
    "prestige": 1.2,
    "event": 1.5,
    "boost": 1.1,
    "total": 1.98
  },
  "totalExperienceAwarded": 4950,
  "previousLevel": 25,
  "currentLevel": 26,
  "leveledUp": true,
  "rewards": {
    "skillPoints": 3,
    "gold": 1000,
    "items": ["level_up_chest_026"]
  },
  "progression": {
    "experience": 129950,
    "experienceToNextLevel": 10050,
    "progress": 0.93
  }
}
```

---

### Player Analytics Endpoints

#### 20. Get Player Engagement
```http
GET /api/v1/players/{playerId}/analytics/engagement
Authorization: Bearer {token}
Query: ?period=30d
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "period": "30d",
  "engagement": {
    "loginDays": 28,
    "loginRate": 0.93,
    "averageSessionsPerDay": 3.2,
    "averageSessionDuration": 789,
    "totalPlaytime": 84000,
    "loginStreak": {
      "current": 14,
      "longest": 45
    },
    "activityDistribution": {
      "quests": 0.35,
      "pvp": 0.25,
      "social": 0.20,
      "economy": 0.15,
      "exploration": 0.05
    },
    "peakPlaytimes": [
      { "hour": 19, "averageMinutes": 120 },
      { "hour": 14, "averageMinutes": 95 },
      { "hour": 21, "averageMinutes": 85 }
    ]
  },
  "trends": {
    "playtimeChange": 0.15,
    "sessionFrequencyChange": 0.08,
    "engagementScore": 87
  }
}
```

#### 21. Get Player Retention
```http
GET /api/v1/players/{playerId}/analytics/retention
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "retention": {
    "accountAge": 320,
    "activeDays": 287,
    "retentionRate": 0.896,
    "cohort": "2025-01",
    "retentionCurve": [
      { "day": 1, "active": true },
      { "day": 7, "active": true },
      { "day": 30, "active": true },
      { "day": 90, "active": true }
    ],
    "churnRisk": {
      "score": 0.15,
      "level": "low",
      "indicators": {
        "recentActivity": "high",
        "progressionRate": "normal",
        "socialEngagement": "high"
      }
    }
  },
  "predictions": {
    "day30Retention": 0.92,
    "day60Retention": 0.88,
    "day90Retention": 0.85
  }
}
```

#### 22. Get Player Segmentation
```http
GET /api/v1/players/{playerId}/analytics/segment
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "segments": [
    {
      "id": "whale",
      "name": "High Spender",
      "criteria": {
        "totalSpend": { "$gte": 500 }
      },
      "match": true
    },
    {
      "id": "hardcore_gamer",
      "name": "Hardcore Gamer",
      "criteria": {
        "averageDailyPlaytime": { "$gte": 180 }
      },
      "match": true
    },
    {
      "id": "social_butterfly",
      "name": "Social Player",
      "criteria": {
        "friends": { "$gte": 20 },
        "guildMember": true
      },
      "match": true
    }
  ],
  "primarySegment": "whale",
  "playerPersona": {
    "playstyle": "competitive",
    "spendingBehavior": "high",
    "socialEngagement": "high",
    "contentPreference": ["pvp", "endgame"]
  }
}
```

---

### Bulk Operations

#### 23. Bulk Update Players
```http
POST /api/v1/players/bulk/update
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "filters": {
    "clientId": "client_game1",
    "level": { "$gte": 20, "$lte": 30 }
  },
  "updates": {
    "currency.gold": { "$inc": 5000 }
  },
  "reason": "compensation_event_bug"
}
```

**Response** (200 OK):
```json
{
  "operation": "bulk_update",
  "matched": 1247,
  "modified": 1247,
  "reason": "compensation_event_bug",
  "executedAt": "2025-11-30T11:00:00Z"
}
```

#### 24. Bulk Award Items
```http
POST /api/v1/players/bulk/items
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "playerIds": ["player_123", "player_456", "player_789"],
  "items": [
    {
      "itemId": "item_compensation_package_001",
      "quantity": 1
    }
  ],
  "reason": "server_downtime_compensation"
}
```

**Response** (200 OK):
```json
{
  "operation": "bulk_award_items",
  "playersAffected": 3,
  "itemsAwarded": [
    {
      "itemId": "item_compensation_package_001",
      "quantity": 3
    }
  ],
  "reason": "server_downtime_compensation",
  "executedAt": "2025-11-30T11:05:00Z"
}
```

---

### Admin Endpoints

#### 25. Search Players
```http
GET /api/v1/admin/players/search
Authorization: Bearer {adminToken}
Query: ?displayName=Dragon&minLevel=20&clientId=client_game1
```

**Response** (200 OK):
```json
{
  "players": [
    {
      "playerId": "player_1234567890",
      "displayName": "DragonMaster99",
      "accountId": "acc_123456",
      "level": 25,
      "clientId": "client_game1",
      "lastLoginAt": "2025-11-30T10:00:00Z",
      "status": "active"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

#### 26. Ban Player
```http
POST /api/v1/admin/players/{playerId}/ban
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "reason": "cheating",
  "duration": 604800,
  "note": "Third-party software detected"
}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "banned": true,
  "bannedAt": "2025-11-30T11:10:00Z",
  "bannedUntil": "2025-12-07T11:10:00Z",
  "reason": "cheating",
  "note": "Third-party software detected"
}
```

#### 27. Reset Player Progress
```http
POST /api/v1/admin/players/{playerId}/reset
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "resetType": "partial",
  "components": ["inventory", "quests"],
  "keepCurrency": true,
  "keepLevel": false,
  "reason": "player_request_account_reset"
}
```

**Response** (200 OK):
```json
{
  "playerId": "player_1234567890",
  "resetComponents": ["inventory", "quests"],
  "preserved": {
    "currency": {
      "gold": 25000,
      "gems": 450
    }
  },
  "reset": {
    "level": 1,
    "experience": 0,
    "inventoryItems": 0,
    "activeQuests": 0
  },
  "executedAt": "2025-11-30T11:15:00Z"
}
```

---

## Database Design

### MongoDB Collections

#### 1. Players Collection

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'players', timestamps: true })
export class Player extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string; // player_1234567890

  @Prop({ required: true, index: true })
  accountId: string; // References Account service

  @Prop({ required: true, index: true })
  clientId: string; // Multi-tenancy

  @Prop({ required: true, minlength: 3, maxlength: 20 })
  displayName: string;

  @Prop({ default: 1, min: 1 })
  level: number;

  @Prop({ default: 0, min: 0 })
  experience: number;

  @Prop({ type: Object })
  avatar: {
    url: string;
    frameId?: string;
    customization?: Record<string, any>;
  };

  @Prop()
  title?: string;

  @Prop({ type: Object, default: {} })
  currency: {
    gold?: number;
    gems?: number;
    premiumCurrency?: number;
    [key: string]: number;
  };

  @Prop({ type: Object })
  stats: {
    totalPlaytime: number; // seconds
    sessionsPlayed: number;
    gamesPlayed: number;
    gamesWon?: number;
    winRate?: number;
    achievements?: number;
    questsCompleted?: number;
    lastLoginAt: Date;
    loginStreak?: number;
    [key: string]: any;
  };

  @Prop({ type: Array, default: [] })
  badges: string[];

  @Prop()
  preferredLanguage?: string;

  @Prop()
  timezone?: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ default: 'active', enum: ['active', 'banned', 'suspended', 'deleted'] })
  status: string;

  @Prop()
  bannedUntil?: Date;

  @Prop()
  bannedReason?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ default: 1 })
  __v: number;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);

// Indexes
PlayerSchema.index({ accountId: 1, clientId: 1 }); // Find all players for account in client
PlayerSchema.index({ clientId: 1, level: -1 }); // Leaderboards
PlayerSchema.index({ displayName: 'text' }); // Search by name
PlayerSchema.index({ 'stats.lastLoginAt': -1 }); // Recent activity queries
PlayerSchema.index({ status: 1, clientId: 1 }); // Active players per client
```

#### 2. PlayerInventory Collection

```typescript
@Schema({ collection: 'player_inventory', timestamps: true })
export class PlayerInventory extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  playerId: string;

  @Prop({ required: true, index: true })
  itemId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['weapon', 'armor', 'consumable', 'material', 'cosmetic', 'quest_item'] })
  category: string;

  @Prop({ enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' })
  rarity: string;

  @Prop({ default: 1, min: 1 })
  quantity: number;

  @Prop({ default: 1 })
  maxStack: number;

  @Prop({ default: false })
  equipped: boolean;

  @Prop()
  slot?: string; // mainHand, offHand, head, chest, etc.

  @Prop()
  acquiredAt: Date;

  @Prop()
  source?: string; // quest_reward, shop_purchase, craft, loot

  @Prop()
  sourceId?: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  expiresAt?: Date; // For temporary items

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PlayerInventorySchema = SchemaFactory.createForClass(PlayerInventory);

// Indexes
PlayerInventorySchema.index({ playerId: 1, itemId: 1 });
PlayerInventorySchema.index({ playerId: 1, equipped: 1 }); // Get equipped items
PlayerInventorySchema.index({ playerId: 1, category: 1 }); // Filter by category
PlayerInventorySchema.index({ playerId: 1, rarity: 1 }); // Filter by rarity
PlayerInventorySchema.index({ expiresAt: 1 }, { sparse: true }); // TTL index for temporary items
```

#### 3. PlayerSessions Collection

```typescript
@Schema({ collection: 'player_sessions', timestamps: true })
export class PlayerSession extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  playerId: string;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  endedAt?: Date;

  @Prop()
  duration?: number; // seconds

  @Prop({ required: true })
  platform: string; // ios, android, web, desktop

  @Prop()
  deviceId?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Object })
  stats: {
    gamesPlayed?: number;
    experienceGained?: number;
    goldEarned?: number;
    questsCompleted?: number;
    [key: string]: any;
  };

  @Prop()
  reason?: string; // user_logout, timeout, kicked, crash

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PlayerSessionSchema = SchemaFactory.createForClass(PlayerSession);

// Indexes
PlayerSessionSchema.index({ playerId: 1, startedAt: -1 }); // Recent sessions
PlayerSessionSchema.index({ playerId: 1, endedAt: 1 }); // Active sessions (endedAt = null)
PlayerSessionSchema.index({ startedAt: 1 }); // Time-based queries
PlayerSessionSchema.index({ platform: 1, startedAt: -1 }); // Platform analytics
```

#### 4. PlayerState Collection

```typescript
@Schema({ collection: 'player_state', timestamps: true })
export class PlayerState extends Document {
  @Prop({ required: true, unique: true, index: true })
  playerId: string;

  @Prop({ type: Object })
  location: {
    mapId: string;
    zoneId: string;
    coordinates: { x: number; y: number; z: number };
  };

  @Prop({ type: Array, default: [] })
  activeQuests: Array<{
    questId: string;
    startedAt: Date;
    progress: number;
    objectives: Array<{ id: string; completed: boolean; progress?: number }>;
  }>;

  @Prop({ type: Array, default: [] })
  activeBuffs: Array<{
    buffId: string;
    appliedAt: Date;
    expiresAt: Date;
    effect: Record<string, any>;
  }>;

  @Prop({ type: Object, default: {} })
  equippedItems: {
    mainHand?: string;
    offHand?: string;
    head?: string;
    chest?: string;
    legs?: string;
    feet?: string;
    accessory1?: string;
    accessory2?: string;
  };

  @Prop({ type: Array, default: [] })
  cooldowns: Array<{
    abilityId: string;
    expiresAt: Date;
  }>;

  @Prop({ type: Object })
  temporaryData: Record<string, any>; // Session-specific ephemeral state

  @Prop()
  updatedAt: Date;
}

export const PlayerStateSchema = SchemaFactory.createForClass(PlayerState);

// Indexes
PlayerStateSchema.index({ 'location.mapId': 1, 'location.zoneId': 1 }); // Location queries
```

#### 5. PlayerProgression Collection

```typescript
@Schema({ collection: 'player_progression', timestamps: true })
export class PlayerProgression extends Document {
  @Prop({ required: true, unique: true, index: true })
  playerId: string;

  @Prop({ type: Object })
  prestige: {
    level: number;
    experienceInPrestige: number;
    totalResets: number;
    benefits: {
      xpMultiplier: number;
      goldMultiplier: number;
      exclusiveItems: string[];
    };
  };

  @Prop({ type: Object })
  skillTree: {
    totalPoints: number;
    spentPoints: number;
    availablePoints: number;
    branches: Record<string, number>;
    skills: Array<{
      skillId: string;
      level: number;
      unlockedAt: Date;
    }>;
  };

  @Prop({ type: Array, default: [] })
  milestones: Array<{
    milestoneId: string;
    completed: boolean;
    completedAt?: Date;
    progress: number;
  }>;

  @Prop({ type: Object })
  seasonalProgress: {
    seasonId: string;
    level: number;
    experience: number;
    tier: number;
    premiumPass: boolean;
  };

  @Prop()
  updatedAt: Date;
}

export const PlayerProgressionSchema = SchemaFactory.createForClass(PlayerProgression);
```

---

## NestJS Implementation

### Service Architecture

```typescript
// src/player/player.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { PlayerStatsService } from './services/player-stats.service';
import { PlayerInventoryService } from './services/player-inventory.service';
import { PlayerSessionService } from './services/player-session.service';
import { PlayerStateService } from './services/player-state.service';
import { PlayerProgressionService } from './services/player-progression.service';
import { PlayerAnalyticsService } from './services/player-analytics.service';

import { Player, PlayerSchema } from './schemas/player.schema';
import { PlayerInventory, PlayerInventorySchema } from './schemas/player-inventory.schema';
import { PlayerSession, PlayerSessionSchema } from './schemas/player-session.schema';
import { PlayerState, PlayerStateSchema } from './schemas/player-state.schema';
import { PlayerProgression, PlayerProgressionSchema } from './schemas/player-progression.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: PlayerInventory.name, schema: PlayerInventorySchema },
      { name: PlayerSession.name, schema: PlayerSessionSchema },
      { name: PlayerState.name, schema: PlayerStateSchema },
      { name: PlayerProgression.name, schema: PlayerProgressionSchema },
    ]),
    BullModule.registerQueue(
      { name: 'player-events' },
      { name: 'player-analytics' },
      { name: 'session-cleanup' },
    ),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000,
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [PlayerController],
  providers: [
    PlayerService,
    PlayerStatsService,
    PlayerInventoryService,
    PlayerSessionService,
    PlayerStateService,
    PlayerProgressionService,
    PlayerAnalyticsService,
  ],
  exports: [
    PlayerService,
    PlayerStatsService,
    PlayerInventoryService,
    PlayerSessionService,
    PlayerStateService,
    PlayerProgressionService,
  ],
})
export class PlayerModule {}
```

### Core Player Service

```typescript
// src/player/player.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { Player } from './schemas/player.schema';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';

@Injectable()
export class PlayerService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<Player>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private eventEmitter: EventEmitter2,
    @InjectQueue('player-events') private playerEventsQueue: Queue,
  ) {}

  async createPlayer(createPlayerDto: CreatePlayerDto): Promise<Player> {
    // Check if player already exists for this account + client
    const existingPlayer = await this.playerModel.findOne({
      accountId: createPlayerDto.accountId,
      clientId: createPlayerDto.clientId,
    });

    if (existingPlayer) {
      throw new ConflictException(
        `Player already exists for account ${createPlayerDto.accountId} in client ${createPlayerDto.clientId}`,
      );
    }

    // Validate display name uniqueness per client
    const nameExists = await this.playerModel.findOne({
      clientId: createPlayerDto.clientId,
      displayName: createPlayerDto.displayName,
    });

    if (nameExists) {
      throw new ConflictException(`Display name "${createPlayerDto.displayName}" is already taken`);
    }

    const player = await this.playerModel.create({
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...createPlayerDto,
      level: 1,
      experience: 0,
      currency: {
        gold: 0,
        gems: 0,
        premiumCurrency: 0,
      },
      stats: {
        totalPlaytime: 0,
        sessionsPlayed: 0,
        gamesPlayed: 0,
        lastLoginAt: new Date(),
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Emit player created event
    this.eventEmitter.emit('player.created', {
      playerId: player.id,
      accountId: player.accountId,
      clientId: player.clientId,
    });

    // Queue background tasks
    await this.playerEventsQueue.add('initialize-player-data', {
      playerId: player.id,
    });

    return player;
  }

  async getPlayerById(playerId: string): Promise<Player> {
    // Try cache first
    const cacheKey = `player:${playerId}`;
    const cached = await this.cacheManager.get<Player>(cacheKey);
    if (cached) {
      return cached;
    }

    const player = await this.playerModel.findOne({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, player, 300);

    return player;
  }

  async getPlayersByAccount(accountId: string): Promise<Player[]> {
    return this.playerModel.find({ accountId }).sort({ 'stats.lastLoginAt': -1 });
  }

  async updatePlayer(playerId: string, updatePlayerDto: UpdatePlayerDto): Promise<Player> {
    const player = await this.playerModel.findOne({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    // Check display name uniqueness if changing
    if (updatePlayerDto.displayName && updatePlayerDto.displayName !== player.displayName) {
      const nameExists = await this.playerModel.findOne({
        clientId: player.clientId,
        displayName: updatePlayerDto.displayName,
        id: { $ne: playerId },
      });

      if (nameExists) {
        throw new ConflictException(`Display name "${updatePlayerDto.displayName}" is already taken`);
      }
    }

    Object.assign(player, updatePlayerDto);
    player.updatedAt = new Date();
    await player.save();

    // Invalidate cache
    await this.cacheManager.del(`player:${playerId}`);

    // Emit update event
    this.eventEmitter.emit('player.updated', {
      playerId: player.id,
      updates: updatePlayerDto,
    });

    return player;
  }

  async updatePlayerStats(
    playerId: string,
    category: string,
    updates: Record<string, any>,
  ): Promise<Player> {
    const player = await this.getPlayerById(playerId);

    // Apply stat updates
    for (const [key, operation] of Object.entries(updates)) {
      const statPath = `stats.${key}`;

      if (operation.$inc) {
        player.stats[key] = (player.stats[key] || 0) + operation.$inc;
      } else if (operation.$set) {
        player.stats[key] = operation.$set;
      } else {
        player.stats[key] = operation;
      }
    }

    // Recalculate derived stats
    if (player.stats.gamesPlayed && player.stats.gamesWon) {
      player.stats.winRate = player.stats.gamesWon / player.stats.gamesPlayed;
    }

    player.updatedAt = new Date();
    await player.save();

    // Invalidate cache
    await this.cacheManager.del(`player:${playerId}`);

    return player;
  }

  async banPlayer(
    playerId: string,
    duration: number,
    reason: string,
    note?: string,
  ): Promise<Player> {
    const player = await this.getPlayerById(playerId);

    player.status = 'banned';
    player.bannedUntil = new Date(Date.now() + duration * 1000);
    player.bannedReason = reason;
    player.metadata = {
      ...player.metadata,
      bannedNote: note,
      bannedBy: 'admin', // Should come from auth context
      bannedAt: new Date(),
    };
    player.updatedAt = new Date();

    await player.save();

    // Invalidate cache
    await this.cacheManager.del(`player:${playerId}`);

    // Emit ban event to terminate active sessions
    this.eventEmitter.emit('player.banned', {
      playerId: player.id,
      bannedUntil: player.bannedUntil,
      reason,
    });

    return player;
  }

  async searchPlayers(filters: {
    displayName?: string;
    clientId?: string;
    minLevel?: number;
    maxLevel?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ players: Player[]; total: number }> {
    const query: any = {};

    if (filters.displayName) {
      query.$text = { $search: filters.displayName };
    }

    if (filters.clientId) {
      query.clientId = filters.clientId;
    }

    if (filters.minLevel || filters.maxLevel) {
      query.level = {};
      if (filters.minLevel) query.level.$gte = filters.minLevel;
      if (filters.maxLevel) query.level.$lte = filters.maxLevel;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [players, total] = await Promise.all([
      this.playerModel.find(query).skip(skip).limit(limit).sort({ 'stats.lastLoginAt': -1 }),
      this.playerModel.countDocuments(query),
    ]);

    return { players, total };
  }

  async bulkUpdatePlayers(
    filters: Record<string, any>,
    updates: Record<string, any>,
    reason: string,
  ): Promise<{ matched: number; modified: number }> {
    const result = await this.playerModel.updateMany(filters, {
      $set: updates,
      $currentDate: { updatedAt: true },
    });

    // Emit bulk update event
    this.eventEmitter.emit('player.bulk_updated', {
      filters,
      updates,
      reason,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  }
}
```

### Player Inventory Service

```typescript
// src/player/services/player-inventory.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PlayerInventory } from '../schemas/player-inventory.schema';
import { AddItemDto } from '../dto/inventory.dto';

@Injectable()
export class PlayerInventoryService {
  constructor(
    @InjectModel(PlayerInventory.name) private inventoryModel: Model<PlayerInventory>,
    private eventEmitter: EventEmitter2,
  ) {}

  async getInventory(
    playerId: string,
    filters?: {
      category?: string;
      rarity?: string;
      equipped?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ items: PlayerInventory[]; total: number; usedSlots: number }> {
    const query: any = { playerId };

    if (filters?.category) query.category = filters.category;
    if (filters?.rarity) query.rarity = filters.rarity;
    if (filters?.equipped !== undefined) query.equipped = filters.equipped;

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.inventoryModel.find(query).skip(skip).limit(limit).sort({ acquiredAt: -1 }),
      this.inventoryModel.countDocuments(query),
    ]);

    // Calculate used slots (stacked items count as 1 slot)
    const usedSlots = await this.inventoryModel.countDocuments({ playerId });

    return { items, total, usedSlots };
  }

  async addItem(playerId: string, addItemDto: AddItemDto): Promise<PlayerInventory> {
    // Check if item already exists (for stackable items)
    const existingItem = await this.inventoryModel.findOne({
      playerId,
      itemId: addItemDto.itemId,
      equipped: false, // Don't stack with equipped items
    });

    if (existingItem && existingItem.quantity < existingItem.maxStack) {
      // Stack with existing item
      const newQuantity = Math.min(
        existingItem.quantity + addItemDto.quantity,
        existingItem.maxStack,
      );
      existingItem.quantity = newQuantity;
      existingItem.updatedAt = new Date();
      await existingItem.save();

      this.eventEmitter.emit('inventory.item_added', {
        playerId,
        itemId: addItemDto.itemId,
        quantity: addItemDto.quantity,
        stacked: true,
      });

      return existingItem;
    }

    // Create new inventory entry
    const inventoryItem = await this.inventoryModel.create({
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      ...addItemDto,
      equipped: false,
      acquiredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.eventEmitter.emit('inventory.item_added', {
      playerId,
      itemId: addItemDto.itemId,
      quantity: addItemDto.quantity,
      stacked: false,
    });

    return inventoryItem;
  }

  async removeItem(
    playerId: string,
    itemId: string,
    quantity: number = 1,
    reason?: string,
  ): Promise<{ quantityRemoved: number; remainingQuantity: number }> {
    const item = await this.inventoryModel.findOne({ playerId, itemId, equipped: false });

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found in player inventory`);
    }

    if (item.quantity < quantity) {
      throw new BadRequestException(
        `Insufficient quantity. Requested: ${quantity}, Available: ${item.quantity}`,
      );
    }

    const remainingQuantity = item.quantity - quantity;

    if (remainingQuantity === 0) {
      // Remove item completely
      await this.inventoryModel.deleteOne({ _id: item._id });
    } else {
      // Reduce quantity
      item.quantity = remainingQuantity;
      item.updatedAt = new Date();
      await item.save();
    }

    this.eventEmitter.emit('inventory.item_removed', {
      playerId,
      itemId,
      quantityRemoved: quantity,
      remainingQuantity,
      reason,
    });

    return { quantityRemoved: quantity, remainingQuantity };
  }

  async equipItem(
    playerId: string,
    itemId: string,
    slot: string,
  ): Promise<{ equipped: PlayerInventory; unequipped?: PlayerInventory }> {
    const item = await this.inventoryModel.findOne({ playerId, itemId });

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found in player inventory`);
    }

    if (item.category === 'consumable' || item.category === 'material') {
      throw new BadRequestException(`Cannot equip ${item.category} items`);
    }

    // Unequip currently equipped item in the same slot
    const currentlyEquipped = await this.inventoryModel.findOne({
      playerId,
      equipped: true,
      slot,
    });

    if (currentlyEquipped) {
      currentlyEquipped.equipped = false;
      currentlyEquipped.slot = undefined;
      currentlyEquipped.updatedAt = new Date();
      await currentlyEquipped.save();
    }

    // Equip new item
    item.equipped = true;
    item.slot = slot;
    item.updatedAt = new Date();
    await item.save();

    this.eventEmitter.emit('inventory.item_equipped', {
      playerId,
      itemId,
      slot,
      previouslyEquipped: currentlyEquipped?.itemId,
    });

    return {
      equipped: item,
      unequipped: currentlyEquipped || undefined,
    };
  }

  async unequipItem(playerId: string, itemId: string): Promise<PlayerInventory> {
    const item = await this.inventoryModel.findOne({ playerId, itemId, equipped: true });

    if (!item) {
      throw new NotFoundException(`Equipped item ${itemId} not found`);
    }

    item.equipped = false;
    const previousSlot = item.slot;
    item.slot = undefined;
    item.updatedAt = new Date();
    await item.save();

    this.eventEmitter.emit('inventory.item_unequipped', {
      playerId,
      itemId,
      slot: previousSlot,
    });

    return item;
  }

  async getEquippedItems(playerId: string): Promise<Record<string, PlayerInventory>> {
    const equippedItems = await this.inventoryModel.find({ playerId, equipped: true });

    const result: Record<string, PlayerInventory> = {};
    for (const item of equippedItems) {
      if (item.slot) {
        result[item.slot] = item;
      }
    }

    return result;
  }
}
```

### Player Session Service

```typescript
// src/player/services/player-session.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PlayerSession } from '../schemas/player-session.schema';
import { StartSessionDto, EndSessionDto } from '../dto/session.dto';

@Injectable()
export class PlayerSessionService {
  private readonly SESSION_TIMEOUT = 3600; // 1 hour in seconds

  constructor(
    @InjectModel(PlayerSession.name) private sessionModel: Model<PlayerSession>,
    private eventEmitter: EventEmitter2,
  ) {}

  async startSession(playerId: string, startSessionDto: StartSessionDto): Promise<PlayerSession> {
    // End any existing active sessions for this player
    await this.endActiveSessions(playerId, 'new_session_started');

    const session = await this.sessionModel.create({
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      ...startSessionDto,
      startedAt: new Date(),
      stats: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.eventEmitter.emit('session.started', {
      sessionId: session.id,
      playerId,
      platform: startSessionDto.platform,
    });

    return session;
  }

  async endSession(playerId: string, sessionId: string, endSessionDto: EndSessionDto): Promise<PlayerSession> {
    const session = await this.sessionModel.findOne({ id: sessionId, playerId });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found for player ${playerId}`);
    }

    if (session.endedAt) {
      throw new BadRequestException(`Session ${sessionId} already ended`);
    }

    session.endedAt = new Date();
    session.duration = Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
    session.stats = endSessionDto.stats || {};
    session.reason = endSessionDto.reason;
    session.updatedAt = new Date();

    await session.save();

    this.eventEmitter.emit('session.ended', {
      sessionId: session.id,
      playerId,
      duration: session.duration,
      stats: session.stats,
      reason: session.reason,
    });

    return session;
  }

  async getActiveSessions(playerId: string): Promise<PlayerSession[]> {
    return this.sessionModel.find({
      playerId,
      endedAt: null,
    });
  }

  async getSessionHistory(
    playerId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      platform?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ sessions: PlayerSession[]; total: number; aggregates: any }> {
    const query: any = { playerId };

    if (filters?.startDate || filters?.endDate) {
      query.startedAt = {};
      if (filters.startDate) query.startedAt.$gte = filters.startDate;
      if (filters.endDate) query.startedAt.$lte = filters.endDate;
    }

    if (filters?.platform) {
      query.platform = filters.platform;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [sessions, total, aggregates] = await Promise.all([
      this.sessionModel.find(query).skip(skip).limit(limit).sort({ startedAt: -1 }),
      this.sessionModel.countDocuments(query),
      this.calculateSessionAggregates(playerId, query),
    ]);

    return { sessions, total, aggregates };
  }

  private async calculateSessionAggregates(playerId: string, query: any): Promise<any> {
    const result = await this.sessionModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalPlaytime: { $sum: '$duration' },
          averageSessionDuration: { $avg: '$duration' },
        },
      },
    ]);

    return result[0] || {
      totalSessions: 0,
      totalPlaytime: 0,
      averageSessionDuration: 0,
    };
  }

  private async endActiveSessions(playerId: string, reason: string): Promise<void> {
    const activeSessions = await this.getActiveSessions(playerId);

    for (const session of activeSessions) {
      session.endedAt = new Date();
      session.duration = Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
      session.reason = reason;
      session.updatedAt = new Date();
      await session.save();
    }
  }

  // Cleanup stale sessions (no activity for SESSION_TIMEOUT)
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupStaleSessions() {
    const timeoutThreshold = new Date(Date.now() - this.SESSION_TIMEOUT * 1000);

    const staleSessions = await this.sessionModel.find({
      endedAt: null,
      updatedAt: { $lt: timeoutThreshold },
    });

    for (const session of staleSessions) {
      session.endedAt = new Date();
      session.duration = Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
      session.reason = 'timeout';
      session.updatedAt = new Date();
      await session.save();

      this.eventEmitter.emit('session.timeout', {
        sessionId: session.id,
        playerId: session.playerId,
        duration: session.duration,
      });
    }

    if (staleSessions.length > 0) {
      console.log(`Cleaned up ${staleSessions.length} stale sessions`);
    }
  }
}
```

### Player Progression Service

```typescript
// src/player/services/player-progression.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Player } from '../schemas/player.schema';
import { PlayerProgression } from '../schemas/player-progression.schema';
import { AwardExperienceDto } from '../dto/progression.dto';

@Injectable()
export class PlayerProgressionService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<Player>,
    @InjectModel(PlayerProgression.name) private progressionModel: Model<PlayerProgression>,
    private eventEmitter: EventEmitter2,
  ) {}

  async getProgression(playerId: string): Promise<any> {
    const [player, progression] = await Promise.all([
      this.playerModel.findOne({ id: playerId }),
      this.progressionModel.findOne({ playerId }),
    ]);

    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    const experienceToNextLevel = this.calculateExperienceForLevel(player.level + 1) - player.experience;

    return {
      playerId,
      progression: {
        level: {
          current: player.level,
          experience: player.experience,
          experienceToNextLevel,
          totalExperienceRequired: this.calculateExperienceForLevel(player.level + 1),
          progress: player.experience / this.calculateExperienceForLevel(player.level + 1),
        },
        prestige: progression?.prestige || {
          level: 0,
          experienceInPrestige: 0,
          totalResets: 0,
          benefits: {
            xpMultiplier: 1.0,
            goldMultiplier: 1.0,
            exclusiveItems: [],
          },
        },
        skillTree: progression?.skillTree || {
          totalPoints: player.level - 1,
          spentPoints: 0,
          availablePoints: player.level - 1,
          branches: {},
          skills: [],
        },
        milestones: progression?.milestones || [],
      },
      updatedAt: player.updatedAt,
    };
  }

  async awardExperience(playerId: string, awardExperienceDto: AwardExperienceDto): Promise<any> {
    const player = await this.playerModel.findOne({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    const progression = await this.progressionModel.findOne({ playerId });

    // Calculate total multiplier
    const multipliers = awardExperienceDto.multipliers || {};
    const totalMultiplier =
      (multipliers.prestige || 1.0) *
      (multipliers.event || 1.0) *
      (multipliers.boost || 1.0);

    const totalExperienceAwarded = Math.floor(awardExperienceDto.amount * totalMultiplier);

    const previousLevel = player.level;
    const previousExperience = player.experience;

    player.experience += totalExperienceAwarded;

    // Check for level ups
    const levelUpRewards: any = {
      skillPoints: 0,
      gold: 0,
      items: [],
    };

    while (player.experience >= this.calculateExperienceForLevel(player.level + 1)) {
      player.level += 1;

      // Award level up rewards
      levelUpRewards.skillPoints += 3;
      levelUpRewards.gold += player.level * 100;
      levelUpRewards.items.push(`level_up_chest_${String(player.level).padStart(3, '0')}`);

      // Update skill tree points
      if (progression) {
        progression.skillTree.totalPoints += 3;
        progression.skillTree.availablePoints += 3;
      }
    }

    const leveledUp = player.level > previousLevel;

    player.updatedAt = new Date();
    await player.save();

    if (progression) {
      await progression.save();
    }

    if (leveledUp) {
      this.eventEmitter.emit('player.level_up', {
        playerId,
        previousLevel,
        currentLevel: player.level,
        rewards: levelUpRewards,
      });
    }

    this.eventEmitter.emit('player.experience_awarded', {
      playerId,
      amount: awardExperienceDto.amount,
      totalAwarded: totalExperienceAwarded,
      source: awardExperienceDto.source,
      leveledUp,
    });

    return {
      playerId,
      experienceAwarded: awardExperienceDto.amount,
      multipliers: {
        ...multipliers,
        total: totalMultiplier,
      },
      totalExperienceAwarded,
      previousLevel,
      currentLevel: player.level,
      leveledUp,
      rewards: leveledUp ? levelUpRewards : undefined,
      progression: {
        experience: player.experience,
        experienceToNextLevel: this.calculateExperienceForLevel(player.level + 1) - player.experience,
        progress: player.experience / this.calculateExperienceForLevel(player.level + 1),
      },
    };
  }

  private calculateExperienceForLevel(level: number): number {
    // Exponential curve: XP = 100 * (1.1 ^ level)
    return Math.floor(100 * Math.pow(1.1, level));
  }
}
```

---

## Event-Driven Architecture

### Player Events

```typescript
// src/player/events/player.events.ts
export const PLAYER_EVENTS = {
  // Profile events
  CREATED: 'player.created',
  UPDATED: 'player.updated',
  DELETED: 'player.deleted',
  BANNED: 'player.banned',
  UNBANNED: 'player.unbanned',

  // Progression events
  LEVEL_UP: 'player.level_up',
  EXPERIENCE_AWARDED: 'player.experience_awarded',
  PRESTIGE: 'player.prestige',

  // Inventory events
  ITEM_ADDED: 'inventory.item_added',
  ITEM_REMOVED: 'inventory.item_removed',
  ITEM_EQUIPPED: 'inventory.item_equipped',
  ITEM_UNEQUIPPED: 'inventory.item_unequipped',

  // Session events
  SESSION_STARTED: 'session.started',
  SESSION_ENDED: 'session.ended',
  SESSION_TIMEOUT: 'session.timeout',

  // Currency events
  CURRENCY_AWARDED: 'player.currency_awarded',
  CURRENCY_SPENT: 'player.currency_spent',

  // Bulk operations
  BULK_UPDATED: 'player.bulk_updated',
};
```

### Event Listeners

```typescript
// src/player/listeners/player-stats.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PlayerStatsService } from '../services/player-stats.service';

@Injectable()
export class PlayerStatsListener {
  constructor(private playerStatsService: PlayerStatsService) {}

  @OnEvent('session.ended')
  async handleSessionEnded(payload: any) {
    await this.playerStatsService.updateStats(payload.playerId, {
      totalPlaytime: { $inc: payload.duration },
      sessionsPlayed: { $inc: 1 },
      lastLoginAt: { $set: new Date() },
    });

    // Update stats from session data
    if (payload.stats?.gamesPlayed) {
      await this.playerStatsService.updateStats(payload.playerId, {
        gamesPlayed: { $inc: payload.stats.gamesPlayed },
      });
    }
  }

  @OnEvent('player.level_up')
  async handleLevelUp(payload: any) {
    // Could trigger achievements, notifications, etc.
    console.log(`Player ${payload.playerId} leveled up to ${payload.currentLevel}`);
  }

  @OnEvent('inventory.item_equipped')
  async handleItemEquipped(payload: any) {
    // Recalculate player stats based on equipped items
    await this.playerStatsService.recalculateEquipmentStats(payload.playerId);
  }
}
```

---

## Testing

### Unit Tests

```typescript
// src/player/player.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bull';

import { PlayerService } from './player.service';
import { Player } from './schemas/player.schema';

describe('PlayerService', () => {
  let service: PlayerService;
  let playerModel: any;
  let cacheManager: any;
  let eventEmitter: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: getModelToken(Player.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            updateMany: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: getQueueToken('player-events'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    playerModel = module.get(getModelToken(Player.name));
    cacheManager = module.get(CACHE_MANAGER);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('createPlayer', () => {
    it('should create a new player', async () => {
      const createPlayerDto = {
        accountId: 'acc_123',
        clientId: 'client_game1',
        displayName: 'TestPlayer',
        avatar: { url: 'https://example.com/avatar.png' },
      };

      playerModel.findOne.mockResolvedValue(null); // No existing player
      playerModel.create.mockResolvedValue({
        id: 'player_123',
        ...createPlayerDto,
        level: 1,
        experience: 0,
      });

      const result = await service.createPlayer(createPlayerDto);

      expect(result.id).toBe('player_123');
      expect(result.displayName).toBe('TestPlayer');
      expect(eventEmitter.emit).toHaveBeenCalledWith('player.created', expect.any(Object));
    });

    it('should throw ConflictException if player already exists', async () => {
      const createPlayerDto = {
        accountId: 'acc_123',
        clientId: 'client_game1',
        displayName: 'TestPlayer',
      };

      playerModel.findOne.mockResolvedValue({ id: 'player_existing' });

      await expect(service.createPlayer(createPlayerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getPlayerById', () => {
    it('should return cached player if available', async () => {
      const cachedPlayer = { id: 'player_123', displayName: 'CachedPlayer' };
      cacheManager.get.mockResolvedValue(cachedPlayer);

      const result = await service.getPlayerById('player_123');

      expect(result).toEqual(cachedPlayer);
      expect(playerModel.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const dbPlayer = { id: 'player_123', displayName: 'DBPlayer' };
      cacheManager.get.mockResolvedValue(null);
      playerModel.findOne.mockResolvedValue(dbPlayer);

      const result = await service.getPlayerById('player_123');

      expect(result).toEqual(dbPlayer);
      expect(cacheManager.set).toHaveBeenCalledWith('player:player_123', dbPlayer, 300);
    });

    it('should throw NotFoundException if player not found', async () => {
      cacheManager.get.mockResolvedValue(null);
      playerModel.findOne.mockResolvedValue(null);

      await expect(service.getPlayerById('player_nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePlayerStats', () => {
    it('should increment stats correctly', async () => {
      const player = {
        id: 'player_123',
        stats: {
          gamesPlayed: 100,
          gamesWon: 60,
          totalPlaytime: 10000,
        },
        save: jest.fn(),
      };

      jest.spyOn(service, 'getPlayerById').mockResolvedValue(player as any);

      await service.updatePlayerStats('player_123', 'gameplay', {
        gamesPlayed: { $inc: 1 },
        gamesWon: { $inc: 1 },
      });

      expect(player.stats.gamesPlayed).toBe(101);
      expect(player.stats.gamesWon).toBe(61);
      expect(player.stats.winRate).toBeCloseTo(0.604, 3);
      expect(player.save).toHaveBeenCalled();
    });
  });
});
```

### Integration Tests

```typescript
// test/player.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Player API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let playerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate and get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/players (POST)', () => {
    it('should create a new player', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/players')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId: 'acc_test',
          clientId: 'client_game1',
          displayName: 'E2ETestPlayer',
          avatar: { url: 'https://example.com/avatar.png' },
        })
        .expect(201);

      expect(response.body).toHaveProperty('playerId');
      expect(response.body.displayName).toBe('E2ETestPlayer');
      expect(response.body.level).toBe(1);

      playerId = response.body.playerId;
    });
  });

  describe('/api/v1/players/:playerId (GET)', () => {
    it('should retrieve player profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/players/${playerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.playerId).toBe(playerId);
      expect(response.body.displayName).toBe('E2ETestPlayer');
    });
  });

  describe('/api/v1/players/:playerId/progression/experience (POST)', () => {
    it('should award experience and level up player', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/players/${playerId}/progression/experience`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000,
          source: 'quest_completion',
          sourceId: 'quest_test',
        })
        .expect(200);

      expect(response.body.leveledUp).toBe(true);
      expect(response.body.currentLevel).toBeGreaterThan(1);
      expect(response.body).toHaveProperty('rewards');
    });
  });

  describe('/api/v1/players/:playerId/inventory/items (POST)', () => {
    it('should add item to inventory', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/players/${playerId}/inventory/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: 'item_test_sword',
          name: 'Test Sword',
          category: 'weapon',
          rarity: 'rare',
          quantity: 1,
          source: 'test',
        })
        .expect(201);

      expect(response.body.itemId).toBe('item_test_sword');
      expect(response.body.equipped).toBe(false);
    });
  });

  describe('/api/v1/players/:playerId/sessions (POST)', () => {
    it('should start a player session', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/players/${playerId}/sessions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'web',
          deviceId: 'test_device',
          appVersion: '1.0.0',
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.playerId).toBe(playerId);
      expect(response.body).toHaveProperty('sessionToken');
    });
  });
});
```

---

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build player

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/player ./dist

ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

CMD ["node", "dist/main.js"]
```

### Kubernetes Deployment

```yaml
# k8s/player-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: player-service
  namespace: gamification
spec:
  replicas: 3
  selector:
    matchLabels:
      app: player-service
  template:
    metadata:
      labels:
        app: player-service
    spec:
      containers:
        - name: player
          image: gamification/player-service:latest
          ports:
            - containerPort: 3005
          env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: uri
            - name: REDIS_HOST
              value: redis-service
            - name: REDIS_PORT
              value: "6379"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3005
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3005
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: player-service
  namespace: gamification
spec:
  selector:
    app: player-service
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3005
  type: ClusterIP
```

---

## Performance Optimization

### Caching Strategy

```typescript
// src/player/strategies/player-cache.strategy.ts
export class PlayerCacheStrategy {
  private readonly TTL_PLAYER_PROFILE = 300; // 5 minutes
  private readonly TTL_PLAYER_STATS = 180; // 3 minutes
  private readonly TTL_PLAYER_INVENTORY = 120; // 2 minutes
  private readonly TTL_PLAYER_STATE = 60; // 1 minute

  getCacheKey(type: string, identifier: string): string {
    return `player:${type}:${identifier}`;
  }

  getTTL(type: string): number {
    switch (type) {
      case 'profile':
        return this.TTL_PLAYER_PROFILE;
      case 'stats':
        return this.TTL_PLAYER_STATS;
      case 'inventory':
        return this.TTL_PLAYER_INVENTORY;
      case 'state':
        return this.TTL_PLAYER_STATE;
      default:
        return 60;
    }
  }

  invalidatePattern(pattern: string): void {
    // Implement cache invalidation logic
    // Could use Redis SCAN + DEL or cache manager invalidation
  }
}
```

### Database Indexing

```typescript
// Indexes defined in schemas ensure optimal query performance:
// - player.id (unique): O(1) player lookups
// - player.accountId + clientId: Fast account player queries
// - player.clientId + level: Leaderboard queries
// - playerInventory.playerId + equipped: Fast equipped items lookup
// - playerSession.playerId + endedAt: Active session queries
```

---

## Monitoring & Observability

### Metrics

```typescript
// src/player/metrics/player.metrics.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PlayerMetrics {
  private playerCreated: Counter;
  private playerLoginDuration: Histogram;
  private activePlayersGauge: Gauge;
  private inventoryOperationDuration: Histogram;

  constructor() {
    this.playerCreated = new Counter({
      name: 'player_created_total',
      help: 'Total players created',
      labelNames: ['clientId'],
    });

    this.playerLoginDuration = new Histogram({
      name: 'player_login_duration_seconds',
      help: 'Player login duration',
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.activePlayersGauge = new Gauge({
      name: 'active_players',
      help: 'Number of active players',
      labelNames: ['clientId'],
    });

    this.inventoryOperationDuration = new Histogram({
      name: 'inventory_operation_duration_seconds',
      help: 'Inventory operation duration',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
    });
  }

  incrementPlayerCreated(clientId: string): void {
    this.playerCreated.inc({ clientId });
  }

  recordLoginDuration(duration: number): void {
    this.playerLoginDuration.observe(duration);
  }

  setActivePlayers(clientId: string, count: number): void {
    this.activePlayersGauge.set({ clientId }, count);
  }

  recordInventoryOperation(operation: string, duration: number): void {
    this.inventoryOperationDuration.observe({ operation }, duration);
  }
}
```

---

## Security Considerations

### Authorization

```typescript
// src/player/guards/player-ownership.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlayerService } from '../player.service';

@Injectable()
export class PlayerOwnershipGuard implements CanActivate {
  constructor(private playerService: PlayerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const playerId = request.params.playerId;
    const accountId = request.user.accountId; // From JWT

    const player = await this.playerService.getPlayerById(playerId);

    if (player.accountId !== accountId) {
      throw new ForbiddenException('You do not own this player');
    }

    return true;
  }
}
```

### Input Validation

```typescript
// src/player/dto/player.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsObject } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  displayName: string;

  @IsObject()
  @IsOptional()
  avatar?: {
    url: string;
    frameId?: string;
  };

  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
```

---

## Summary

The **Player Service** is the foundational gamification entity service that:

- Manages player profiles, stats, inventory, sessions, and progression
- Provides a unified player view across all gamification microservices
- Operates separately from Account service (authentication/user management)
- Supports multi-tenancy (multiple clients/games per account)
- Implements comprehensive caching for performance
- Uses event-driven architecture for cross-service communication
- Provides real-time player state management
- Includes robust analytics and segmentation capabilities
- Scales horizontally with stateless service design
- Maintains data integrity with optimistic locking and transactions

**Key Metrics**:
- 27 REST API endpoints
- 5 MongoDB collections with optimized indexes
- Multi-tier caching (Redis + in-memory)
- Event-driven architecture with 15+ event types
- Comprehensive testing (unit + integration + e2e)
- Production-ready deployment configurations
