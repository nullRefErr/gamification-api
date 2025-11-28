# API Patterns & Best Practices

> **Context**: Gamification API architectural patterns and implementation guidelines
> **Last Updated**: 2025-11-28

## 📋 Table of Contents

1. [Request/Response Flow](#requestresponse-flow)
2. [Middleware Pattern](#middleware-pattern)
3. [Interceptor Pattern](#interceptor-pattern)
4. [Decorator Pattern](#decorator-pattern)
5. [Data Modeling Pattern](#data-modeling-pattern)
6. [Module Configuration Pattern](#module-configuration-pattern)
7. [Logging Pattern](#logging-pattern)
8. [Error Handling](#error-handling)

---

## 🔄 Request/Response Flow

### Complete Processing Pipeline

```
┌─────────────────┐
│  Client Request │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ ClientMetaMiddleware         │  Extract IP → req.clientMeta
├──────────────────────────────┤
│ libs/middlewares/            │
│ client-meta.middleware.ts:8  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ ReqMetaMiddleware            │  Add request metadata
├──────────────────────────────┤
│ libs/middlewares/            │
│ req-meta.middleware.ts       │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ MethodFilterMiddleware       │  HTTP method filtering (optional)
├──────────────────────────────┤
│ libs/middlewares/            │
│ method-filter.middleware.ts  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ LoggerInterceptor (REQUEST)  │  Log incoming request + start timer
├──────────────────────────────┤
│ libs/interceptors/           │
│ logger.interceptor.ts:19-24  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Controller Handler           │  @CustomBodyParser extracts unified context
├──────────────────────────────┤
│ Uses @CustomBodyParser       │
│ libs/decorators/             │
│ custom-body-parser.decorator │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Service Layer                │  Business logic execution
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ LoggerInterceptor (RESPONSE) │  Log response + request duration
├──────────────────────────────┤
│ libs/interceptors/           │
│ logger.interceptor.ts:28-36  │
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────┐
│ Client Response │
└─────────────────┘
```

### Implementation Example

**Step 1: Configure Middlewares** (in app.module.ts)
```typescript
import { MiddlewareConsumer, Module } from '@nestjs/common';
import {
  clientMetaMiddleware,
  reqMetaMiddleware,
  methodFilterMiddleware
} from '@gamification-api/middlewares';

@Module({ /* ... */ })
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(clientMetaMiddleware, reqMetaMiddleware)
      .forRoutes('*');
  }
}
```

**Step 2: Apply Interceptor** (controller or global)
```typescript
import { LoggerInterceptor } from '@gamification-api/interceptors';

// Option 1: Controller-level
@UseInterceptors(LoggerInterceptor)
@Controller('api/users')
export class UserController {}

// Option 2: Global (in main.ts)
app.useGlobalInterceptors(new LoggerInterceptor());
```

**Step 3: Use Decorator in Handler**
```typescript
import { CustomBodyParser } from '@gamification-api/decorators';

@Post('signup')
async signUp(@CustomBodyParser() data: any) {
  // data structure:
  // {
  //   body: { /* original request body */ },
  //   reqMeta: { /* request metadata */ },
  //   client: { ip: '192.168.1.1' }
  // }

  const { body, reqMeta, client } = data;
  // Process signup with full context
}
```

---

## 🔧 Middleware Pattern

### Purpose
Express middlewares enrich the request object with metadata before it reaches NestJS controllers.

### Available Middlewares

#### 1. ClientMetaMiddleware
**Location**: `libs/middlewares/src/client-meta.middleware.ts:1-11`

**Function**: Extract client IP address
```typescript
export function clientMetaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  (<any>req).clientMeta = {ip}
  next();
}
```

**Usage**:
```typescript
consumer.apply(clientMetaMiddleware).forRoutes('*');
```

**Output**: Adds `req.clientMeta = { ip: string }`

---

#### 2. ReqMetaMiddleware
**Location**: `libs/middlewares/src/req-meta.middleware.ts`

**Function**: Add request-specific metadata
```typescript
// Implementation details in source file
```

**Output**: Adds `req.reqMeta = { /* metadata */ }`

---

#### 3. MethodFilterMiddleware
**Location**: `libs/middlewares/src/method-filter.middleware.ts`

**Function**: Filter or validate HTTP methods

---

### Middleware Composition Pattern
```typescript
// Order matters: clientMeta → reqMeta → methodFilter
consumer
  .apply(
    clientMetaMiddleware,  // 1st: Extract client info
    reqMetaMiddleware,     // 2nd: Add request metadata
    methodFilterMiddleware // 3rd: Filter by HTTP method
  )
  .forRoutes('*');
```

---

## 🎯 Interceptor Pattern

### Purpose
NestJS interceptors handle cross-cutting concerns like logging, transformation, and timing.

### LoggerInterceptor Implementation

**Location**: `libs/interceptors/src/lib/logger.interceptor.ts:1-39`

**Key Features**:
- Request/response logging
- Request timing measurement
- Request ID tracking

**Implementation**:
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '@gamification-api/utility';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    const reqId = headers['x-api-req-id'];

    // Log incoming request
    LoggerService.logger().info({
      type: 'REQUEST',
      reqId,
      path: request.path,
      body: request.body,
    });

    const now = Date.now();

    // Process request and log response
    return next.handle().pipe(
      tap((response) => {
        LoggerService.logger().info({
          type: 'RESPONSE',
          reqId,
          path: request.path,
          body: response,
          reqTimeMS: Date.now() - now, // Request duration
        });
      })
    );
  }
}
```

### Log Output Format

**Request Log**:
```json
{
  "type": "REQUEST",
  "reqId": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/users/signup",
  "body": { "email": "user@example.com" }
}
```

**Response Log**:
```json
{
  "type": "RESPONSE",
  "reqId": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/users/signup",
  "body": { "success": true, "userId": "123" },
  "reqTimeMS": 150
}
```

### Request ID Header Convention
Client should send unique request ID:
```
x-api-req-id: 550e8400-e29b-41d4-a716-446655440000
```

---

## 🏷️ Decorator Pattern

### CustomBodyParser Decorator

**Location**: `libs/decorators/src/custom-body-parser.decorator.ts:1-12`

**Purpose**: Unified parameter decorator combining body + metadata

**Implementation**:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CustomBodyParser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      body: request.body,       // Original request body
      reqMeta: request.reqMeta, // From ReqMetaMiddleware
      client: request.clientMeta, // From ClientMetaMiddleware
    };
  },
);
```

### Usage in Controllers

**Basic Usage**:
```typescript
import { CustomBodyParser } from '@gamification-api/decorators';

@Post('signup')
async signUp(@CustomBodyParser() data: any) {
  const { body, reqMeta, client } = data;

  console.log(body);     // { email, password }
  console.log(client);   // { ip: '192.168.1.1' }
  console.log(reqMeta);  // { /* request metadata */ }
}
```

**With Type Safety**:
```typescript
interface EnrichedRequest<T = any> {
  body: T;
  reqMeta: any;
  client: { ip: string };
}

@Post('signup')
async signUp(@CustomBodyParser() data: EnrichedRequest<SignUpDTO>) {
  // data.body is typed as SignUpDTO
}
```

---

## 📊 Data Modeling Pattern

### Two-Layer Model Architecture

**Layer 1: TypeBox Definitions** (`libs/models/src/definitions/`)
- Runtime type validation
- Type inference for TypeScript
- Serialization schemas

**Layer 2: Mongoose Entities** (`libs/models/src/entities/`)
- Database schema
- Document types
- Implements TypeBox definitions

### Pattern Implementation

**Step 1: Define TypeBox Schema**
```typescript
// libs/models/src/definitions/user.ts
import { Static, Type } from '@sinclair/typebox';
import { MongoModel } from './common';

const TUser = Type.Object({
  ...MongoModel.properties,    // _id, createdAt, updatedAt
  email: Type.String(),
  name: Type.String(),
  surname: Type.String(),
  isActivated: Type.Boolean({ default: false }),
  isEULAAccepted: Type.Boolean({ default: false }),
  isBanned: Type.Boolean({ default: false }),
  refCode: Type.String(),
});

export type User = Static<typeof TUser>;
```

**Step 2: Create Mongoose Entity**
```typescript
// libs/models/src/entities/user.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from '../definitions';
import { ExactType } from '@gamification-api/core';

export type UserEntityDocument = UserEntity & Document;

@Schema({ timestamps: true, versionKey: false })
export class UserEntity implements ExactType<UserEntity, User> {
  @Prop()
  email: string;

  @Prop()
  name: string;

  @Prop()
  surname: string;

  @Prop()
  isActivated: boolean;

  @Prop()
  isEULAAccepted: boolean;

  @Prop()
  isBanned: boolean;

  @Prop()
  refCode: string;

  // Mongoose-managed fields
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const UserEntitySchema = SchemaFactory.createForClass(UserEntity);
```

**Step 3: Use in Service**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity, UserEntityDocument } from '@gamification-api/models';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserEntity.name)
    private userModel: Model<UserEntityDocument>
  ) {}

  async createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = new this.userModel(data);
    return user.save();
  }
}
```

### Type Safety with ExactType

**Purpose**: Ensure Mongoose entity matches TypeBox definition

**Location**: `libs/core/src/common/type-check.ts`

**Usage**:
```typescript
import { ExactType } from '@gamification-api/core';

// Compile-time check: UserEntity must match User type
export class UserEntity implements ExactType<UserEntity, User> {
  // TypeScript will error if fields don't match
}
```

---

## 🔌 Module Configuration Pattern

### Shared Module Pattern

**Location**: `libs/modules/src/lib/`

### Available Modules

#### 1. GlobalConfigModule
**File**: `config.module.ts`
**Purpose**: Application configuration management

```typescript
import { GlobalConfigModule } from '@gamification-api/modules';

@Module({
  imports: [GlobalConfigModule]
})
export class AppModule {}
```

---

#### 2. GlobalMongoModule
**File**: `mongo.module.ts`
**Purpose**: MongoDB connection and model registration

```typescript
import { GlobalMongoModule } from '@gamification-api/modules';

@Module({
  imports: [GlobalMongoModule]
})
export class AppModule {}
```

**Usage with Models**:
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GlobalMongoModule } from '@gamification-api/modules';
import { UserEntity, UserEntitySchema } from '@gamification-api/models';

@Module({
  imports: [
    GlobalMongoModule, // Base connection
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserEntitySchema }
    ])
  ]
})
export class UserModule {}
```

---

#### 3. GlobalCacheModule
**File**: `cache.module.ts`
**Purpose**: Redis cache configuration

```typescript
import { GlobalCacheModule } from '@gamification-api/modules';

@Module({
  imports: [GlobalCacheModule]
})
export class AppModule {}
```

---

## 📝 Logging Pattern

### Logger Service

**Location**: `libs/utility/src/lib/logger.service.ts:1-10`

**Implementation**:
```typescript
import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
  public static logger() {
    const adaptor = pino();
    return adaptor;
  }
}
```

### Usage Patterns

#### In Services
```typescript
import { LoggerService } from '@gamification-api/utility';

export class UserService {
  async createUser(data: any) {
    LoggerService.logger().info({
      action: 'user_creation',
      email: data.email
    });

    try {
      // ... create user
      LoggerService.logger().info({
        action: 'user_created',
        userId: user._id
      });
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

#### In Interceptors
```typescript
// See LoggerInterceptor implementation above
LoggerService.logger().info({
  type: 'REQUEST',
  reqId,
  path: request.path,
  body: request.body,
});
```

### Log Levels
```typescript
LoggerService.logger().trace({ /* trace level */ });
LoggerService.logger().debug({ /* debug level */ });
LoggerService.logger().info({ /* info level */ });
LoggerService.logger().warn({ /* warning level */ });
LoggerService.logger().error({ /* error level */ });
LoggerService.logger().fatal({ /* fatal level */ });
```

### Structured Logging Best Practices

✅ **Do**:
```typescript
// Structured data
LoggerService.logger().info({
  action: 'user_signup',
  userId: '123',
  email: 'user@example.com',
  timestamp: Date.now()
});
```

❌ **Don't**:
```typescript
// String concatenation
LoggerService.logger().info('User 123 signed up with user@example.com');
```

---

## ⚠️ Error Handling

### Recommended Error Handling Pattern

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from '@gamification-api/utility';

export class UserService {
  async createUser(data: any) {
    try {
      // Validation
      if (!data.email) {
        throw new HttpException(
          'Email is required',
          HttpStatus.BAD_REQUEST
        );
      }

      // Business logic
      const user = await this.userModel.create(data);

      LoggerService.logger().info({
        action: 'user_created',
        userId: user._id
      });

      return user;

    } catch (error) {
      // Log error with context
      LoggerService.logger().error({
        action: 'user_creation_failed',
        error: error.message,
        stack: error.stack,
        data
      });

      // Re-throw or transform
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
```

### Error Response Structure

**TODO**: Define standard error response format using `BaseResponseDTO`

Recommended structure:
```typescript
{
  success: false,
  error: {
    code: 'USER_CREATION_FAILED',
    message: 'Failed to create user',
    details: { /* additional context */ }
  },
  reqId: '550e8400-e29b-41d4-a716-446655440000'
}
```

---

## 🔍 Code References

### Key Files by Concern

**Request Processing**:
- `libs/middlewares/src/client-meta.middleware.ts:1-11` - IP extraction
- `libs/interceptors/src/lib/logger.interceptor.ts:1-39` - Request/response logging
- `libs/decorators/src/custom-body-parser.decorator.ts:1-12` - Unified context extraction

**Data Models**:
- `libs/models/src/definitions/user.ts:1-15` - TypeBox schema
- `libs/models/src/entities/user.ts:1-30` - Mongoose entity
- `libs/core/src/common/type-check.ts` - Type safety utility

**Infrastructure**:
- `libs/modules/src/lib/config.module.ts` - Configuration
- `libs/modules/src/lib/mongo.module.ts` - MongoDB
- `libs/modules/src/lib/cache.module.ts` - Redis

**Utilities**:
- `libs/utility/src/lib/logger.service.ts:1-10` - Logging service

---

**Generated by**: Claude Code `/sc:index`
**Cross-Reference**: See [PROJECT_INDEX.md](./PROJECT_INDEX.md)
