import { Injectable, UnauthorizedException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccountService } from './account.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { SecurityService } from './security.service';
import { Account } from '../schemas/account.schema';
import { Session } from '../schemas/session.schema';

interface LoginResult {
  account: Account;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: Date;
  };
  session?: Session;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly maxLoginAttempts: number;
  private readonly accountLockoutDuration: number;

  private twoFactorService: any; // Will be injected later to avoid circular dependency

  constructor(
    private readonly accountService: AccountService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    private readonly securityService: SecurityService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    this.jwtRefreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    this.maxLoginAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS') || 5;
    this.accountLockoutDuration = this.configService.get<number>('ACCOUNT_LOCKOUT_DURATION') || 900; // 15 minutes
  }

  /**
   * Set TwoFactorService (to avoid circular dependency)
   */
  setTwoFactorService(twoFactorService: any): void {
    this.twoFactorService = twoFactorService;
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
    }
  ): Promise<LoginResult> {
    // Find account by email
    const account = await this.accountService.findByEmail(email);

    if (!account) {
      // Log failed attempt
      await this.securityService.logSecurityEvent(
        'unknown',
        'login_failed',
        {
          ...metadata,
          reason: 'Account not found',
        }
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (account.accountLockedUntil && account.accountLockedUntil > new Date()) {
      const remainingTime = Math.ceil(
        (account.accountLockedUntil.getTime() - Date.now()) / 1000
      );

      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingTime} seconds.`
      );
    }

    // Check if account is suspended
    if (account.status === 'suspended') {
      throw new UnauthorizedException('Account is suspended');
    }

    // Verify password
    if (!account.passwordHash) {
      throw new UnauthorizedException('Password authentication not available for this account');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      account.passwordHash
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      account.failedLoginAttempts += 1;

      // Lock account if max attempts exceeded
      if (account.failedLoginAttempts >= this.maxLoginAttempts) {
        const lockUntil = new Date();
        lockUntil.setSeconds(lockUntil.getSeconds() + this.accountLockoutDuration);
        account.accountLockedUntil = lockUntil;

        this.logger.warn(
          `Account ${account.id} locked until ${lockUntil} after ${account.failedLoginAttempts} failed attempts`
        );
      }

      await account.save();

      // Log failed attempt
      await this.securityService.logSecurityEvent(
        account.id,
        'login_failed',
        {
          ...metadata,
          reason: 'Invalid password',
        }
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts on successful password verification
    account.failedLoginAttempts = 0;
    account.accountLockedUntil = undefined;
    account.lastLoginAt = new Date();
    account.lastLoginIp = metadata?.ipAddress;

    await account.save();

    // Check for suspicious activity
    if (metadata?.ipAddress) {
      const isSuspicious = await this.securityService.detectSuspiciousActivity(
        account.id,
        metadata.ipAddress
      );

      if (isSuspicious) {
        await this.securityService.logSecurityEvent(
          account.id,
          'suspicious_activity',
          metadata
        );

        // Could send security alert email here
        // await this.emailService.sendSecurityAlertEmail(account, 'Login from new location');
      }
    }

    // Check if 2FA is enabled
    if (account.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = this.jwtService.sign(
        { accountId: account.id, purpose: '2fa' },
        { expiresIn: '5m' }
      );

      return {
        account,
        requiresTwoFactor: true,
        tempToken,
      };
    }

    // Generate tokens and create session
    const tokens = await this.generateTokens(account.id);
    const session = await this.sessionService.createSession(
      account.id,
      tokens.refreshToken,
      metadata
    );

    // Log successful login
    await this.securityService.logSecurityEvent(
      account.id,
      'login_success',
      {
        ...metadata,
        sessionId: session.id,
      }
    );

    return {
      account,
      tokens,
      session,
    };
  }

  /**
   * Complete login with 2FA code
   */
  async loginWith2FA(
    tempToken: string,
    code: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
    }
  ): Promise<LoginResult> {
    // Verify temp token
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired 2FA token');
    }

    if (payload.purpose !== '2fa') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    const account = await this.accountService.findByIdOrThrow(payload.accountId);

    if (!account.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify 2FA code
    if (this.twoFactorService) {
      const isCodeValid = await this.twoFactorService.verifyCode(account, code);
      if (!isCodeValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // Generate tokens and create session
    const tokens = await this.generateTokens(account.id);
    const session = await this.sessionService.createSession(
      account.id,
      tokens.refreshToken,
      metadata
    );

    // Log successful login
    await this.securityService.logSecurityEvent(
      account.id,
      'login_success',
      {
        ...metadata,
        sessionId: session.id,
        twoFactorUsed: true,
      }
    );

    return {
      account,
      tokens,
      session,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: Date;
  }> {
    // Verify refresh token and get session
    const session = await this.sessionService.verifyRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new tokens
    const newTokens = await this.generateTokens(session.accountId);

    // Update session with new refresh token
    await this.sessionService.updateRefreshToken(session.id, newTokens.refreshToken);

    return newTokens;
  }

  /**
   * Logout (revoke session)
   */
  async logout(
    accountId: string,
    sessionId?: string,
    logoutAllDevices?: boolean,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ message: string; sessionsRevoked: number }> {
    let sessionsRevoked = 0;

    if (logoutAllDevices) {
      // Revoke all sessions except current if specified
      sessionsRevoked = await this.sessionService.revokeAllSessions(
        accountId,
        sessionId
      );
    } else if (sessionId) {
      // Revoke specific session
      await this.sessionService.revokeSession(sessionId, accountId);
      sessionsRevoked = 1;
    }

    // Log logout event
    await this.securityService.logSecurityEvent(
      accountId,
      'logout',
      {
        ...metadata,
        sessionId,
        logoutAllDevices,
      }
    );

    return {
      message: 'Logged out successfully',
      sessionsRevoked,
    };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(accountId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: Date;
  }> {
    const payload = { accountId, type: 'access' };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign({ accountId, type: 'refresh' });

    // Calculate expiry time
    const expiresInSeconds = this.parseExpiryToSeconds(this.jwtExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
      expiresAt,
    };
  }

  /**
   * Parse JWT expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600; // Default to 1 hour
    }
  }

  /**
   * Validate account from JWT payload (used by JWT strategy)
   */
  async validateAccountFromToken(accountId: string): Promise<Account> {
    const account = await this.accountService.findById(accountId);

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    if (account.status === 'suspended') {
      throw new UnauthorizedException('Account is suspended');
    }

    if (account.status === 'pending_deletion' || account.status === 'deleted') {
      throw new UnauthorizedException('Account is not active');
    }

    return account;
  }
}
