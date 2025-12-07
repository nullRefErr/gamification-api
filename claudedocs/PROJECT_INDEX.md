# Gamification API - Project Documentation Index

> **Last Updated**: 2025-11-28
> **Version**: 0.1.0
> **Framework**: NestJS + Nx Monorepo

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Applications](#applications)
4. [Libraries](#libraries)
5. [Development Guidelines](#development-guidelines)
6. [Infrastructure](#infrastructure)
7. [API Reference](#api-reference)
8. [Quick Links](#quick-links)

---

## 🎯 Project Overview

**Gamification API** is a foundational gamification platform providing core game elements for SaaS, Mobile, and PaaS applications. Built with NestJS in an Nx monorepo architecture.

### Key Features
- ✅ MongoDB integration with Mongoose
- ✅ Redis caching with IORedis
- ✅ TypeBox schema validation
- ✅ Interceptors and middleware infrastructure
- ✅ Structured logging with Pino
- ⌛ JWT authentication (planned)
- ⌛ Leaderboard operations (planned)
- ⌛ API key authorization (planned)

### Technology Stack
- **Framework**: NestJS 9.x
- **Monorepo**: Nx 15.9.2
- **Database**: MongoDB with Mongoose 7.x
- **Cache**: Redis with IORedis 5.x
- **Validation**: TypeBox 0.27.x
- **Logging**: Pino 8.x via nestjs-pino
- **Runtime**: Node.js ≥14.21
- **Language**: TypeScript 4.9.5

---

## 🏗️ Architecture

### Monorepo Structure
```
gamification-api/
├── apps/              # Microservice applications
│   ├── account/       # User account management
│   ├── gateway/       # API gateway
│   └── leaderboard/   # Leaderboard service
├── libs/              # Shared libraries
│   ├── config/        # Configuration management
│   ├── core/          # Core types and interfaces
│   ├── decorators/    # Custom NestJS decorators
│   ├── helpers/       # Utility helpers
│   ├── interceptors/  # HTTP interceptors
│   ├── middlewares/   # Express middlewares
│   ├── models/        # Data models (TypeBox + Mongoose)
│   ├── modules/       # Shared NestJS modules
│   └── utility/       # Utility services
└── [config files]     # Project configuration
```

### Design Patterns
- **RoRo (Receive Object, Return Object)**: Function parameter pattern
- **Single Responsibility**: Component-level separation
- **Dependency Injection**: NestJS IoC container
- **Schema-First**: TypeBox definitions → Mongoose entities

### Cross-Cutting Concerns
- **Logging**: [`@gamification-api/interceptors`](../libs/interceptors) + [`@gamification-api/utility`](../libs/utility)
- **Validation**: [`@gamification-api/models`](../libs/models) (TypeBox schemas)
- **Request Metadata**: [`@gamification-api/middlewares`](../libs/middlewares) (client + request metadata)
- **Configuration**: [`@gamification-api/config`](../libs/config) + [`@gamification-api/modules`](../libs/modules)

---

## 📱 Applications

### Gateway (`apps/gateway`)
**Purpose**: API gateway and routing layer
**Port**: TBD
**Dependencies**: `@gamification-api/modules`

**Key Files**:
- [`src/main.ts`](../apps/gateway/src/main.ts) - Bootstrap
- [`src/app/app.module.ts`](../apps/gateway/src/app/app.module.ts) - Root module
- [`src/app/app.controller.ts`](../apps/gateway/src/app/app.controller.ts) - Controllers

---

### Account (`apps/account`)
**Purpose**: User account and authentication management
**Port**: TBD
**Dependencies**: `@gamification-api/modules`

**Key Files**:
- [`src/main.ts`](../apps/account/src/main.ts) - Bootstrap
- [`src/modules/app.module.ts`](../apps/account/src/modules/app.module.ts) - Root module
- [`src/modules/app.controller.ts`](../apps/account/src/modules/app.controller.ts) - Controllers

**Planned Features**:
- JWT token authorization
- User registration and authentication
- Account activation workflows

---

### Leaderboard (`apps/leaderboard`)
**Purpose**: Leaderboard and ranking operations
**Port**: TBD
**Status**: Planned implementation

**Key Files**:
- [`src/main.ts`](../apps/leaderboard/src/main.ts) - Bootstrap
- [`src/app/app.module.ts`](../apps/leaderboard/src/app/app.module.ts) - Root module
- [`src/app/app.controller.ts`](../apps/leaderboard/src/app/app.controller.ts) - Controllers

---

## 📚 Libraries

### Core Infrastructure

#### `@gamification-api/core`
**Path**: [`libs/core`](../libs/core)
**Purpose**: Core types, interfaces, and utilities

**Exports**:
- `BaseRequestDTO` - Base request structure ([`src/interfaces/base-request.dto.ts`](../libs/core/src/interfaces/base-request.dto.ts))
- `BaseResponseDTO` - Base response structure ([`src/interfaces/base-response.dto.ts`](../libs/core/src/interfaces/base-response.dto.ts))
- `ExactType<T, U>` - Type checking utility ([`src/common/type-check.ts`](../libs/core/src/common/type-check.ts))

**Usage**:
```typescript
import { BaseRequestDTO, BaseResponseDTO, ExactType } from '@gamification-api/core';
```

---

#### `@gamification-api/models`
**Path**: [`libs/models`](../libs/models)
**Purpose**: Data models with TypeBox definitions and Mongoose entities

**Structure**:
- `definitions/` - TypeBox schemas ([`src/definitions/`](../libs/models/src/definitions/))
- `entities/` - Mongoose entities ([`src/entities/`](../libs/models/src/entities/))
- `request/` - Request DTOs ([`src/request/`](../libs/models/src/request/))

**Available Models**:
- **User** ([definition](../libs/models/src/definitions/user.ts) | [entity](../libs/models/src/entities/user.ts))
  - Fields: email, name, surname, isActivated, isEULAAccepted, isBanned, refCode
  - Timestamps: createdAt, updatedAt

- **Credentials** ([definition](../libs/models/src/definitions/credentials.ts) | [entity](../libs/models/src/entities/credentials.ts))

**Usage**:
```typescript
import { User, UserEntity, UserEntitySchema } from '@gamification-api/models';
```

---

#### `@gamification-api/modules`
**Path**: [`libs/modules`](../libs/modules)
**Purpose**: Shared NestJS module configurations

**Exports**:
- `GlobalConfigModule` - Config module ([`src/lib/config.module.ts`](../libs/modules/src/lib/config.module.ts))
- `GlobalMongoModule` - MongoDB module ([`src/lib/mongo.module.ts`](../libs/modules/src/lib/mongo.module.ts))
- `GlobalCacheModule` - Redis cache module ([`src/lib/cache.module.ts`](../libs/modules/src/lib/cache.module.ts))

**Usage**:
```typescript
import { GlobalConfigModule, GlobalMongoModule, GlobalCacheModule } from '@gamification-api/modules';

@Module({
  imports: [GlobalConfigModule, GlobalMongoModule, GlobalCacheModule]
})
```

---

### Request Processing

#### `@gamification-api/interceptors`
**Path**: [`libs/interceptors`](../libs/interceptors)
**Purpose**: HTTP interceptors for request/response logging

**Key Component**: `LoggerInterceptor` ([`src/lib/logger.interceptor.ts`](../libs/interceptors/src/lib/logger.interceptor.ts))

**Features**:
- Request/response logging with Pino
- Request timing measurement
- Request ID tracking (`x-api-req-id` header)

**Usage**:
```typescript
import { LoggerInterceptor } from '@gamification-api/interceptors';

@UseInterceptors(LoggerInterceptor)
export class AppController {}
```

**Log Format**:
```javascript
// REQUEST
{ type: 'REQUEST', reqId: '...', path: '/api/...', body: {...} }

// RESPONSE
{ type: 'RESPONSE', reqId: '...', path: '/api/...', body: {...}, reqTimeMS: 150 }
```

---

#### `@gamification-api/middlewares`
**Path**: [`libs/middlewares`](../libs/middlewares)
**Purpose**: Express middleware for request metadata enrichment

**Available Middlewares**:

1. **ClientMetaMiddleware** ([`src/client-meta.middleware.ts`](../libs/middlewares/src/client-meta.middleware.ts))
   - Extracts client IP from `x-forwarded-for` or socket
   - Adds `req.clientMeta = { ip }`

2. **ReqMetaMiddleware** ([`src/req-meta.middleware.ts`](../libs/middlewares/src/req-meta.middleware.ts))
   - Adds request metadata
   - Sets `req.reqMeta`

3. **MethodFilterMiddleware** ([`src/method-filter.middleware.ts`](../libs/middlewares/src/method-filter.middleware.ts))
   - HTTP method filtering

**Usage**:
```typescript
import { clientMetaMiddleware } from '@gamification-api/middlewares';

export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(clientMetaMiddleware).forRoutes('*');
  }
}
```

---

#### `@gamification-api/decorators`
**Path**: [`libs/decorators`](../libs/decorators)
**Purpose**: Custom NestJS parameter decorators

**Key Decorator**: `CustomBodyParser` ([`src/custom-body-parser.decorator.ts`](../libs/decorators/src/custom-body-parser.decorator.ts))

**Features**:
- Combines request body, reqMeta, and clientMeta
- Returns unified request context object

**Usage**:
```typescript
import { CustomBodyParser } from '@gamification-api/decorators';

@Post()
async create(@CustomBodyParser() data: any) {
  // data = { body, reqMeta, client }
}
```

---

### Utilities

#### `@gamification-api/utility`
**Path**: [`libs/utility`](../libs/utility)
**Purpose**: Shared utility services

**Key Service**: `LoggerService` ([`src/lib/logger.service.ts`](../libs/utility/src/lib/logger.service.ts))

**Features**:
- Pino logger singleton
- Static factory method

**Usage**:
```typescript
import { LoggerService } from '@gamification-api/utility';

LoggerService.logger().info({ message: 'Log entry' });
```

---

#### `@gamification-api/helpers`
**Path**: [`libs/helpers`](../libs/helpers)
**Purpose**: Utility helper functions

**Files**:
- [`src/lib/helpers.ts`](../libs/helpers/src/lib/helpers.ts)

---

#### `@gamification-api/config`
**Path**: [`libs/config`](../libs/config)
**Purpose**: Configuration management utilities

---

## 🛠️ Development Guidelines

### Code Standards

#### Naming Conventions
- **Variables/Functions**: `camelCase`
- **No shorthands**: Use descriptive names
- **Language**: English only

#### Control Flow
- **Avoid synchronous loops**: Use `map()`, `filter()`, `forEach()`
- **No `else` statements**: Use guard clauses
- **Switch over if-else**: For equality comparisons

#### Function Patterns
- **RoRo Pattern**: Functions receive and return objects
- **Single Responsibility**: One function, one purpose
- **Refactor complexity**: Split multi-responsibility functions

#### Comments
- **Notes**: `// NOTE: explanation`
- **Todos**: `// TODO: task description`

#### Dependencies
- **No caret (`^`)** in package.json - use exact versions

### Git Workflow

#### Branch Naming
```
feature/[category]-[feature]     # New features
bugfix/[category]-[description]  # Bug fixes
chore/[category]-[feature]       # Documentation/config
```

#### Commit Convention
```
feature([category]-[feature])/[heading]: [description]
bugfix([category])/[heading]: [description]
chore([category])/[heading]: [description]
```

**Example**: `feature(infrastructure-auth)/jwt: implement token generation`

### Testing
```bash
# Run all tests
nx test

# Test specific library
nx test models
nx test interceptors

# Run linting
nx lint [project-name]
```

### Building
```bash
# Build all projects
nx build

# Build specific app
nx build account
nx build gateway
```

---

## 🚀 Infrastructure

### Docker Setup
- **Base Dockerfile**: [`base.Dockerfile`](../base.Dockerfile)
- **Compose**: [`docker-compose.yml`](../docker-compose.yml)

**Services**:
- MongoDB
- Redis
- Application containers

### Database: MongoDB
**Connection**: Via `@nestjs/mongoose` and `GlobalMongoModule`

**Entity Pattern**:
1. Define TypeBox schema in `libs/models/src/definitions/`
2. Create Mongoose entity in `libs/models/src/entities/`
3. Use `ExactType<Entity, Definition>` for type safety

### Cache: Redis
**Connection**: Via `@nestjs-modules/ioredis` and `GlobalCacheModule`

---

## 📖 API Reference

### Request Flow
```
Client Request
  ↓
ClientMetaMiddleware (IP extraction)
  ↓
ReqMetaMiddleware (metadata enrichment)
  ↓
LoggerInterceptor (request logging)
  ↓
Controller (@CustomBodyParser decorator)
  ↓
Service Layer
  ↓
LoggerInterceptor (response logging + timing)
  ↓
Client Response
```

### Common Request Structure
```typescript
interface EnrichedRequest {
  body: any;           // Original request body
  reqMeta: {           // Request metadata
    // Added by ReqMetaMiddleware
  };
  clientMeta: {        // Client metadata
    ip: string;        // Client IP address
  };
}
```

### Response Structure
Uses `BaseResponseDTO` from `@gamification-api/core`:
```typescript
// See libs/core/src/interfaces/base-response.dto.ts
```

---

## 🔗 Quick Links

### Documentation
- [Main README](../README.md)
- [Roadmap](../README.md#roadmap)
- [Contribution Guidelines](../README.md#contribution)

### Library READMEs
- [Interceptors](../libs/interceptors/README.md)
- [Middlewares](../libs/middlewares/README.md)
- [Models](../libs/models/README.md)
- [Modules](../libs/modules/README.md)
- [Core](../libs/core/README.md)
- [Decorators](../libs/decorators/README.md)
- [Utility](../libs/utility/README.md)
- [Helpers](../libs/helpers/README.md)
- [Config](../libs/config/README.md)

### Configuration Files
- [package.json](../package.json) - Dependencies
- [nx.json](../nx.json) - Nx workspace config
- [tsconfig.base.json](../tsconfig.base.json) - TypeScript config
- [jest.config.ts](../jest.config.ts) - Jest config
- [.eslintrc.json](../.eslintrc.json) - ESLint config

### External Resources
- [NestJS Documentation](https://docs.nestjs.com)
- [Nx Documentation](https://nx.dev)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Mongoose Documentation](https://mongoosejs.com)

---

## 🗺️ Navigation Map

### By Concern

**Authentication & Authorization**:
- ⌛ Planned: JWT implementation in `apps/account`
- ⌛ Planned: API key authorization

**Data Models**:
- [`libs/models/src/definitions/`](../libs/models/src/definitions/) - TypeBox schemas
- [`libs/models/src/entities/`](../libs/models/src/entities/) - Mongoose entities

**Request Processing**:
- [`libs/middlewares/`](../libs/middlewares/) - Express middlewares
- [`libs/interceptors/`](../libs/interceptors/) - NestJS interceptors
- [`libs/decorators/`](../libs/decorators/) - Custom decorators

**Configuration**:
- [`libs/config/`](../libs/config/) - Config utilities
- [`libs/modules/src/lib/config.module.ts`](../libs/modules/src/lib/config.module.ts) - Config module

**Database**:
- [`libs/modules/src/lib/mongo.module.ts`](../libs/modules/src/lib/mongo.module.ts) - MongoDB module
- [`libs/modules/src/lib/cache.module.ts`](../libs/modules/src/lib/cache.module.ts) - Redis module

**Logging**:
- [`libs/utility/src/lib/logger.service.ts`](../libs/utility/src/lib/logger.service.ts) - Logger service
- [`libs/interceptors/src/lib/logger.interceptor.ts`](../libs/interceptors/src/lib/logger.interceptor.ts) - Request/response logging

**Type Safety**:
- [`libs/core/src/common/type-check.ts`](../libs/core/src/common/type-check.ts) - `ExactType` utility
- [`libs/core/src/interfaces/`](../libs/core/src/interfaces/) - Base DTOs

---

## 📊 Project Metrics

**Applications**: 3 (gateway, account, leaderboard)
**Libraries**: 9 (config, core, decorators, helpers, interceptors, middlewares, models, modules, utility)
**TypeScript Files**: ~60
**Test Coverage**: TBD
**License**: Apache 2.0

---

**Generated by**: Claude Code `/sc:index`
**Maintained by**: Development Team
