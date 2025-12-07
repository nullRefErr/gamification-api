import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SecurityLog } from '../schemas/security-log.schema';
import axios from 'axios';

interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface DeviceInfo {
  platform?: string;
  browser?: string;
  os?: string;
  deviceId?: string;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly geoCache = new Map<string, GeoLocation>();

  constructor(
    @InjectModel(SecurityLog.name)
    private readonly securityLogModel: Model<SecurityLog>
  ) {}

  /**
   * Log a security event
   */
  async logSecurityEvent(
    accountId: string,
    type: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      sessionId?: string;
      reason?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    try {
      const logId = this.generateLogId();
      const timestamp = new Date();

      let location: GeoLocation | undefined;
      if (metadata?.ipAddress) {
        location = await this.getGeoLocation(metadata.ipAddress);
      }

      const deviceInfo = metadata?.userAgent
        ? this.parseUserAgent(metadata.userAgent)
        : undefined;

      const securityLog = new this.securityLogModel({
        id: logId,
        accountId,
        type,
        timestamp,
        ipAddress: metadata?.ipAddress,
        deviceId: metadata?.deviceId || deviceInfo?.deviceId,
        location,
        userAgent: metadata?.userAgent,
        sessionId: metadata?.sessionId,
        reason: metadata?.reason,
        metadata: metadata || {},
      });

      await securityLog.save();
      this.logger.log(`Security event logged: ${type} for account ${accountId}`);
    } catch (error) {
      this.logger.error(
        `Failed to log security event: ${type} for account ${accountId}`,
        error
      );
      // Don't throw - logging failure shouldn't block operations
    }
  }

  /**
   * Detect suspicious activity based on login patterns
   */
  async detectSuspiciousActivity(
    accountId: string,
    ipAddress: string
  ): Promise<boolean> {
    try {
      // Get recent login attempts (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentLogs = await this.securityLogModel
        .find({
          accountId,
          type: { $in: ['login_success', 'login_failed'] },
          timestamp: { $gte: oneDayAgo },
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .exec();

      if (recentLogs.length === 0) {
        return false;
      }

      // Check 1: Login from new location
      const knownLocations = recentLogs
        .filter((log) => log.location?.country)
        .map((log) => log.location?.country);

      const currentLocation = await this.getGeoLocation(ipAddress);
      if (
        currentLocation?.country &&
        !knownLocations.includes(currentLocation.country)
      ) {
        this.logger.warn(
          `Suspicious activity: Login from new country ${currentLocation.country} for account ${accountId}`
        );
        return true;
      }

      // Check 2: Rapid login attempts (>5 in 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const rapidAttempts = recentLogs.filter(
        (log) => log.timestamp >= fifteenMinutesAgo
      );

      if (rapidAttempts.length > 5) {
        this.logger.warn(
          `Suspicious activity: ${rapidAttempts.length} login attempts in 15 minutes for account ${accountId}`
        );
        return true;
      }

      // Check 3: Multiple failed attempts followed by success
      const recentFailed = recentLogs
        .slice(0, 5)
        .filter((log) => log.type === 'login_failed');

      if (recentFailed.length >= 3) {
        this.logger.warn(
          `Suspicious activity: ${recentFailed.length} recent failed attempts for account ${accountId}`
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Failed to detect suspicious activity for account ${accountId}`,
        error
      );
      return false;
    }
  }

  /**
   * Get geolocation from IP address using ipapi.co
   */
  async getGeoLocation(ipAddress: string): Promise<GeoLocation> {
    // Check cache first
    if (this.geoCache.has(ipAddress)) {
      return this.geoCache.get(ipAddress)!;
    }

    // Skip localhost and private IPs
    if (
      ipAddress === '127.0.0.1' ||
      ipAddress === 'localhost' ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.')
    ) {
      return { city: 'Local', country: 'Local' };
    }

    try {
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, {
        timeout: 3000,
      });

      const location: GeoLocation = {
        city: response.data.city,
        region: response.data.region,
        country: response.data.country_name,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
      };

      // Cache for 1 hour
      this.geoCache.set(ipAddress, location);
      setTimeout(() => this.geoCache.delete(ipAddress), 60 * 60 * 1000);

      return location;
    } catch (error) {
      this.logger.warn(`Failed to get geolocation for IP ${ipAddress}`);
      return {};
    }
  }

  /**
   * Parse user agent string to extract device info
   */
  parseUserAgent(userAgent: string): DeviceInfo {
    const deviceInfo: DeviceInfo = {};

    // Browser detection
    if (userAgent.includes('Chrome')) {
      deviceInfo.browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      deviceInfo.browser = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      deviceInfo.browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      deviceInfo.browser = 'Edge';
    } else {
      deviceInfo.browser = 'Unknown';
    }

    // OS detection
    if (userAgent.includes('Windows')) {
      deviceInfo.os = 'Windows';
      deviceInfo.platform = 'desktop';
    } else if (userAgent.includes('Mac OS')) {
      deviceInfo.os = 'macOS';
      deviceInfo.platform = 'desktop';
    } else if (userAgent.includes('Linux')) {
      deviceInfo.os = 'Linux';
      deviceInfo.platform = 'desktop';
    } else if (userAgent.includes('Android')) {
      deviceInfo.os = 'Android';
      deviceInfo.platform = 'mobile';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      deviceInfo.os = 'iOS';
      deviceInfo.platform = 'mobile';
    } else {
      deviceInfo.os = 'Unknown';
      deviceInfo.platform = 'web';
    }

    return deviceInfo;
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `log_${timestamp}_${random}`;
  }

  /**
   * Get security logs for an account
   */
  async getSecurityLogs(
    accountId: string,
    limit: number = 50
  ): Promise<SecurityLog[]> {
    return this.securityLogModel
      .find({ accountId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}
