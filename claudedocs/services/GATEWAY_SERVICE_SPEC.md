# API Gateway Service - Complete Specification
**Production-Ready NestJS API Gateway for Gamification Microservices**

> **Version**: 1.0.0
> **Current Status**: Basic implementation (needs enhancement)
> **Target Status**: Production-ready with routing, auth, rate limiting, caching
> **Last Updated**: 2025-12-04

---

## Table of Contents
1. [Service Overview](#service-overview)
2. [Current Implementation](#current-implementation)
3. [Architecture](#architecture)
4. [Routing Configuration](#routing-configuration)
5. [Authentication & Authorization](#authentication--authorization)
6. [Rate Limiting](#rate-limiting)
7. [Caching Strategy](#caching-strategy)
8. [Error Handling](#error-handling)
9. [Monitoring & Observability](#monitoring--observability)
10. [Implementation Guide](#implementation-guide)
11. [Deployment](#deployment)

---

## Service Overview

### Purpose
The API Gateway serves as the single entry point for all client requests, routing them to appropriate microservices while handling cross-cutting concerns like authentication, rate limiting, logging, and monitoring.

### Responsibilities
- **Request Routing**: Route incoming requests to appropriate microservices
- **Authentication**: Validate JWT tokens and API keys
- **Authorization**: Enforce role-based and tenant-based access control
- **Rate Limiting**: Protect services from abuse with configurable limits
- **Caching**: Cache frequently accessed resources at gateway level
- **Request/Response Transformation**: Modify requests/responses as needed
- **Logging & Tracing**: Centralized request logging with distributed tracing
- **CORS Management**: Handle cross-origin requests
- **API Versioning**: Support multiple API versions
- **Circuit Breaking**: Protect against cascading failures

### Key Features
- **Service Discovery**: Dynamic routing with Kubernetes service discovery
- **Multi-Tenancy**: Tenant isolation and routing
- **WebSocket Support**: Real-time communication routing
- **GraphQL Federation** (optional): Unified GraphQL endpoint
- **Load Balancing**: Client-side load balancing with health checks
- **Metrics Collection**: Request metrics for observability

---

## Current Implementation

### Existing Setup (apps/gateway/src/main.ts)

```typescript
// Current minimal setup
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Existing middlewares
  app.use(methodFilterMiddleware, clientMetaMiddleware, reqMetaMiddleware);
  app.useGlobalInterceptors(new LoggerInterceptor());

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
}
```

### Existing Middleware

**Client Metadata Middleware** (libs/middlewares/src/client-meta.middleware.ts):
```typescript
// Captures client IP for tracking
export function clientMetaMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  (<any>req).clientMeta = {ip}
  next();
}
```

**Logger Interceptor** (libs/interceptors/src/lib/logger.interceptor.ts):
```typescript
// Logs all requests and responses with timing
@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const reqId = request.headers['x-api-req-id'];

    LoggerService.logger().info({
      type: 'REQUEST',
      reqId,
      path: request.path,
      body: request.body,
    });

    const now = Date.now();
    return next.handle().pipe(
      tap((response) => {
        LoggerService.logger().info({
          type: 'RESPONSE',
          reqId,
          path: request.path,
          body: response,
          reqTimeMS: Date.now() - now,
        });
      })
    );
  }
}
```

### What's Missing (To Be Implemented)
- ❌ Service routing to microservices
- ❌ Authentication/authorization
- ❌ Rate limiting
- ❌ Caching layer
- ❌ Circuit breaker
- ❌ Health checks
- ❌ API versioning
- ❌ CORS configuration
- ❌ Swagger/OpenAPI documentation

---

## Architecture

### Gateway Pattern

```
┌─────────────────────────────────────────────────────────┐
│                      API Gateway                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Request Pipeline                                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │ │
│  │  │   CORS   │→ │   Auth   │→ │Rate Limit│→ ...    │ │
│  │  └──────────┘  └──────────┘  └──────────┘         │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Service Router                                     │ │
│  │  - Dynamic routing based on path                   │ │
│  │  - Load balancing across service instances         │ │
│  │  - Circuit breaking for fault tolerance            │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  ┌──────────┐      ┌──────────┐     ┌──────────┐
  │Achievement│      │  Points  │     │  Quest   │
  │ Service  │      │ Service  │     │ Service  │
  └──────────┘      └──────────┘     └──────────┘
        │                 │                 │
  (And 13 more services...)
```

### Request Flow

```
1. Client Request
   ↓
2. CORS Middleware (if browser)
   ↓
3. Request ID Generation
   ↓
4. Client Metadata Extraction (IP, User-Agent)
   ↓
5. Authentication (JWT/API Key validation)
   ↓
6. Authorization (Role/Tenant check)
   ↓
7. Rate Limiting (Per tenant/user)
   ↓
8. Cache Check (if GET request)
   ↓
9. Service Routing (to target microservice)
   ↓
10. Circuit Breaker (failure protection)
    ↓
11. HTTP Client (proxy to service)
    ↓
12. Response Transformation
    ↓
13. Cache Store (if cacheable)
    ↓
14. Logging & Metrics
    ↓
15. Response to Client
```

---

## Routing Configuration

### Service Registry

**Configuration File** (apps/gateway/src/config/service-registry.ts):

```typescript
export interface ServiceConfig {
  name: string;
  baseUrl: string;
  pathPrefix: string;
  healthEndpoint: string;
  timeout: number; // milliseconds
  retries: number;
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
  };
}

export const SERVICE_REGISTRY: Record<string, ServiceConfig> = {
  // Phase 1 Services
  achievement: {
    name: 'Achievement Service',
    baseUrl: process.env.ACHIEVEMENT_SERVICE_URL || 'http://achievement-service:3001',
    pathPrefix: '/achievements',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  points: {
    name: 'Points & Rewards Service',
    baseUrl: process.env.POINTS_SERVICE_URL || 'http://points-service:3002',
    pathPrefix: '/points',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  rules: {
    name: 'Rules Engine Service',
    baseUrl: process.env.RULES_SERVICE_URL || 'http://rules-service:3003',
    pathPrefix: '/rules',
    healthEndpoint: '/health',
    timeout: 3000,
    retries: 1,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 20000,
    },
  },

  // Phase 2 Services
  quest: {
    name: 'Quest & Missions Service',
    baseUrl: process.env.QUEST_SERVICE_URL || 'http://quest-service:3004',
    pathPrefix: '/quests',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  level: {
    name: 'Level & Progression Service',
    baseUrl: process.env.LEVEL_SERVICE_URL || 'http://level-service:3005',
    pathPrefix: '/levels',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  notification: {
    name: 'Notification Service',
    baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
    pathPrefix: '/notifications',
    healthEndpoint: '/health',
    timeout: 3000,
    retries: 1,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 20000,
    },
  },

  // Phase 3 Services
  challenge: {
    name: 'Challenge Service',
    baseUrl: process.env.CHALLENGE_SERVICE_URL || 'http://challenge-service:3007',
    pathPrefix: '/challenges',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  social: {
    name: 'Social Service',
    baseUrl: process.env.SOCIAL_SERVICE_URL || 'http://social-service:3008',
    pathPrefix: '/social',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  event: {
    name: 'Event & Seasons Service',
    baseUrl: process.env.EVENT_SERVICE_URL || 'http://event-service:3009',
    pathPrefix: '/events',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  // Phase 4 Services
  analytics: {
    name: 'Analytics & Insights Service',
    baseUrl: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3010',
    pathPrefix: '/analytics',
    healthEndpoint: '/health',
    timeout: 10000, // Longer timeout for analytics
    retries: 1,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 30000,
    },
  },

  // Existing Services
  account: {
    name: 'Account Service',
    baseUrl: process.env.ACCOUNT_SERVICE_URL || 'http://account-service:3011',
    pathPrefix: '/accounts',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },

  leaderboard: {
    name: 'Leaderboard Service',
    baseUrl: process.env.LEADERBOARD_SERVICE_URL || 'http://leaderboard-service:3012',
    pathPrefix: '/leaderboards',
    healthEndpoint: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },
};
```

### Routing Module

**apps/gateway/src/modules/routing/routing.module.ts**:

```typescript
import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RoutingService } from './routing.service';
import { ProxyController } from './proxy.controller';
import { SERVICE_REGISTRY } from '../../config/service-registry';

@Module({})
export class RoutingModule {
  static forRoot(): DynamicModule {
    return {
      module: RoutingModule,
      imports: [
        HttpModule.register({
          timeout: 5000,
          maxRedirects: 5,
        }),
      ],
      providers: [
        {
          provide: 'SERVICE_REGISTRY',
          useValue: SERVICE_REGISTRY,
        },
        RoutingService,
      ],
      controllers: [ProxyController],
      exports: [RoutingService],
    };
  }
}
```

### Routing Service

**apps/gateway/src/modules/routing/routing.service.ts**:

```typescript
import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiceConfig } from '../../config/service-registry';

@Injectable()
export class RoutingService {
  // Circuit breaker state per service
  private circuitState: Map<string, {
    failures: number;
    lastFailureTime: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }> = new Map();

  constructor(
    @Inject('SERVICE_REGISTRY') private serviceRegistry: Record<string, ServiceConfig>,
    private readonly httpService: HttpService,
  ) {
    // Initialize circuit breaker state for all services
    Object.keys(serviceRegistry).forEach(serviceName => {
      this.circuitState.set(serviceName, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
      });
    });
  }

  /**
   * Route request to appropriate microservice
   */
  async routeRequest(
    serviceName: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
    query?: Record<string, any>,
  ): Promise<any> {
    const service = this.serviceRegistry[serviceName];

    if (!service) {
      throw new HttpException(
        `Service ${serviceName} not found in registry`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Check circuit breaker
    const circuitState = this.circuitState.get(serviceName);
    if (circuitState.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - circuitState.lastFailureTime;

      if (timeSinceLastFailure < service.circuitBreaker.resetTimeout) {
        throw new HttpException(
          `Service ${serviceName} is temporarily unavailable (circuit breaker open)`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        // Try to close circuit (move to HALF_OPEN)
        circuitState.state = 'HALF_OPEN';
        circuitState.failures = 0;
      }
    }

    // Build target URL
    const targetUrl = `${service.baseUrl}${path}`;

    // Forward headers (exclude hop-by-hop headers)
    const forwardHeaders = this.sanitizeHeaders(headers);

    try {
      const response = await this.makeRequest(
        targetUrl,
        method,
        forwardHeaders,
        body,
        query,
        service.timeout,
      );

      // Reset circuit breaker on success
      if (circuitState.state === 'HALF_OPEN') {
        circuitState.state = 'CLOSED';
        circuitState.failures = 0;
      }

      return response;
    } catch (error) {
      // Handle circuit breaker
      this.handleCircuitBreakerFailure(serviceName, service, circuitState);

      // Retry logic
      if (service.retries > 0) {
        return this.retryRequest(
          targetUrl,
          method,
          forwardHeaders,
          body,
          query,
          service.timeout,
          service.retries,
        );
      }

      throw error;
    }
  }

  private async makeRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    query: Record<string, any>,
    timeout: number,
  ): Promise<any> {
    const config = {
      headers,
      timeout,
      params: query,
    };

    let response;

    switch (method.toUpperCase()) {
      case 'GET':
        response = await firstValueFrom(this.httpService.get(url, config));
        break;
      case 'POST':
        response = await firstValueFrom(this.httpService.post(url, body, config));
        break;
      case 'PUT':
        response = await firstValueFrom(this.httpService.put(url, body, config));
        break;
      case 'PATCH':
        response = await firstValueFrom(this.httpService.patch(url, body, config));
        break;
      case 'DELETE':
        response = await firstValueFrom(this.httpService.delete(url, config));
        break;
      default:
        throw new HttpException(
          `Method ${method} not supported`,
          HttpStatus.METHOD_NOT_ALLOWED,
        );
    }

    return response.data;
  }

  private async retryRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    query: Record<string, any>,
    timeout: number,
    retries: number,
  ): Promise<any> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));

        return await this.makeRequest(url, method, headers, body, query, timeout);
      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
      }
    }
  }

  private handleCircuitBreakerFailure(
    serviceName: string,
    service: ServiceConfig,
    circuitState: any,
  ): void {
    circuitState.failures++;
    circuitState.lastFailureTime = Date.now();

    if (circuitState.failures >= service.circuitBreaker.failureThreshold) {
      circuitState.state = 'OPEN';
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    // Remove hop-by-hop headers
    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
      'host', // Will be set by axios
    ];

    const sanitized = { ...headers };
    hopByHopHeaders.forEach(header => {
      delete sanitized[header];
      delete sanitized[header.toLowerCase()];
    });

    return sanitized;
  }

  /**
   * Get service health status
   */
  async checkServiceHealth(serviceName: string): Promise<boolean> {
    const service = this.serviceRegistry[serviceName];
    if (!service) return false;

    try {
      const healthUrl = `${service.baseUrl}${service.healthEndpoint}`;
      await firstValueFrom(
        this.httpService.get(healthUrl, { timeout: 3000 })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all services health status
   */
  async getAllServicesHealth(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};

    await Promise.all(
      Object.keys(this.serviceRegistry).map(async (serviceName) => {
        healthStatus[serviceName] = await this.checkServiceHealth(serviceName);
      })
    );

    return healthStatus;
  }
}
```

### Proxy Controller

**apps/gateway/src/modules/routing/proxy.controller.ts**:

```typescript
import { Controller, All, Req, Res, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RoutingService } from './routing.service';

@Controller('api')
export class ProxyController {
  constructor(private readonly routingService: RoutingService) {}

  @All('*')
  async proxy(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      // Extract service name from path
      const pathSegments = req.path.split('/').filter(Boolean);
      if (pathSegments.length < 2) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Invalid API path',
          timestamp: new Date().toISOString(),
        });
      }

      // pathSegments[0] is 'api', pathSegments[1] is service name
      const serviceName = this.extractServiceName(pathSegments[1]);
      const remainingPath = '/' + pathSegments.slice(1).join('/');

      // Route to service
      const response = await this.routingService.routeRequest(
        serviceName,
        remainingPath,
        req.method,
        req.headers as Record<string, string>,
        req.body,
        req.query as Record<string, any>,
      );

      return res.json(response);
    } catch (error) {
      return res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private extractServiceName(pathSegment: string): string {
    // Map path prefix to service name
    const serviceMap: Record<string, string> = {
      achievements: 'achievement',
      points: 'points',
      rules: 'rules',
      quests: 'quest',
      levels: 'level',
      notifications: 'notification',
      challenges: 'challenge',
      social: 'social',
      events: 'event',
      analytics: 'analytics',
      accounts: 'account',
      leaderboards: 'leaderboard',
    };

    return serviceMap[pathSegment] || pathSegment;
  }
}
```

---

## Authentication & Authorization

### JWT Authentication Strategy

**apps/gateway/src/modules/auth/jwt.strategy.ts**:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  tenantId: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
    };
  }
}
```

### API Key Strategy

**apps/gateway/src/modules/auth/api-key.strategy.ts**:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface ApiKey {
  key: string;
  tenantId: string;
  scopes: string[];
  isActive: boolean;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  expiresAt?: Date;
}

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    @InjectModel('ApiKey') private apiKeyModel: Model<ApiKey>,
    private configService: ConfigService,
  ) {
    super();
  }

  async validate(token: string): Promise<any> {
    const apiKey = await this.apiKeyModel.findOne({
      key: token,
      isActive: true,
    }).exec();

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    return {
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      authType: 'api-key',
    };
  }
}
```

### Auth Guard

**apps/gateway/src/modules/auth/auth.guard.ts**:

```typescript
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard extends PassportAuthGuard(['jwt', 'api-key']) {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
```

### Role-Based Access Control

**apps/gateway/src/modules/auth/roles.guard.ts**:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      return false;
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
```

### Decorators

**apps/gateway/src/modules/auth/decorators.ts**:

```typescript
import { SetMetadata } from '@nestjs/common';

// Mark route as public (no auth required)
export const Public = () => SetMetadata('isPublic', true);

// Require specific roles
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Get current user from request
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

## Rate Limiting

### Rate Limiter Configuration

**apps/gateway/src/modules/rate-limit/rate-limit.config.ts**:

```typescript
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Default limits for authenticated users
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
  },

  // Stricter limits for anonymous users
  anonymous: {
    windowMs: 60 * 1000,
    max: 20, // 20 requests per minute
    message: 'Rate limit exceeded. Please authenticate for higher limits.',
  },

  // Premium tier (higher limits)
  premium: {
    windowMs: 60 * 1000,
    max: 500, // 500 requests per minute
  },

  // Service-specific limits
  'analytics:write': {
    windowMs: 60 * 1000,
    max: 1000, // Analytics can handle high write volume
  },

  'notification:send': {
    windowMs: 60 * 1000,
    max: 50, // Prevent notification spam
  },

  'auth:login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later',
  },
};
```

### Rate Limiter Service

**apps/gateway/src/modules/rate-limit/rate-limiter.service.ts**:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { RateLimitConfig } from './rate-limit.config';

@Injectable()
export class RateLimiterService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Check if request is within rate limit
   * Uses Redis for distributed rate limiting
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const redisKey = `ratelimit:${key}`;

    // Use Redis sorted set for sliding window
    const multi = this.redis.multi();

    // Remove old entries outside window
    multi.zremrangebyscore(redisKey, 0, windowStart);

    // Count requests in current window
    multi.zcard(redisKey);

    // Add current request
    multi.zadd(redisKey, now, `${now}:${Math.random()}`);

    // Set expiration
    multi.expire(redisKey, Math.ceil(config.windowMs / 1000));

    const results = await multi.exec();
    const count = results[1][1] as number;

    const allowed = count < config.max;
    const remaining = Math.max(0, config.max - count - 1);
    const resetAt = new Date(now + config.windowMs);

    return { allowed, remaining, resetAt };
  }

  /**
   * Get rate limit key based on user/tenant/IP
   */
  getRateLimitKey(req: any, scope?: string): string {
    const parts: string[] = [];

    // Tenant ID (highest priority)
    if (req.user?.tenantId) {
      parts.push(`tenant:${req.user.tenantId}`);
    }

    // User ID
    if (req.user?.userId) {
      parts.push(`user:${req.user.userId}`);
    } else {
      // Fallback to IP for anonymous
      const ip = req.clientMeta?.ip || req.ip;
      parts.push(`ip:${ip}`);
    }

    // Add scope if provided
    if (scope) {
      parts.push(scope);
    }

    return parts.join(':');
  }
}
```

### Rate Limit Guard

**apps/gateway/src/modules/rate-limit/rate-limit.guard.ts**:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_CONFIGS, RateLimitConfig } from './rate-limit.config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get rate limit config from decorator or use default
    const configKey = this.reflector.get<string>(
      'rateLimitConfig',
      context.getHandler(),
    ) || (request.user ? 'authenticated' : 'anonymous');

    const config = RATE_LIMIT_CONFIGS[configKey];
    if (!config) {
      return true; // No rate limiting if config not found
    }

    // Get rate limit key
    const key = this.rateLimiter.getRateLimitKey(request, configKey);

    // Check limit
    const { allowed, remaining, resetAt } = await this.rateLimiter.checkLimit(
      key,
      config,
    );

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', config.max);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', resetAt.toISOString());

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: config.message || 'Rate limit exceeded',
          retryAfter: resetAt.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
```

---

## Caching Strategy

### Cache Configuration

**apps/gateway/src/modules/cache/cache.config.ts**:

```typescript
export interface CacheRule {
  pattern: RegExp;
  ttl: number; // seconds
  includeQueryParams?: boolean;
  includeTenantId?: boolean;
  cacheControl?: string;
}

export const CACHE_RULES: CacheRule[] = [
  // Achievement definitions (rarely change)
  {
    pattern: /^\/api\/achievements$/,
    ttl: 300, // 5 minutes
    includeQueryParams: true,
    includeTenantId: true,
    cacheControl: 'public, max-age=300',
  },

  // User achievements (changes frequently)
  {
    pattern: /^\/api\/achievements\/user\/[^/]+$/,
    ttl: 60, // 1 minute
    includeTenantId: true,
    cacheControl: 'private, max-age=60',
  },

  // Leaderboards (updated frequently but can tolerate staleness)
  {
    pattern: /^\/api\/leaderboards\/[^/]+$/,
    ttl: 30, // 30 seconds
    includeQueryParams: true,
    includeTenantId: true,
    cacheControl: 'public, max-age=30',
  },

  // Quest definitions
  {
    pattern: /^\/api\/quests$/,
    ttl: 300, // 5 minutes
    includeQueryParams: true,
    includeTenantId: true,
    cacheControl: 'public, max-age=300',
  },

  // User profile (changes infrequently)
  {
    pattern: /^\/api\/accounts\/[^/]+$/,
    ttl: 120, // 2 minutes
    includeTenantId: true,
    cacheControl: 'private, max-age=120',
  },

  // Analytics (expensive queries, can be cached longer)
  {
    pattern: /^\/api\/analytics\/metrics\/.+$/,
    ttl: 600, // 10 minutes
    includeQueryParams: true,
    includeTenantId: true,
    cacheControl: 'private, max-age=600',
  },
];
```

### Cache Interceptor

**apps/gateway/src/modules/cache/cache.interceptor.ts**:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_RULES, CacheRule } from './cache.config';
import * as crypto from 'crypto';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Find matching cache rule
    const cacheRule = CACHE_RULES.find(rule => rule.pattern.test(request.path));
    if (!cacheRule) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request, cacheRule);

    // Try to get from cache
    const cachedResponse = await this.redis.get(cacheKey);
    if (cachedResponse) {
      response.setHeader('X-Cache', 'HIT');
      if (cacheRule.cacheControl) {
        response.setHeader('Cache-Control', cacheRule.cacheControl);
      }
      return of(JSON.parse(cachedResponse));
    }

    // Cache miss - set header and store response
    response.setHeader('X-Cache', 'MISS');
    if (cacheRule.cacheControl) {
      response.setHeader('Cache-Control', cacheRule.cacheControl);
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Store in cache with TTL
        await this.redis.setex(
          cacheKey,
          cacheRule.ttl,
          JSON.stringify(data),
        );
      }),
    );
  }

  private generateCacheKey(request: any, rule: CacheRule): string {
    const parts: string[] = ['cache', request.path];

    if (rule.includeQueryParams && Object.keys(request.query).length > 0) {
      // Sort query params for consistent keys
      const sortedQuery = Object.keys(request.query)
        .sort()
        .reduce((acc, key) => {
          acc[key] = request.query[key];
          return acc;
        }, {});
      parts.push(JSON.stringify(sortedQuery));
    }

    if (rule.includeTenantId && request.user?.tenantId) {
      parts.push(`tenant:${request.user.tenantId}`);
    }

    // Hash for shorter keys
    const keyString = parts.join(':');
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(`cache:${pattern}*`);
    if (keys.length === 0) return 0;
    return this.redis.del(...keys);
  }
}
```

---

## Error Handling

### Global Exception Filter

**apps/gateway/src/filters/global-exception.filter.ts**:

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LoggerService } from '@gamification-api/utility';

export interface ErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const requestId = request.headers['x-api-req-id'] || 'unknown';
    const timestamp = new Date().toISOString();
    const path = request.url;

    let errorResponse: ErrorResponse;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        statusCode: status,
        errorCode: this.getErrorCode(status),
        message: typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message,
        details: typeof exceptionResponse === 'object' ? exceptionResponse : undefined,
        timestamp,
        path,
        requestId,
      };
    } else if (exception instanceof Error) {
      // Unexpected errors
      errorResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? exception.message : undefined,
        timestamp,
        path,
        requestId,
      };

      // Log unexpected errors
      LoggerService.logger().error({
        message: 'Unexpected error',
        error: exception.message,
        stack: exception.stack,
        requestId,
        path,
      });
    } else {
      errorResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        timestamp,
        path,
        requestId,
      };
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }
}
```

### Service Error Handler

**apps/gateway/src/modules/routing/service-error.handler.ts**:

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';

export class ServiceErrorHandler {
  static handleServiceError(error: AxiosError, serviceName: string): never {
    if (error.response) {
      // Service returned an error response
      throw new HttpException(
        {
          message: `Service ${serviceName} error: ${error.response.data?.message || error.message}`,
          serviceError: error.response.data,
          service: serviceName,
        },
        error.response.status,
      );
    } else if (error.code === 'ECONNREFUSED') {
      // Service is down
      throw new HttpException(
        {
          message: `Service ${serviceName} is unavailable`,
          service: serviceName,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      // Request timeout
      throw new HttpException(
        {
          message: `Service ${serviceName} request timeout`,
          service: serviceName,
        },
        HttpStatus.GATEWAY_TIMEOUT,
      );
    } else {
      // Unknown error
      throw new HttpException(
        {
          message: `Failed to communicate with ${serviceName}`,
          service: serviceName,
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
```

---

## Monitoring & Observability

### Health Check Controller

**apps/gateway/src/health/health.controller.ts**:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../modules/auth/decorators';
import { RoutingService } from '../modules/routing/routing.service';

@Controller('health')
export class HealthController {
  constructor(private readonly routingService: RoutingService) {}

  @Get()
  @Public()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('services')
  @Public()
  async checkServices() {
    const servicesHealth = await this.routingService.getAllServicesHealth();

    const allHealthy = Object.values(servicesHealth).every(status => status === true);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: servicesHealth,
    };
  }

  @Get('ready')
  @Public()
  async readiness() {
    // Check if gateway is ready to accept traffic
    // Check critical dependencies (Redis, etc.)
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @Public()
  async liveness() {
    // Simple liveness check
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
```

### Metrics Service

**apps/gateway/src/modules/metrics/metrics.service.ts**:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByService: Record<string, number>;
  requestsByStatus: Record<number, number>;
}

@Injectable()
export class MetricsService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Record request metrics
   */
  async recordRequest(
    service: string,
    statusCode: number,
    responseTime: number,
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = new Date().getHours();
    const key = `metrics:${date}:${hour}`;

    const multi = this.redis.multi();

    // Increment counters
    multi.hincrby(key, 'total', 1);
    multi.hincrby(key, statusCode < 400 ? 'success' : 'failed', 1);
    multi.hincrby(key, `service:${service}`, 1);
    multi.hincrby(key, `status:${statusCode}`, 1);

    // Update response time (simple running average)
    multi.hincrby(key, 'responseTime:sum', responseTime);
    multi.hincrby(key, 'responseTime:count', 1);

    // Set expiration (keep metrics for 7 days)
    multi.expire(key, 7 * 24 * 60 * 60);

    await multi.exec();
  }

  /**
   * Get metrics for a time period
   */
  async getMetrics(date: string, hour?: number): Promise<RequestMetrics> {
    const key = hour !== undefined
      ? `metrics:${date}:${hour}`
      : `metrics:${date}:*`;

    if (hour !== undefined) {
      // Get specific hour
      const data = await this.redis.hgetall(key);
      return this.parseMetrics(data);
    } else {
      // Aggregate all hours for the day
      const keys = await this.redis.keys(`metrics:${date}:*`);
      const pipeline = this.redis.pipeline();

      keys.forEach(k => pipeline.hgetall(k));
      const results = await pipeline.exec();

      // Aggregate results
      const aggregated = results.reduce((acc, [err, data]) => {
        if (err) return acc;
        Object.entries(data as Record<string, string>).forEach(([field, value]) => {
          acc[field] = (parseInt(acc[field] || '0') + parseInt(value)).toString();
        });
        return acc;
      }, {} as Record<string, string>);

      return this.parseMetrics(aggregated);
    }
  }

  private parseMetrics(data: Record<string, string>): RequestMetrics {
    const totalRequests = parseInt(data['total'] || '0');
    const successfulRequests = parseInt(data['success'] || '0');
    const failedRequests = parseInt(data['failed'] || '0');

    const responseTimeSum = parseInt(data['responseTime:sum'] || '0');
    const responseTimeCount = parseInt(data['responseTime:count'] || '0');
    const avgResponseTime = responseTimeCount > 0
      ? responseTimeSum / responseTimeCount
      : 0;

    const requestsByService: Record<string, number> = {};
    const requestsByStatus: Record<number, number> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('service:')) {
        requestsByService[key.replace('service:', '')] = parseInt(value);
      } else if (key.startsWith('status:')) {
        requestsByStatus[parseInt(key.replace('status:', ''))] = parseInt(value);
      }
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime: Math.round(avgResponseTime),
      requestsByService,
      requestsByStatus,
    };
  }
}
```

### Metrics Interceptor

**apps/gateway/src/modules/metrics/metrics.interceptor.ts**:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Extract service name from path
    const pathSegments = request.path.split('/').filter(Boolean);
    const service = pathSegments[1] || 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          this.metricsService.recordRequest(
            service,
            response.statusCode,
            responseTime,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.metricsService.recordRequest(
            service,
            error.status || 500,
            responseTime,
          );
        },
      }),
    );
  }
}
```

---

## Implementation Guide

### Step 1: Update Gateway Module

**apps/gateway/src/app/app.module.ts**:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MongooseModule } from '@nestjs/mongoose';

// Modules
import { RoutingModule } from '../modules/routing/routing.module';
import { AuthModule } from '../modules/auth/auth.module';
import { RateLimitModule } from '../modules/rate-limit/rate-limit.module';
import { CacheModule } from '../modules/cache/cache.module';
import { MetricsModule } from '../modules/metrics/metrics.module';

// Guards
import { AuthGuard } from '../modules/auth/auth.guard';
import { RolesGuard } from '../modules/auth/roles.guard';
import { RateLimitGuard } from '../modules/rate-limit/rate-limit.guard';

// Interceptors
import { CacheInterceptor } from '../modules/cache/cache.interceptor';
import { MetricsInterceptor } from '../modules/metrics/metrics.interceptor';
import { LoggerInterceptor } from '@gamification-api/interceptors';

// Filters
import { GlobalExceptionFilter } from '../filters/global-exception.filter';

// Controllers
import { HealthController } from '../health/health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    MongooseModule.forRoot(process.env.MONGODB_URI),

    // Redis
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL,
    }),

    // Authentication
    PassportModule.register({ defaultStrategy: ['jwt', 'api-key'] }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),

    // Feature modules
    RoutingModule.forRoot(),
    AuthModule,
    RateLimitModule,
    CacheModule,
    MetricsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guards (order matters!)
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // 1. Authentication
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // 2. Authorization
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard, // 3. Rate limiting
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor, // Record metrics
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor, // Cache responses
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor, // Log requests
    },

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
```

### Step 2: Update main.ts

**apps/gateway/src/main.ts**:

```typescript
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import {
  clientMetaMiddleware,
  reqMetaMiddleware,
  methodFilterMiddleware,
} from '@gamification-api/middlewares';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID'],
  });

  // Compression
  app.use(compression());

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Middlewares (keep existing)
  app.use(methodFilterMiddleware, clientMetaMiddleware, reqMetaMiddleware);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Gamification API Gateway')
    .setDescription('API Gateway for Gamification Microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Gateway is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 API Documentation: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
```

### Step 3: Environment Variables

**.env.example**:

```bash
# Application
NODE_ENV=development
APP_PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
MONGODB_URI=mongodb://localhost:27017/gamification

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:4200,http://localhost:3001

# Service URLs (for local development)
ACHIEVEMENT_SERVICE_URL=http://localhost:3001
POINTS_SERVICE_URL=http://localhost:3002
RULES_SERVICE_URL=http://localhost:3003
QUEST_SERVICE_URL=http://localhost:3004
LEVEL_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3006
CHALLENGE_SERVICE_URL=http://localhost:3007
SOCIAL_SERVICE_URL=http://localhost:3008
EVENT_SERVICE_URL=http://localhost:3009
ANALYTICS_SERVICE_URL=http://localhost:3010
ACCOUNT_SERVICE_URL=http://localhost:3011
LEADERBOARD_SERVICE_URL=http://localhost:3012

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Caching
CACHE_ENABLED=true

# Monitoring
METRICS_ENABLED=true
```

---

## Deployment

### Kubernetes Deployment

**k8s/gateway-deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: gamification
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: gateway
        image: gamification/api-gateway:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: APP_PORT
          value: "3000"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: gateway-secrets
              key: jwt-secret
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: gateway-secrets
              key: mongodb-uri
        - name: REDIS_URL
          value: "redis://redis-service:6379"

        # Service discovery via Kubernetes DNS
        - name: ACHIEVEMENT_SERVICE_URL
          value: "http://achievement-service:3001"
        - name: POINTS_SERVICE_URL
          value: "http://points-service:3002"
        # ... other services

        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"

        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: gamification
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 3000
    name: http

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: gamification
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Ingress Configuration

**k8s/gateway-ingress.yaml**:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  namespace: gamification
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  tls:
  - hosts:
    - api.gamification.com
    secretName: api-gateway-tls
  rules:
  - host: api.gamification.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

---

## API Reference

### Gateway Endpoints

#### Health Checks

```http
GET /health
GET /health/services
GET /health/ready
GET /health/live
```

#### Metrics (Admin only)

```http
GET /api/gateway/metrics/today
GET /api/gateway/metrics/:date
GET /api/gateway/metrics/:date/:hour
```

### Service Routing

All requests follow the pattern:

```
https://api.gamification.com/api/{service}/{resource}
```

**Examples**:

```http
# Achievement Service
GET    /api/achievements
GET    /api/achievements/:id
POST   /api/achievements
POST   /api/achievements/:id/progress

# Points Service
GET    /api/points/wallet/:userId
POST   /api/points/earn
POST   /api/points/spend

# Quest Service
GET    /api/quests/available/:userId
POST   /api/quests/:id/accept
POST   /api/quests/:id/complete

# And so on for all services...
```

### Authentication

**JWT Token**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**API Key**:
```http
Authorization: Bearer api_key_here
```

Or:
```http
X-API-Key: api_key_here
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-12-04T10:30:00.000Z
```

### Cache Headers

```http
X-Cache: HIT
Cache-Control: public, max-age=300
```

---

## Testing Strategy

### Unit Tests

**apps/gateway/src/modules/routing/routing.service.spec.ts**:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { RoutingService } from './routing.service';
import { SERVICE_REGISTRY } from '../../config/service-registry';

describe('RoutingService', () => {
  let service: RoutingService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        {
          provide: 'SERVICE_REGISTRY',
          useValue: SERVICE_REGISTRY,
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('routeRequest', () => {
    it('should route to correct service', async () => {
      // Test implementation
    });

    it('should handle circuit breaker', async () => {
      // Test circuit breaker logic
    });

    it('should retry on failure', async () => {
      // Test retry logic
    });
  });
});
```

### Integration Tests

Test full request pipeline with real services (or mocked).

### Load Tests

**Use k6 or Artillery**:

```javascript
// load-test.js (k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failures
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/achievements');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| **P50 Latency** | < 50ms | < 100ms |
| **P95 Latency** | < 100ms | < 200ms |
| **P99 Latency** | < 200ms | < 500ms |
| **Throughput** | 10K RPS | 5K RPS |
| **Error Rate** | < 0.1% | < 1% |
| **Availability** | 99.9% | 99.5% |
| **Cache Hit Rate** | > 80% | > 50% |

---

## Summary

This comprehensive specification provides everything needed to build a production-ready API Gateway for your gamification platform:

✅ **Service Routing**: Dynamic routing to 16 microservices with circuit breaking
✅ **Authentication**: JWT and API key strategies with Passport
✅ **Authorization**: Role-based access control with tenant isolation
✅ **Rate Limiting**: Redis-based distributed rate limiting
✅ **Caching**: Intelligent caching with configurable TTL
✅ **Error Handling**: Comprehensive error handling and transformation
✅ **Monitoring**: Health checks, metrics collection, and observability
✅ **Deployment**: Kubernetes manifests with auto-scaling
✅ **Testing**: Unit, integration, and load testing strategies

**Next Steps**:
1. Implement the routing module and service registry
2. Add authentication guards and strategies
3. Integrate rate limiting and caching
4. Set up monitoring and metrics collection
5. Deploy to Kubernetes with proper configurations
6. Load test and tune performance

**Status**: Ready for implementation 🚀
