import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Session } from '../schemas/session.schema';
import { SecurityService } from './security.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly maxSessionsPerAccount: number;
  private readonly sessionExpiry: number;

  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    private readonly securityService: SecurityService,
    private readonly configService: ConfigService,
  ) {
    this.maxSessionsPerAccount = this.configService.get<number>('MAX_SESSIONS_PER_ACCOUNT') || 10;
    this.sessionExpiry = this.configService.get<number>('SESSION_EXPIRY') || 604800; // 7 days in seconds
  }

  /**
   * Create a new session
   */
  async createSession(
    accountId: string,
    refreshToken: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      platform?: string;
    }
  ): Promise<Session> {
    // Hash refresh token before storing
    const hashedRefreshToken = this.hashToken(refreshToken);

    // Parse device info from user agent
    const deviceInfo = metadata?.userAgent
      ? this.securityService.parseUserAgent(metadata.userAgent)
      : undefined;

    // Get geolocation from IP
    let location;
    if (metadata?.ipAddress) {
      location = await this.securityService.getGeoLocation(metadata.ipAddress);
    }

    // Generate session ID
    const sessionId = this.generateSessionId();

    // Calculate expiry
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.sessionExpiry * 1000);

    // Create session
    const session = new this.sessionModel({
      id: sessionId,
      accountId,
      refreshToken: hashedRefreshToken,
      deviceId: metadata?.deviceId || deviceInfo?.deviceId,
      platform: metadata?.platform || deviceInfo?.platform,
      browser: deviceInfo?.browser,
      os: deviceInfo?.os,
      ipAddress: metadata?.ipAddress,
      location,
      userAgent: metadata?.userAgent,
      createdAt,
      expiresAt,
      lastActivityAt: createdAt,
      revoked: false,
    });

    await session.save();

    // Enforce session limit per account
    await this.enforceSessionLimit(accountId);

    this.logger.log(`Session created for account ${accountId}: ${sessionId}`);

    return session;
  }

  /**
   * Verify refresh token and return session
   */
  async verifyRefreshToken(refreshToken: string): Promise<Session | null> {
    const hashedToken = this.hashToken(refreshToken);

    const session = await this.sessionModel.findOne({
      refreshToken: hashedToken,
    }).exec();

    if (!session) {
      return null;
    }

    // Check if session is revoked
    if (session.revoked) {
      this.logger.warn(`Attempted to use revoked session: ${session.id}`);
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.logger.warn(`Attempted to use expired session: ${session.id}`);
      return null;
    }

    // Update last activity
    session.lastActivityAt = new Date();
    await session.save();

    return session;
  }

  /**
   * Update refresh token for existing session
   */
  async updateRefreshToken(
    sessionId: string,
    newRefreshToken: string
  ): Promise<Session> {
    const session = await this.sessionModel.findOne({ id: sessionId }).exec();

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // Hash new refresh token
    session.refreshToken = this.hashToken(newRefreshToken);
    session.lastActivityAt = new Date();

    await session.save();

    return session;
  }

  /**
   * Get all active sessions for an account
   */
  async getActiveSessions(accountId: string): Promise<Session[]> {
    return this.sessionModel
      .find({
        accountId,
        revoked: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Revoke a single session
   */
  async revokeSession(sessionId: string, accountId: string): Promise<void> {
    const session = await this.sessionModel.findOne({
      id: sessionId,
      accountId,
    }).exec();

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    session.revoked = true;
    session.revokedAt = new Date();

    await session.save();

    this.logger.log(`Session revoked: ${sessionId} for account ${accountId}`);
  }

  /**
   * Revoke all sessions for an account
   */
  async revokeAllSessions(
    accountId: string,
    excludeSessionId?: string
  ): Promise<number> {
    const filter: any = {
      accountId,
      revoked: false,
    };

    if (excludeSessionId) {
      filter.id = { $ne: excludeSessionId };
    }

    const result = await this.sessionModel.updateMany(
      filter,
      {
        revoked: true,
        revokedAt: new Date(),
      }
    ).exec();

    this.logger.log(
      `Revoked ${result.modifiedCount} sessions for account ${accountId}`
    );

    return result.modifiedCount;
  }

  /**
   * Enforce maximum sessions per account
   * Revoke oldest sessions if limit exceeded
   */
  private async enforceSessionLimit(accountId: string): Promise<void> {
    const activeSessions = await this.sessionModel
      .find({
        accountId,
        revoked: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: 1 }) // Oldest first
      .exec();

    if (activeSessions.length > this.maxSessionsPerAccount) {
      const sessionsToRevoke = activeSessions.length - this.maxSessionsPerAccount;
      const oldestSessions = activeSessions.slice(0, sessionsToRevoke);

      for (const session of oldestSessions) {
        session.revoked = true;
        session.revokedAt = new Date();
        await session.save();
      }

      this.logger.warn(
        `Revoked ${sessionsToRevoke} oldest sessions for account ${accountId} (limit: ${this.maxSessionsPerAccount})`
      );
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    return this.sessionModel.findOne({ id: sessionId }).exec();
  }

  /**
   * Count active sessions for an account
   */
  async countActiveSessions(accountId: string): Promise<number> {
    return this.sessionModel.countDocuments({
      accountId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  /**
   * Hash token using SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Clean up expired sessions (can be run as a cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionModel.deleteMany({
      expiresAt: { $lt: new Date() },
    }).exec();

    this.logger.log(`Cleaned up ${result.deletedCount} expired sessions`);

    return result.deletedCount;
  }
}
