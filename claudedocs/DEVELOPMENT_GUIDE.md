# Development Guide

> **Audience**: Developers contributing to Gamification API
> **Last Updated**: 2025-11-28

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Git Workflow](#git-workflow)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥14.21
- npm (comes with Node.js)
- Docker & Docker Compose (for MongoDB and Redis)
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd gamification-api

# Install dependencies
npm install

# Start infrastructure
docker-compose up -d

# Verify setup
nx run-many --target=build --all
```

### Environment Configuration

**TODO**: Document environment variables and `.env` setup

Expected variables:
- MongoDB connection string
- Redis connection string
- Application ports
- API keys (if applicable)

---

## 🏗️ Project Structure

### Workspace Organization

```
gamification-api/
├── apps/                    # Microservice applications
│   ├── account/            # User accounts (Port: TBD)
│   ├── gateway/            # API gateway (Port: TBD)
│   └── leaderboard/        # Leaderboards (Port: TBD)
│
├── libs/                    # Shared libraries
│   ├── config/             # Configuration utilities
│   ├── core/               # Core types & interfaces
│   ├── decorators/         # NestJS decorators
│   ├── helpers/            # Utility functions
│   ├── interceptors/       # HTTP interceptors
│   ├── middlewares/        # Express middlewares
│   ├── models/             # Data models
│   ├── modules/            # Shared NestJS modules
│   └── utility/            # Utility services
│
├── docker-compose.yml      # Infrastructure setup
├── nx.json                 # Nx configuration
├── package.json            # Dependencies
└── tsconfig.base.json      # TypeScript config
```

### Nx Workspace Concepts

**Applications (`apps/`)**:
- Deployable microservices
- Each has own `main.ts` entry point
- Independent build/deploy lifecycle

**Libraries (`libs/`)**:
- Shared code across applications
- Published as `@gamification-api/*` packages
- Buildable or non-buildable

**Path Aliases**:
```typescript
// Import from any library using @gamification-api/* alias
import { LoggerService } from '@gamification-api/utility';
import { UserEntity } from '@gamification-api/models';
```

See `tsconfig.base.json` for complete alias mapping.

---

## 🔄 Development Workflow

### Day-to-Day Development

#### 1. Start Development Environment
```bash
# Start infrastructure (MongoDB + Redis)
docker-compose up -d

# Start application in watch mode
nx serve account       # Start account service
nx serve gateway       # Start gateway service
nx serve leaderboard   # Start leaderboard service
```

#### 2. Make Changes
```bash
# Create feature branch
git checkout -b feature/infrastructure-auth

# Make code changes in apps/ or libs/

# Run tests frequently
nx test <project-name>

# Run linter
nx lint <project-name>
```

#### 3. Validate Changes
```bash
# Build affected projects
nx affected:build

# Test affected projects
nx affected:test

# Lint affected projects
nx affected:lint
```

#### 4. Commit & Push
```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feature(infrastructure-auth)/jwt: implement token generation"

# Push to remote
git push origin feature/infrastructure-auth
```

### Creating New Features

#### Adding a New Library

```bash
# Generate library
nx generate @nrwl/node:library my-library

# Library created at: libs/my-library/

# Import in other code
import { MyService } from '@gamification-api/my-library';
```

#### Adding a New Application

```bash
# Generate NestJS application
nx generate @nrwl/nest:application my-app

# Application created at: apps/my-app/

# Start the app
nx serve my-app
```

#### Adding a New Model

**Step 1: Create TypeBox Definition**
```typescript
// libs/models/src/definitions/achievement.ts
import { Static, Type } from '@sinclair/typebox';
import { MongoModel } from './common';

const TAchievement = Type.Object({
  ...MongoModel.properties,
  title: Type.String(),
  description: Type.String(),
  points: Type.Number(),
  category: Type.String(),
});

export type Achievement = Static<typeof TAchievement>;
```

**Step 2: Create Mongoose Entity**
```typescript
// libs/models/src/entities/achievement.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Achievement } from '../definitions';
import { ExactType } from '@gamification-api/core';

export type AchievementEntityDocument = AchievementEntity & Document;

@Schema({ timestamps: true, versionKey: false })
export class AchievementEntity implements ExactType<AchievementEntity, Achievement> {
  @Prop() title: string;
  @Prop() description: string;
  @Prop() points: number;
  @Prop() category: string;

  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const AchievementEntitySchema = SchemaFactory.createForClass(AchievementEntity);
```

**Step 3: Export from Index**
```typescript
// libs/models/src/definitions/index.ts
export * from './achievement';

// libs/models/src/entities/index.ts
export * from './achievement';
```

**Step 4: Use in Service**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AchievementEntity, AchievementEntityDocument } from '@gamification-api/models';

@Injectable()
export class AchievementService {
  constructor(
    @InjectModel(AchievementEntity.name)
    private achievementModel: Model<AchievementEntityDocument>
  ) {}

  async create(data: Partial<AchievementEntity>): Promise<AchievementEntity> {
    const achievement = new this.achievementModel(data);
    return achievement.save();
  }
}
```

---

## 📏 Code Standards

### Naming Conventions

#### Variables & Functions
```typescript
// ✅ camelCase for variables and functions
const userCount = 10;
const getUserById = (id: string) => { /* ... */ };

// ❌ snake_case or PascalCase for variables
const user_count = 10;  // Wrong
const UserCount = 10;   // Wrong
```

#### Classes & Interfaces
```typescript
// ✅ PascalCase for classes, interfaces, types
class UserService {}
interface UserData {}
type UserRole = 'admin' | 'user';

// ❌ camelCase or snake_case
class userService {}  // Wrong
interface user_data {} // Wrong
```

#### Files
```typescript
// ✅ kebab-case for file names
user.service.ts
auth.controller.ts
custom-body-parser.decorator.ts

// ❌ PascalCase or snake_case for files
UserService.ts        // Wrong (except for React components)
auth_controller.ts    // Wrong
```

### Language & Clarity

```typescript
// ✅ Full descriptive names in English
const userAuthentication = () => { /* ... */ };
const isEmailVerified = true;

// ❌ Abbreviations or non-English
const usrAuth = () => { /* ... */ };  // Ambiguous shorthand
const emailVer = true;                // Unclear abbreviation
```

### Control Flow

#### Avoid Synchronous Loops
```typescript
// ✅ Use higher-order functions
const activeUsers = users.filter(user => user.isActive);
const userIds = users.map(user => user.id);
users.forEach(user => sendEmail(user.email));

// ❌ Synchronous loops
const activeUsers = [];
for (const user of users) {  // Avoid unless necessary
  if (user.isActive) {
    activeUsers.push(user);
  }
}
```

#### Avoid `else` Statements
```typescript
// ✅ Early returns (guard clauses)
function getUserRole(user: User): string {
  if (!user) {
    return 'guest';
  }

  if (user.isAdmin) {
    return 'admin';
  }

  return 'user';
}

// ❌ else statements
function getUserRole(user: User): string {
  if (!user) {
    return 'guest';
  } else {
    if (user.isAdmin) {
      return 'admin';
    } else {
      return 'user';
    }
  }
}
```

#### Use `switch` for Equality Checks
```typescript
// ✅ switch for multiple equality checks
function getStatusMessage(status: string): string {
  switch (status) {
    case 'active':
      return 'User is active';
    case 'pending':
      return 'User is pending';
    case 'banned':
      return 'User is banned';
    default:
      return 'Unknown status';
  }
}

// ❌ if-else chain for equality
function getStatusMessage(status: string): string {
  if (status === 'active') {
    return 'User is active';
  } else if (status === 'pending') {
    return 'User is pending';
  } else if (status === 'banned') {
    return 'User is banned';
  } else {
    return 'Unknown status';
  }
}
```

### Function Patterns

#### RoRo (Receive Object, Return Object)
```typescript
// ✅ RoRo pattern - receive object, return object
interface CreateUserParams {
  email: string;
  name: string;
  surname: string;
}

interface CreateUserResult {
  success: boolean;
  user?: User;
  error?: string;
}

function createUser({ email, name, surname }: CreateUserParams): CreateUserResult {
  // Implementation
  return { success: true, user: newUser };
}

// Usage
const result = createUser({ email: 'user@example.com', name: 'John', surname: 'Doe' });

// ❌ Multiple parameters
function createUser(email: string, name: string, surname: string): User {
  // Hard to remember parameter order
}
```

#### Single Responsibility
```typescript
// ✅ Single responsibility - one function, one job
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createUser(data: CreateUserParams): CreateUserResult {
  // Create user logic only
}

// ❌ Multiple responsibilities
function validateAndCreateUser(email: string, name: string): User {
  // Validation + creation in one function (should be split)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email');
  }
  // ... create user
}
```

### Comments

```typescript
// ✅ Use NOTE for explanatory comments
// NOTE: We use IP from x-forwarded-for for load balancer compatibility
const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

// ✅ Use TODO for planned improvements
// TODO: Add rate limiting for signup endpoint

// ❌ Don't leave uncommented TODOs in production
// Implement caching here  // Unclear responsibility
```

### Dependencies

```typescript
// package.json

// ✅ Exact versions (no caret ^)
{
  "dependencies": {
    "@nestjs/common": "9.0.0",
    "@nestjs/core": "9.0.0"
  }
}

// ❌ Caret versions (can cause version drift)
{
  "dependencies": {
    "@nestjs/common": "^9.0.0",  // Wrong
    "@nestjs/core": "^9.0.0"     // Wrong
  }
}
```

---

## 🧪 Testing

### Running Tests

```bash
# Test all projects
nx test

# Test specific project
nx test models
nx test interceptors
nx test account

# Test with coverage
nx test --coverage

# Test affected projects only
nx affected:test

# Watch mode
nx test --watch
```

### Writing Tests

**Unit Test Example** (Service):
```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test',
        surname: 'User'
      };

      const result = await service.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test',
        surname: 'User'
      };

      await expect(service.createUser(userData)).rejects.toThrow();
    });
  });
});
```

### Test Coverage Goals
- **Target**: ≥80% coverage for critical paths
- **Priority**: Services > Controllers > Utilities
- **Focus**: Business logic and data transformations

---

## 🌿 Git Workflow

### Branch Naming

```bash
# Feature branches
feature/[category]-[feature-name]
# Examples:
feature/infrastructure-auth
feature/api-leaderboard
feature/models-achievement

# Bug fix branches
bugfix/[category]-[description]
# Examples:
bugfix/auth-token-expiry
bugfix/middleware-ip-extraction

# Chore branches (docs, config, etc.)
chore/[category]-[description]
# Examples:
chore/docs-api-patterns
chore/config-eslint-rules
```

### Commit Messages

**Format**: `type([category]-[feature])/[heading]: [description]`

**Examples**:
```bash
feature(infrastructure-auth)/jwt: implement token generation
bugfix(middleware)/client-meta: fix IP extraction for IPv6
chore(docs)/api: add request flow documentation
test(services)/user: add validation test cases
refactor(models)/user: extract validation logic
```

**Commit Types**:
- `feature` - New functionality
- `bugfix` - Bug fixes
- `chore` - Documentation, configuration, dependencies
- `test` - Test additions or modifications
- `refactor` - Code restructuring without behavior change

### Workflow

```bash
# 1. Start from dev branch
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/infrastructure-auth

# 3. Make changes and commit
git add .
git commit -m "feature(infrastructure-auth)/jwt: implement token generation"

# 4. Push to remote
git push origin feature/infrastructure-auth

# 5. Create pull request
# - Target: dev branch
# - Fill in PR template (if available)
# - Request review

# 6. After approval, merge and delete branch
git checkout dev
git pull origin dev
git branch -d feature/infrastructure-auth
```

---

## 🔧 Common Tasks

### Adding Middleware to Application

```typescript
// apps/account/src/modules/app.module.ts
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { clientMetaMiddleware, reqMetaMiddleware } from '@gamification-api/middlewares';

@Module({ /* ... */ })
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(clientMetaMiddleware, reqMetaMiddleware)
      .forRoutes('*');
  }
}
```

### Adding Global Interceptor

```typescript
// apps/account/src/main.ts
import { LoggerInterceptor } from '@gamification-api/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply globally
  app.useGlobalInterceptors(new LoggerInterceptor());

  await app.listen(3000);
}
```

### Registering Mongoose Model

```typescript
// apps/account/src/modules/user/user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserEntitySchema } from '@gamification-api/models';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserEntitySchema }
    ])
  ],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
```

### Using Logger in Service

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@gamification-api/utility';

@Injectable()
export class UserService {
  async createUser(data: any) {
    LoggerService.logger().info({
      action: 'user_creation_started',
      email: data.email
    });

    try {
      // ... create user logic

      LoggerService.logger().info({
        action: 'user_created',
        userId: user._id
      });

      return user;
    } catch (error) {
      LoggerService.logger().error({
        action: 'user_creation_failed',
        error: error.message
      });
      throw error;
    }
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### "Cannot find module '@gamification-api/...'"

**Cause**: TypeScript path aliases not recognized

**Solutions**:
```bash
# 1. Restart TypeScript server (VS Code)
Cmd+Shift+P → "TypeScript: Restart TS Server"

# 2. Rebuild affected libraries
nx build <library-name>

# 3. Check tsconfig.base.json for correct path mapping
```

#### MongoDB Connection Fails

**Cause**: MongoDB container not running

**Solutions**:
```bash
# Check container status
docker ps

# Start containers
docker-compose up -d

# Check logs
docker-compose logs mongodb
```

#### Tests Failing After Model Changes

**Cause**: Model schema mismatch

**Solutions**:
```bash
# 1. Clear test cache
nx reset

# 2. Rebuild models library
nx build models

# 3. Re-run tests
nx test
```

#### Linting Errors

**Cause**: Code style violations

**Solutions**:
```bash
# Auto-fix where possible
nx lint <project-name> --fix

# Check .eslintrc.json for rules
```

---

## 📚 Additional Resources

### Internal Documentation
- [Project Index](./PROJECT_INDEX.md) - Complete project overview
- [API Patterns](./API_PATTERNS.md) - Implementation patterns
- [Main README](../README.md) - Project introduction
- [Roadmap](../README.md#roadmap) - Feature status

### External Documentation
- [NestJS Docs](https://docs.nestjs.com) - Framework reference
- [Nx Docs](https://nx.dev) - Monorepo tooling
- [TypeBox](https://github.com/sinclairzx81/typebox) - Schema validation
- [Mongoose](https://mongoosejs.com) - MongoDB ODM
- [Pino](https://getpino.io) - Logging library

### Development Tools
- [VS Code](https://code.visualstudio.com) - Recommended IDE
- [Nx Console](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console) - VS Code extension
- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI
- [Postman](https://www.postman.com) - API testing

---

**Generated by**: Claude Code `/sc:index`
**Maintained by**: Development Team
