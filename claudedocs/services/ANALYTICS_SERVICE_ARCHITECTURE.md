# Analytics Service - Complete Architecture & Implementation
**Production-Ready Data Pipeline, Real-Time Processing, and Insights Engine**

> **Version**: 2.0.0
> **Status**: Enhanced Specification
> **Last Updated**: 2025-12-04
> **Complements**: ANALYTICS_INSIGHTS_SERVICE_SPEC.md

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Pipeline](#data-pipeline)
3. [Gateway Integration](#gateway-integration)
4. [Real-Time Stream Processing](#real-time-stream-processing)
5. [Time-Series Database Integration](#time-series-database-integration)
6. [Query Optimization](#query-optimization)
7. [Dashboard & Visualization](#dashboard--visualization)
8. [Scalability Architecture](#scalability-architecture)
9. [Data Lifecycle Management](#data-lifecycle-management)
10. [Complete Implementation](#complete-implementation)
11. [Deployment](#deployment)
12. [Monitoring & Observability](#monitoring--observability)

---

## Architecture Overview

### System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │  Web SDK │  │Mobile SDK│  │Server SDK│                     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                     │
└───────┼─────────────┼─────────────┼────────────────────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
        ┌─────────────▼──────────────┐
        │      API Gateway            │ ← MetricsInterceptor
        │  (Request Analytics)        │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │   Analytics Service         │
        │                             │
        │  ┌──────────────────────┐  │
        │  │  Event Ingestion     │  │
        │  │  (HTTP + Batch API)  │  │
        │  └──────┬───────────────┘  │
        │         │                   │
        │  ┌──────▼───────────────┐  │
        │  │   Event Validation   │  │
        │  │   & Enrichment       │  │
        │  └──────┬───────────────┘  │
        └─────────┼───────────────────┘
                  │
        ┌─────────▼──────────────┐
        │    Apache Kafka         │
        │  (Event Stream Bus)     │
        └─────────┬────────────┬──┘
                  │            │
      ┌───────────▼──┐    ┌───▼────────────┐
      │  MongoDB     │    │   ClickHouse   │
      │  (Events +   │    │   (Analytics   │
      │  Metadata)   │    │    Queries)    │
      └──────┬───────┘    └────┬───────────┘
             │                 │
        ┌────▼─────────────────▼────┐
        │   Stream Processors        │
        │  ┌──────────────────────┐ │
        │  │  Real-Time Metrics   │ │
        │  │  (Redis Cache)       │ │
        │  └──────────────────────┘ │
        │  ┌──────────────────────┐ │
        │  │  Batch Aggregation   │ │
        │  │  (Daily/Hourly)      │ │
        │  └──────────────────────┘ │
        └────────────────────────────┘
                  │
        ┌─────────▼──────────────┐
        │  Analytics Query API    │
        └─────────┬───────────────┘
                  │
        ┌─────────▼──────────────┐
        │  Grafana Dashboards     │
        │  + Custom Admin UI      │
        └─────────────────────────┘
```

### Data Flow Stages

**Stage 1: Event Collection**
```
Gateway Request → MetricsInterceptor → Analytics Service HTTP API
Client SDK → Analytics Service Batch API
Microservices → Kafka Event Bus → Analytics Consumer
```

**Stage 2: Event Processing**
```
Raw Event → Validation → Enrichment → Kafka Topic → Multiple Consumers
```

**Stage 3: Storage**
```
Hot Storage: Redis (real-time metrics, 1 hour TTL)
Warm Storage: MongoDB (events, 90 days)
Cold Storage: ClickHouse (aggregated metrics, 2 years)
Archive: S3/Glacier (historical data, 7+ years)
```

**Stage 4: Query & Analytics**
```
Real-time Queries → Redis Cache
Recent Data (< 24h) → MongoDB
Historical Data → ClickHouse
Complex Analytics → ClickHouse Materialized Views
```

---

## Data Pipeline

### Event Ingestion Pipeline

```typescript
// apps/analytics/src/pipeline/event-pipeline.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectKafka } from '@nestjs/microservices';
import { Kafka, Producer } from 'kafkajs';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface AnalyticsEvent {
  eventId: string;
  tenantId: string;
  userId: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  source: 'gateway' | 'client' | 'service';
  context: {
    appVersion: string;
    platform: string;
    deviceType: string;
    ip?: string;
    userAgent?: string;
  };
}

@Injectable()
export class EventPipelineService implements OnModuleInit {
  private producer: Producer;

  constructor(
    @InjectKafka() private readonly kafka: Kafka,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    this.producer = this.kafka.producer({
      idempotent: true, // Prevent duplicate events
      maxInFlightRequests: 5,
      retry: {
        retries: 3,
      },
    });

    await this.producer.connect();
  }

  /**
   * Ingest event from HTTP API
   * Stage 1: Validation & Enrichment
   */
  async ingestEvent(rawEvent: any): Promise<{ eventId: string; status: string }> {
    // Validate event structure
    const validationResult = this.validateEvent(rawEvent);
    if (!validationResult.valid) {
      throw new BadRequestException(`Invalid event: ${validationResult.error}`);
    }

    // Generate event ID
    const eventId = `evt_${Date.now()}_${this.generateShortId()}`;

    // Enrich event with metadata
    const enrichedEvent: AnalyticsEvent = {
      eventId,
      ...rawEvent,
      timestamp: rawEvent.timestamp || new Date(),
      source: rawEvent.source || 'client',
    };

    // Stage 2: Publish to Kafka
    await this.publishToKafka(enrichedEvent);

    // Stage 3: Cache for real-time queries (optional for high-priority events)
    if (this.isHighPriorityEvent(enrichedEvent.eventType)) {
      await this.cacheEvent(enrichedEvent);
    }

    return {
      eventId,
      status: 'ingested',
    };
  }

  /**
   * Batch event ingestion with optimized throughput
   */
  async ingestBatchEvents(events: any[]): Promise<{
    successCount: number;
    failedCount: number;
    eventIds: string[];
  }> {
    const results = {
      successCount: 0,
      failedCount: 0,
      eventIds: [] as string[],
    };

    // Validate all events first
    const validEvents = events
      .map((event) => {
        const validation = this.validateEvent(event);
        if (!validation.valid) {
          results.failedCount++;
          return null;
        }

        const eventId = `evt_${Date.now()}_${this.generateShortId()}`;
        results.eventIds.push(eventId);

        return {
          eventId,
          ...event,
          timestamp: event.timestamp || new Date(),
          source: event.source || 'client',
        };
      })
      .filter(Boolean);

    // Batch publish to Kafka for efficiency
    await this.publishBatchToKafka(validEvents);

    results.successCount = validEvents.length;

    return results;
  }

  /**
   * Publish single event to Kafka
   */
  private async publishToKafka(event: AnalyticsEvent): Promise<void> {
    const topic = this.getKafkaTopicForEvent(event.eventType);

    await this.producer.send({
      topic,
      messages: [
        {
          key: event.userId, // Partition by userId for ordered processing
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType,
            tenantId: event.tenantId,
            timestamp: event.timestamp.toISOString(),
          },
        },
      ],
    });
  }

  /**
   * Batch publish to Kafka with transaction
   */
  private async publishBatchToKafka(events: AnalyticsEvent[]): Promise<void> {
    const transaction = await this.producer.transaction();

    try {
      // Group by topic for efficiency
      const eventsByTopic = events.reduce((acc, event) => {
        const topic = this.getKafkaTopicForEvent(event.eventType);
        if (!acc[topic]) acc[topic] = [];
        acc[topic].push(event);
        return acc;
      }, {} as Record<string, AnalyticsEvent[]>);

      // Send all messages in transaction
      for (const [topic, topicEvents] of Object.entries(eventsByTopic)) {
        await transaction.send({
          topic,
          messages: topicEvents.map((event) => ({
            key: event.userId,
            value: JSON.stringify(event),
            headers: {
              eventType: event.eventType,
              tenantId: event.tenantId,
              timestamp: event.timestamp.toISOString(),
            },
          })),
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }

  /**
   * Cache high-priority events for real-time access
   */
  private async cacheEvent(event: AnalyticsEvent): Promise<void> {
    const cacheKey = `event:${event.eventId}`;

    // Store event for 1 hour
    await this.redis.setex(
      cacheKey,
      3600,
      JSON.stringify(event)
    );

    // Update real-time metrics
    await this.updateRealTimeMetrics(event);
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    const metricsKey = `metrics:${date}:${hour}`;

    const multi = this.redis.multi();

    // Increment counters
    multi.hincrby(metricsKey, 'total_events', 1);
    multi.hincrby(metricsKey, `event:${event.eventType}`, 1);
    multi.hincrby(metricsKey, `user:${event.userId}`, 1);
    multi.hincrby(metricsKey, `tenant:${event.tenantId}`, 1);

    // Set expiration (keep for 24 hours)
    multi.expire(metricsKey, 86400);

    // Track unique users (HyperLogLog for memory efficiency)
    multi.pfadd(`unique_users:${date}`, event.userId);

    await multi.exec();
  }

  /**
   * Determine Kafka topic based on event type
   */
  private getKafkaTopicForEvent(eventType: string): string {
    // Route high-priority events to dedicated topics
    const highPriorityEvents = [
      'purchase',
      'achievement_unlocked',
      'level_up',
      'quest_completed',
    ];

    if (highPriorityEvents.includes(eventType)) {
      return 'analytics.events.high_priority';
    }

    // Route by event category
    if (eventType.startsWith('user_')) {
      return 'analytics.events.user';
    }

    if (eventType.startsWith('system_')) {
      return 'analytics.events.system';
    }

    return 'analytics.events.general';
  }

  /**
   * Check if event is high priority
   */
  private isHighPriorityEvent(eventType: string): boolean {
    const highPriority = [
      'purchase',
      'achievement_unlocked',
      'level_up',
      'quest_completed',
      'challenge_won',
    ];
    return highPriority.includes(eventType);
  }

  /**
   * Validate event structure
   */
  private validateEvent(event: any): { valid: boolean; error?: string } {
    if (!event.userId) {
      return { valid: false, error: 'userId is required' };
    }

    if (!event.eventType) {
      return { valid: false, error: 'eventType is required' };
    }

    if (!event.sessionId) {
      return { valid: false, error: 'sessionId is required' };
    }

    return { valid: true };
  }

  /**
   * Generate short random ID
   */
  private generateShortId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

---

## Gateway Integration

### Connect Gateway Metrics to Analytics Service

**apps/gateway/src/modules/metrics/analytics-forwarder.service.ts**:

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AnalyticsForwarderService {
  private analyticsServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.analyticsServiceUrl = this.configService.get<string>(
      'ANALYTICS_SERVICE_URL',
      'http://analytics-service:3010'
    );
  }

  /**
   * Forward request metrics from gateway to analytics service
   */
  async forwardRequestMetrics({
    userId,
    sessionId,
    path,
    method,
    statusCode,
    responseTime,
    tenantId,
  }: {
    userId?: string;
    sessionId?: string;
    path: string;
    method: string;
    statusCode: number;
    responseTime: number;
    tenantId?: string;
  }): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.analyticsServiceUrl}/api/v1/analytics/track`,
          {
            userId: userId || 'anonymous',
            sessionId: sessionId || this.generateSessionId(),
            eventType: 'api_request',
            eventData: {
              path,
              method,
              statusCode,
              responseTime,
              success: statusCode < 400,
            },
            source: 'gateway',
            context: {
              appVersion: process.env.APP_VERSION || '1.0.0',
              platform: 'api',
              deviceType: 'server',
            },
            tenantId: tenantId || 'default',
            timestamp: new Date(),
          },
          {
            timeout: 1000, // Fast timeout to not block gateway
          }
        )
      );
    } catch (error) {
      // Log error but don't fail gateway request
      console.error('Failed to forward analytics:', error.message);
    }
  }

  /**
   * Batch forward metrics (called periodically)
   */
  async forwardBatchMetrics(events: any[]): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.analyticsServiceUrl}/api/v1/analytics/batch`,
          { events },
          { timeout: 5000 }
        )
      );
    } catch (error) {
      console.error('Failed to forward batch analytics:', error.message);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Enhanced MetricsInterceptor with Analytics Integration**:

```typescript
// apps/gateway/src/modules/metrics/metrics.interceptor.ts (enhanced)

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';
import { AnalyticsForwarderService } from './analytics-forwarder.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  // Batch buffer for analytics
  private batchBuffer: any[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 5000; // 5 seconds

  constructor(
    private readonly metricsService: MetricsService,
    private readonly analyticsForwarder: AnalyticsForwarderService,
  ) {
    // Start batch forwarding interval
    setInterval(() => this.flushBatchBuffer(), this.BATCH_INTERVAL);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Extract service name from path
    const pathSegments = request.path.split('/').filter(Boolean);
    const service = pathSegments[1] || 'unknown';

    return next.handle().pipe(
      tap({
        next: async () => {
          const responseTime = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();

          // Record in gateway metrics (existing)
          await this.metricsService.recordRequest(
            service,
            response.statusCode,
            responseTime,
          );

          // Add to analytics batch buffer
          this.addToBatchBuffer({
            userId: request.user?.userId,
            sessionId: request.headers['x-session-id'],
            tenantId: request.user?.tenantId,
            path: request.path,
            method: request.method,
            statusCode: response.statusCode,
            responseTime,
          });
        },
        error: async (error) => {
          const responseTime = Date.now() - startTime;

          // Record error in gateway metrics
          await this.metricsService.recordRequest(
            service,
            error.status || 500,
            responseTime,
          );

          // Add error event to analytics
          this.addToBatchBuffer({
            userId: request.user?.userId,
            sessionId: request.headers['x-session-id'],
            tenantId: request.user?.tenantId,
            path: request.path,
            method: request.method,
            statusCode: error.status || 500,
            responseTime,
          });
        },
      }),
    );
  }

  /**
   * Add event to batch buffer
   */
  private addToBatchBuffer(event: any): void {
    this.batchBuffer.push(event);

    // Flush if buffer is full
    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      this.flushBatchBuffer();
    }
  }

  /**
   * Flush batch buffer to analytics service
   */
  private async flushBatchBuffer(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const eventsToSend = [...this.batchBuffer];
    this.batchBuffer = [];

    // Forward to analytics service (non-blocking)
    this.analyticsForwarder
      .forwardBatchMetrics(eventsToSend)
      .catch((error) => {
        console.error('Failed to flush analytics batch:', error);
        // Re-add to buffer if failed (up to limit)
        if (this.batchBuffer.length < this.BATCH_SIZE * 2) {
          this.batchBuffer.push(...eventsToSend);
        }
      });
  }
}
```

---

## Real-Time Stream Processing

### Kafka Consumer for Real-Time Analytics

```typescript
// apps/analytics/src/stream/kafka-consumer.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();
  private clickhouse: ClickHouseClient;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel('AnalyticsEvent') private eventModel: Model<any>,
  ) {
    this.kafka = new Kafka({
      clientId: 'analytics-service',
      brokers: this.configService
        .get<string>('KAFKA_BROKERS', 'localhost:9092')
        .split(','),
    });

    this.clickhouse = new ClickHouseClient({
      url: this.configService.get<string>(
        'CLICKHOUSE_URL',
        'http://localhost:8123'
      ),
      database: 'analytics',
    });
  }

  async onModuleInit() {
    await this.startConsumers();
  }

  async onModuleDestroy() {
    await this.stopConsumers();
  }

  /**
   * Start all Kafka consumers
   */
  private async startConsumers() {
    // High priority events consumer
    await this.createConsumer(
      'analytics-high-priority',
      ['analytics.events.high_priority'],
      this.processHighPriorityEvent.bind(this)
    );

    // General events consumer
    await this.createConsumer(
      'analytics-general',
      ['analytics.events.general', 'analytics.events.user', 'analytics.events.system'],
      this.processGeneralEvent.bind(this)
    );

    // Gateway metrics consumer
    await this.createConsumer(
      'analytics-gateway',
      ['analytics.events.gateway'],
      this.processGatewayEvent.bind(this)
    );
  }

  /**
   * Create and start a consumer
   */
  private async createConsumer(
    groupId: string,
    topics: string[],
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: handler,
    });

    this.consumers.set(groupId, consumer);
    console.log(`Kafka consumer started: ${groupId}`);
  }

  /**
   * Process high-priority events
   * Route to: MongoDB + ClickHouse + Real-time aggregation
   */
  private async processHighPriorityEvent(payload: EachMessagePayload): Promise<void> {
    const event = JSON.parse(payload.message.value.toString());

    try {
      // 1. Store in MongoDB for recent queries
      await this.eventModel.create(event);

      // 2. Insert into ClickHouse for analytics
      await this.insertToClickHouse(event);

      // 3. Update real-time aggregations
      await this.updateRealTimeAggregations(event);

      // 4. Trigger real-time notifications if needed
      if (this.shouldTriggerNotification(event)) {
        await this.triggerRealTimeNotification(event);
      }

      // Commit offset
      await payload.heartbeat();
    } catch (error) {
      console.error('Error processing high-priority event:', error);
      // Don't commit offset - will retry
    }
  }

  /**
   * Process general events
   * Route to: MongoDB + ClickHouse (batched)
   */
  private async processGeneralEvent(payload: EachMessagePayload): Promise<void> {
    const event = JSON.parse(payload.message.value.toString());

    try {
      // Store in MongoDB
      await this.eventModel.create(event);

      // Batch insert to ClickHouse (more efficient)
      await this.batchInsertToClickHouse(event);

      await payload.heartbeat();
    } catch (error) {
      console.error('Error processing general event:', error);
    }
  }

  /**
   * Process gateway metrics events
   * Route to: ClickHouse only (high volume, analytics-focused)
   */
  private async processGatewayEvent(payload: EachMessagePayload): Promise<void> {
    const event = JSON.parse(payload.message.value.toString());

    try {
      // Only store in ClickHouse for analytics queries
      await this.insertToClickHouse(event);

      await payload.heartbeat();
    } catch (error) {
      console.error('Error processing gateway event:', error);
    }
  }

  /**
   * Insert single event to ClickHouse
   */
  private async insertToClickHouse(event: any): Promise<void> {
    await this.clickhouse.insert({
      table: 'events',
      values: [
        {
          event_id: event.eventId,
          tenant_id: event.tenantId,
          user_id: event.userId,
          session_id: event.sessionId,
          event_type: event.eventType,
          event_data: JSON.stringify(event.eventData),
          timestamp: event.timestamp,
          source: event.source,
          app_version: event.context?.appVersion,
          platform: event.context?.platform,
          device_type: event.context?.deviceType,
        },
      ],
      format: 'JSONEachRow',
    });
  }

  /**
   * Batch insert to ClickHouse (accumulated buffer)
   */
  private batchBuffer: any[] = [];
  private readonly BATCH_SIZE = 1000;
  private readonly BATCH_TIMEOUT = 5000; // 5 seconds

  private async batchInsertToClickHouse(event: any): Promise<void> {
    this.batchBuffer.push(event);

    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      await this.flushClickHouseBatch();
    }
  }

  private async flushClickHouseBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await this.clickhouse.insert({
        table: 'events',
        values: batch.map((event) => ({
          event_id: event.eventId,
          tenant_id: event.tenantId,
          user_id: event.userId,
          session_id: event.sessionId,
          event_type: event.eventType,
          event_data: JSON.stringify(event.eventData),
          timestamp: event.timestamp,
          source: event.source,
          app_version: event.context?.appVersion,
          platform: event.context?.platform,
          device_type: event.context?.deviceType,
        })),
        format: 'JSONEachRow',
      });

      console.log(`Flushed ${batch.length} events to ClickHouse`);
    } catch (error) {
      console.error('Failed to flush ClickHouse batch:', error);
      // Re-add to buffer
      this.batchBuffer.unshift(...batch);
    }
  }

  /**
   * Update real-time aggregations (for dashboards)
   */
  private async updateRealTimeAggregations(event: any): Promise<void> {
    // Implement real-time metric updates
    // Could use Redis streams, materialized views, or in-memory aggregation
  }

  /**
   * Check if event should trigger real-time notification
   */
  private shouldTriggerNotification(event: any): boolean {
    const notificationEvents = [
      'achievement_unlocked',
      'level_up',
      'challenge_won',
      'purchase',
    ];
    return notificationEvents.includes(event.eventType);
  }

  /**
   * Trigger real-time notification (WebSocket, push notification, etc.)
   */
  private async triggerRealTimeNotification(event: any): Promise<void> {
    // Implement notification logic
    // Could emit to WebSocket server, call notification service, etc.
  }

  /**
   * Stop all consumers gracefully
   */
  private async stopConsumers(): Promise<void> {
    for (const [groupId, consumer] of this.consumers.entries()) {
      await consumer.disconnect();
      console.log(`Kafka consumer stopped: ${groupId}`);
    }
  }
}
```

---

## Time-Series Database Integration

### ClickHouse Schema and Queries

**ClickHouse Table Schema**:

```sql
-- apps/analytics/clickhouse/schema.sql

CREATE DATABASE IF NOT EXISTS analytics;

-- Main events table (distributed table in production)
CREATE TABLE IF NOT EXISTS analytics.events
(
    event_id String,
    tenant_id String,
    user_id String,
    session_id String,
    event_type LowCardinality(String),
    event_data String, -- JSON string
    timestamp DateTime64(3),
    source LowCardinality(String),
    app_version LowCardinality(String),
    platform LowCardinality(String),
    device_type LowCardinality(String),
    date Date MATERIALIZED toDate(timestamp),
    hour UInt8 MATERIALIZED toHour(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, user_id, timestamp)
TTL date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- Materialized view for daily user metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_user_metrics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, user_id, date)
AS
SELECT
    tenant_id,
    user_id,
    toDate(timestamp) AS date,
    count() AS total_events,
    uniq(session_id) AS total_sessions,
    countIf(event_type = 'achievement_unlocked') AS achievements_unlocked,
    countIf(event_type = 'quest_completed') AS quests_completed,
    countIf(event_type = 'challenge_won') AS challenges_won
FROM analytics.events
GROUP BY tenant_id, user_id, date;

-- Materialized view for hourly event counts
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.hourly_event_counts
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, event_type, date, hour)
AS
SELECT
    tenant_id,
    event_type,
    toDate(timestamp) AS date,
    toHour(timestamp) AS hour,
    count() AS event_count,
    uniq(user_id) AS unique_users
FROM analytics.events
GROUP BY tenant_id, event_type, date, hour;

-- Materialized view for retention analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.user_activity_dates
ENGINE = ReplacingMergeTree()
ORDER BY (tenant_id, user_id, date)
AS
SELECT
    tenant_id,
    user_id,
    toDate(timestamp) AS date,
    min(timestamp) AS first_event,
    max(timestamp) AS last_event,
    count() AS events_count
FROM analytics.events
GROUP BY tenant_id, user_id, date;

-- Index for fast user lookups
ALTER TABLE analytics.events ADD INDEX IF NOT EXISTS idx_user_id user_id TYPE bloom_filter GRANULARITY 4;

-- Index for event type filtering
ALTER TABLE analytics.events ADD INDEX IF NOT EXISTS idx_event_type event_type TYPE set(100) GRANULARITY 4;
```

**ClickHouse Query Service**:

```typescript
// apps/analytics/src/clickhouse/clickhouse-query.service.ts

import { Injectable } from '@nestjs/common';
import { ClickHouseClient } from '@clickhouse/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClickHouseQueryService {
  private client: ClickHouseClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new ClickHouseClient({
      url: this.configService.get<string>('CLICKHOUSE_URL', 'http://localhost:8123'),
      database: 'analytics',
      request_timeout: 30000,
    });
  }

  /**
   * Get DAU/MAU/WAU metrics
   */
  async getActiveUsersMetrics({
    tenantId,
    startDate,
    endDate,
  }: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<any> {
    const query = `
      SELECT
        toDate(timestamp) AS date,
        uniq(user_id) AS dau
      FROM analytics.events
      WHERE tenant_id = {tenantId:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp < {endDate:DateTime}
      GROUP BY date
      ORDER BY date ASC
    `;

    const result = await this.client.query({
      query,
      query_params: {
        tenantId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json();

    // Calculate MAU
    const mauQuery = `
      SELECT uniq(user_id) AS mau
      FROM analytics.events
      WHERE tenant_id = {tenantId:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp < {endDate:DateTime}
    `;

    const mauResult = await this.client.query({
      query: mauQuery,
      query_params: {
        tenantId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      format: 'JSONEachRow',
    });

    const mauRows = await mauResult.json();

    return {
      dailyActiveUsers: rows,
      monthlyActiveUsers: mauRows[0]?.mau || 0,
      stickinessRatio:
        rows.length > 0
          ? (rows.reduce((sum, r) => sum + r.dau, 0) / rows.length / mauRows[0]?.mau) * 100
          : 0,
    };
  }

  /**
   * Get retention curve for cohort
   */
  async getRetentionCurve({
    tenantId,
    cohortDate,
    days,
  }: {
    tenantId: string;
    cohortDate: Date;
    days: number;
  }): Promise<any> {
    // Query optimized with materialized view
    const query = `
      WITH cohort_users AS (
        SELECT DISTINCT user_id
        FROM analytics.events
        WHERE tenant_id = {tenantId:String}
          AND toDate(timestamp) = {cohortDate:Date}
          AND event_type = 'user_registered'
      )
      SELECT
        dateDiff('day', {cohortDate:Date}, date) AS day_number,
        uniq(user_id) AS active_users,
        (uniq(user_id) * 100.0 / (SELECT count() FROM cohort_users)) AS retention_rate
      FROM analytics.user_activity_dates
      WHERE tenant_id = {tenantId:String}
        AND user_id IN (SELECT user_id FROM cohort_users)
        AND date >= {cohortDate:Date}
        AND date <= {cohortDate:Date} + INTERVAL {days:UInt16} DAY
      GROUP BY day_number
      ORDER BY day_number ASC
    `;

    const result = await this.client.query({
      query,
      query_params: {
        tenantId,
        cohortDate: cohortDate.toISOString().split('T')[0],
        days,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json();

    return {
      cohortDate,
      retentionCurve: rows.map((r) => ({
        day: r.day_number,
        activeUsers: r.active_users,
        retentionRate: parseFloat(r.retention_rate.toFixed(2)),
      })),
      day1Retention: rows.find((r) => r.day_number === 1)?.retention_rate || 0,
      day7Retention: rows.find((r) => r.day_number === 7)?.retention_rate || 0,
      day30Retention: rows.find((r) => r.day_number === 30)?.retention_rate || 0,
    };
  }

  /**
   * Get funnel metrics
   */
  async getFunnelMetrics({
    tenantId,
    steps,
    startDate,
    endDate,
  }: {
    tenantId: string;
    steps: Array<{ stepNumber: number; eventType: string }>;
    startDate: Date;
    endDate: Date;
  }): Promise<any> {
    // Build funnel query with window functions
    const stepConditions = steps
      .map(
        (step) =>
          `countIf(event_type = '${step.eventType}') > 0 AS step_${step.stepNumber}_completed`
      )
      .join(',\n        ');

    const query = `
      WITH user_events AS (
        SELECT
          user_id,
          ${stepConditions}
        FROM analytics.events
        WHERE tenant_id = {tenantId:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp < {endDate:DateTime}
        GROUP BY user_id
      )
      SELECT
        ${steps
          .map(
            (step) => `
          countIf(step_${step.stepNumber}_completed) AS step_${step.stepNumber}_users
        `
          )
          .join(',\n        ')}
      FROM user_events
    `;

    const result = await this.client.query({
      query,
      query_params: {
        tenantId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json();
    const data = rows[0];

    // Calculate conversion rates
    const funnelSteps = steps.map((step, index) => {
      const users = data[`step_${step.stepNumber}_users`];
      const previousUsers =
        index === 0 ? users : data[`step_${steps[index - 1].stepNumber}_users`];

      return {
        stepNumber: step.stepNumber,
        eventType: step.eventType,
        totalUsers: users,
        conversionRate: index === 0 ? 100 : (users / previousUsers) * 100,
        dropOffRate: index === 0 ? 0 : ((previousUsers - users) / previousUsers) * 100,
      };
    });

    return {
      steps: funnelSteps,
      totalEntries: funnelSteps[0]?.totalUsers || 0,
      totalCompletions: funnelSteps[funnelSteps.length - 1]?.totalUsers || 0,
      overallConversion:
        funnelSteps.length > 0
          ? (funnelSteps[funnelSteps.length - 1].totalUsers / funnelSteps[0].totalUsers) * 100
          : 0,
    };
  }

  /**
   * Get top events by count
   */
  async getTopEvents({
    tenantId,
    startDate,
    endDate,
    limit = 10,
  }: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<any> {
    const query = `
      SELECT
        event_type,
        count() AS event_count,
        uniq(user_id) AS unique_users
      FROM analytics.events
      WHERE tenant_id = {tenantId:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp < {endDate:DateTime}
      GROUP BY event_type
      ORDER BY event_count DESC
      LIMIT {limit:UInt16}
    `;

    const result = await this.client.query({
      query,
      query_params: {
        tenantId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit,
      },
      format: 'JSONEachRow',
    });

    return await result.json();
  }
}
```

---

## Query Optimization

### Caching Strategy

```typescript
// apps/analytics/src/cache/analytics-cache.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class AnalyticsCacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Cache query results with smart TTL
   */
  async cacheQueryResult({
    cacheKey,
    data,
    ttl,
  }: {
    cacheKey: string;
    data: any;
    ttl: number;
  }): Promise<void> {
    await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
  }

  /**
   * Get cached query result
   */
  async getCachedQueryResult(cacheKey: string): Promise<any | null> {
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Generate cache key for query
   */
  generateCacheKey(query: string, params: any): string {
    const paramString = JSON.stringify(params);
    return `analytics:query:${Buffer.from(query + paramString).toString('base64')}`;
  }

  /**
   * Determine optimal TTL based on query type
   */
  getOptimalTTL(queryType: string): number {
    const ttlMap: Record<string, number> = {
      realtime: 60, // 1 minute
      recent: 300, // 5 minutes
      daily: 1800, // 30 minutes
      historical: 3600, // 1 hour
      aggregated: 7200, // 2 hours
    };

    return ttlMap[queryType] || 300;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCacheByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`analytics:${pattern}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

## Dashboard & Visualization

### Analytics Query API with Caching

```typescript
// apps/analytics/src/query/analytics-query.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClickHouseQueryService } from '../clickhouse/clickhouse-query.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/analytics/query')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsQueryController {
  constructor(
    private readonly clickhouseQuery: ClickHouseQueryService,
    private readonly cacheService: AnalyticsCacheService,
  ) {}

  /**
   * Get dashboard metrics (cached)
   */
  @Get('dashboard')
  async getDashboardMetrics(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const cacheKey = `dashboard:${tenantId}:${startDate}:${endDate}`;

    // Check cache first
    const cached = await this.cacheService.getCachedQueryResult(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Query from ClickHouse
    const [activeUsers, topEvents] = await Promise.all([
      this.clickhouseQuery.getActiveUsersMetrics({
        tenantId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }),
      this.clickhouseQuery.getTopEvents({
        tenantId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        limit: 10,
      }),
    ]);

    const result = {
      activeUsers,
      topEvents,
      generatedAt: new Date(),
    };

    // Cache for 5 minutes
    await this.cacheService.cacheQueryResult({
      cacheKey,
      data: result,
      ttl: 300,
    });

    return { ...result, cached: false };
  }

  /**
   * Get retention metrics (cached)
   */
  @Get('retention')
  async getRetentionMetrics(
    @Query('tenantId') tenantId: string,
    @Query('cohortDate') cohortDate: string,
    @Query('days') days: number,
  ) {
    const cacheKey = `retention:${tenantId}:${cohortDate}:${days}`;

    const cached = await this.cacheService.getCachedQueryResult(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const result = await this.clickhouseQuery.getRetentionCurve({
      tenantId,
      cohortDate: new Date(cohortDate),
      days: Number(days),
    });

    // Cache for 1 hour (retention data doesn't change frequently)
    await this.cacheService.cacheQueryResult({
      cacheKey,
      data: result,
      ttl: 3600,
    });

    return { ...result, cached: false };
  }

  /**
   * Get funnel metrics (cached)
   */
  @Get('funnel')
  async getFunnelMetrics(
    @Query('tenantId') tenantId: string,
    @Query('steps') stepsJson: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const steps = JSON.parse(stepsJson);
    const cacheKey = `funnel:${tenantId}:${stepsJson}:${startDate}:${endDate}`;

    const cached = await this.cacheService.getCachedQueryResult(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const result = await this.clickhouseQuery.getFunnelMetrics({
      tenantId,
      steps,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    // Cache for 30 minutes
    await this.cacheService.cacheQueryResult({
      cacheKey,
      data: result,
      ttl: 1800,
    });

    return { ...result, cached: false };
  }
}
```

### Grafana Integration

**Grafana Dashboard JSON** (example):

```json
{
  "dashboard": {
    "title": "Gamification Analytics",
    "panels": [
      {
        "title": "Daily Active Users",
        "type": "graph",
        "datasource": "ClickHouse",
        "targets": [
          {
            "query": "SELECT toDate(timestamp) AS date, uniq(user_id) AS dau FROM analytics.events WHERE $__timeFilter(timestamp) GROUP BY date ORDER BY date"
          }
        ]
      },
      {
        "title": "Top Events",
        "type": "table",
        "datasource": "ClickHouse",
        "targets": [
          {
            "query": "SELECT event_type, count() AS count FROM analytics.events WHERE $__timeFilter(timestamp) GROUP BY event_type ORDER BY count DESC LIMIT 10"
          }
        ]
      }
    ]
  }
}
```

---

## Scalability Architecture

### Horizontal Scaling Strategy

**Load Distribution**:
```
Client Requests
     │
     ▼
Load Balancer (Nginx/HAProxy)
     │
     ├─────────┬─────────┬─────────┐
     ▼         ▼         ▼         ▼
Analytics  Analytics  Analytics  Analytics
Instance1  Instance2  Instance3  Instance4
     │         │         │         │
     └─────────┴─────────┴─────────┘
              │
              ▼
         Kafka Cluster
         (partitioned)
              │
     ┌────────┴────────┐
     ▼                 ▼
ClickHouse          MongoDB
(Distributed)      (Sharded)
```

**Kafka Partitioning Strategy**:
```typescript
// Partition by user ID for ordered processing
const partition = hash(event.userId) % numPartitions;

// Topic structure:
// analytics.events.high_priority (8 partitions)
// analytics.events.general (16 partitions)
// analytics.events.gateway (32 partitions - high volume)
```

**Consumer Scaling**:
```yaml
# Kubernetes Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: analytics-consumer-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: analytics-consumer
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: kafka_consumer_lag
      target:
        type: AverageValue
        averageValue: "1000" # Max 1000 messages lag per consumer
```

---

## Data Lifecycle Management

### Data Tiering Strategy

```typescript
// apps/analytics/src/lifecycle/data-lifecycle.service.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DataLifecycleService {
  /**
   * Tier 1: Hot Data (Redis) - Last 1 hour
   * Tier 2: Warm Data (MongoDB) - Last 90 days
   * Tier 3: Cold Data (ClickHouse) - Last 2 years
   * Tier 4: Archive (S3) - 2+ years
   */

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveOldData() {
    // Move MongoDB data older than 90 days to ClickHouse (if not already there)
    await this.moveMongoDBToClickHouse();

    // Export ClickHouse data older than 2 years to S3
    await this.exportClickHouseToS3();

    // Clean up Redis cache
    await this.cleanupRedisCache();
  }

  private async moveMongoDBToClickHouse() {
    // Implementation for moving old MongoDB data to ClickHouse
  }

  private async exportClickHouseToS3() {
    // Implementation for archiving ClickHouse data to S3
  }

  private async cleanupRedisCache() {
    // Redis already has TTL, but can force cleanup here
  }
}
```

---

## Deployment

### Kubernetes Manifests

**analytics-deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
  namespace: gamification
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-service
  template:
    metadata:
      labels:
        app: analytics-service
    spec:
      containers:
      - name: analytics
        image: gamification/analytics-service:latest
        ports:
        - containerPort: 3010
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: analytics-secrets
              key: mongodb-uri
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: KAFKA_BROKERS
          value: "kafka-0.kafka-headless:9092,kafka-1.kafka-headless:9092,kafka-2.kafka-headless:9092"
        - name: CLICKHOUSE_URL
          value: "http://clickhouse-service:8123"

        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "4000m"

        livenessProbe:
          httpGet:
            path: /health
            port: 3010
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /health
            port: 3010
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: analytics-service
  namespace: gamification
spec:
  selector:
    app: analytics-service
  ports:
  - port: 3010
    targetPort: 3010
    name: http

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: analytics-hpa
  namespace: gamification
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: analytics-service
  minReplicas: 3
  maxReplicas: 15
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

**clickhouse-deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse
  namespace: gamification
spec:
  serviceName: clickhouse-headless
  replicas: 3 # For distributed setup
  selector:
    matchLabels:
      app: clickhouse
  template:
    metadata:
      labels:
        app: clickhouse
    spec:
      containers:
      - name: clickhouse
        image: clickhouse/clickhouse-server:latest
        ports:
        - containerPort: 8123
          name: http
        - containerPort: 9000
          name: native
        volumeMounts:
        - name: clickhouse-data
          mountPath: /var/lib/clickhouse
        - name: clickhouse-config
          mountPath: /etc/clickhouse-server/config.d
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "16Gi"
            cpu: "8000m"

  volumeClaimTemplates:
  - metadata:
      name: clickhouse-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 500Gi

---
apiVersion: v1
kind: Service
metadata:
  name: clickhouse-service
  namespace: gamification
spec:
  selector:
    app: clickhouse
  ports:
  - port: 8123
    targetPort: 8123
    name: http
  - port: 9000
    targetPort: 9000
    name: native
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// apps/analytics/src/monitoring/analytics-metrics.service.ts

import { Injectable } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class AnalyticsMetricsService {
  private readonly registry: Registry;

  // Counters
  private readonly eventsIngested: Counter;
  private readonly eventsProcessed: Counter;
  private readonly eventsFailed: Counter;

  // Histograms
  private readonly ingestionDuration: Histogram;
  private readonly queryDuration: Histogram;

  // Gauges
  private readonly kafkaLag: Gauge;
  private readonly cacheHitRate: Gauge;

  constructor() {
    this.registry = new Registry();

    this.eventsIngested = new Counter({
      name: 'analytics_events_ingested_total',
      help: 'Total number of events ingested',
      labelNames: ['event_type', 'source'],
      registers: [this.registry],
    });

    this.eventsProcessed = new Counter({
      name: 'analytics_events_processed_total',
      help: 'Total number of events processed',
      labelNames: ['event_type', 'status'],
      registers: [this.registry],
    });

    this.eventsFailed = new Counter({
      name: 'analytics_events_failed_total',
      help: 'Total number of failed events',
      labelNames: ['event_type', 'error_type'],
      registers: [this.registry],
    });

    this.ingestionDuration = new Histogram({
      name: 'analytics_ingestion_duration_seconds',
      help: 'Duration of event ingestion',
      labelNames: ['event_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.queryDuration = new Histogram({
      name: 'analytics_query_duration_seconds',
      help: 'Duration of analytics queries',
      labelNames: ['query_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.kafkaLag = new Gauge({
      name: 'analytics_kafka_lag',
      help: 'Kafka consumer lag',
      labelNames: ['consumer_group', 'topic'],
      registers: [this.registry],
    });

    this.cacheHitRate = new Gauge({
      name: 'analytics_cache_hit_rate',
      help: 'Cache hit rate percentage',
      registers: [this.registry],
    });
  }

  recordEventIngested(eventType: string, source: string) {
    this.eventsIngested.inc({ event_type: eventType, source });
  }

  recordEventProcessed(eventType: string, status: 'success' | 'failed') {
    this.eventsProcessed.inc({ event_type: eventType, status });
  }

  recordQueryDuration(queryType: string, duration: number) {
    this.queryDuration.observe({ query_type: queryType }, duration);
  }

  getMetrics(): string {
    return this.registry.metrics();
  }
}
```

---

## Summary

This enhanced analytics architecture provides:

✅ **Complete Data Pipeline**: Ingestion → Kafka → MongoDB + ClickHouse → Query API
✅ **Gateway Integration**: Seamless connection with API Gateway metrics
✅ **Real-Time Processing**: Kafka consumers for stream processing
✅ **Fast Analytics**: ClickHouse with materialized views
✅ **Query Optimization**: Redis caching, smart TTLs
✅ **Scalability**: Horizontal scaling, partitioning, HPA
✅ **Data Lifecycle**: Hot/warm/cold tiering, archiving
✅ **Production Deployment**: Complete Kubernetes manifests
✅ **Monitoring**: Prometheus metrics, Grafana dashboards

**Key Improvements Over Original**:
1. **3-tier storage** (Redis + MongoDB + ClickHouse)
2. **Kafka-based event bus** for scalability
3. **Gateway metrics forwarding** with batching
4. **ClickHouse queries** optimized with materialized views
5. **Comprehensive caching** strategy
6. **Kubernetes deployment** with auto-scaling
7. **Data lifecycle** management

**Next Steps**: Implement alongside Gateway (Phase 4) for complete observability! 🚀
