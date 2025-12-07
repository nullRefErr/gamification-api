import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { AccountService } from '../services/account.service';
import {
  LoginDto,
  LoginWith2FADto,
  RefreshTokenDto,
  LogoutDto,
} from '../dto/auth.dto';
import {
  CreateAccountDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from '../dto/account.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentAccount } from '../decorators/current-account.decorator';
import { Account } from '../schemas/account.schema';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('api/v1/accounts')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountService: AccountService,
  ) {}

  /**
   * Register new account
   */
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  async register(
    @Body() createAccountDto: CreateAccountDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const account = await this.accountService.createAccount({
      email: createAccountDto.email,
      password: createAccountDto.password,
      firstName: createAccountDto.firstName,
      lastName: createAccountDto.lastName,
      dateOfBirth: createAccountDto.dateOfBirth
        ? new Date(createAccountDto.dateOfBirth)
        : undefined,
      referralCode: createAccountDto.referralCode,
    });

    return {
      account: {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        emailVerified: account.emailVerified,
        status: account.status,
        createdAt: account.createdAt,
      },
      message:
        'Account created successfully. Please check your email to verify your account.',
    };
  }

  /**
   * Verify email address
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const account = await this.accountService.verifyEmail(verifyEmailDto.token);

    return {
      account: {
        id: account.id,
        email: account.email,
        emailVerified: account.emailVerified,
        verifiedAt: account.emailVerifiedAt,
      },
      message: 'Email verified successfully',
    };
  }

  /**
   * Resend verification email
   */
  @Post('resend-verification')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    const account = await this.accountService.findByEmail(
      resendVerificationDto.email,
    );

    if (!account) {
      // Don't reveal if email doesn't exist
      return {
        message: 'If the email exists, a verification link has been sent',
      };
    }

    if (account.emailVerified) {
      return {
        message: 'Email is already verified',
      };
    }

    await this.accountService.generateVerificationToken(
      account.id,
      'email_verification',
    );

    return {
      message: 'Verification email sent',
    };
  }

  /**
   * Login with email and password
   */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
      {
        ipAddress,
        userAgent,
        deviceId: loginDto.deviceId,
      },
    );

    // If 2FA is required
    if (result.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        tempToken: result.tempToken,
        message: 'Two-factor authentication required',
      };
    }

    // Return full login response
    return {
      account: {
        id: result.account.id,
        email: result.account.email,
        firstName: result.account.firstName,
        lastName: result.account.lastName,
        emailVerified: result.account.emailVerified,
        twoFactorEnabled: result.account.twoFactorEnabled,
      },
      tokens: result.tokens,
      session: {
        sessionId: result.session?.id,
        deviceId: result.session?.deviceId,
        createdAt: result.session?.createdAt,
      },
    };
  }

  /**
   * Complete login with 2FA code
   */
  @Post('login/2fa')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with 2FA code' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async loginWith2FA(
    @Body() loginWith2FADto: LoginWith2FADto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.loginWith2FA(
      loginWith2FADto.tempToken,
      loginWith2FADto.code,
      {
        ipAddress,
        userAgent,
      },
    );

    return {
      account: {
        id: result.account.id,
        email: result.account.email,
        twoFactorEnabled: result.account.twoFactorEnabled,
      },
      tokens: result.tokens,
    };
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
    );

    return {
      tokens,
    };
  }

  /**
   * Logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from current or all sessions' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentAccount() account: Account,
    @Body() logoutDto: LogoutDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.logout(
      account.id,
      logoutDto.sessionId,
      logoutDto.logoutAllDevices,
      {
        ipAddress,
        userAgent,
      },
    );

    return {
      message: result.message,
      sessionId: logoutDto.sessionId,
      sessionsRevoked: result.sessionsRevoked,
      loggedOutAt: new Date().toISOString(),
    };
  }

  /**
   * Get current account profile
   */
  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated account' })
  @ApiResponse({ status: 200, description: 'Account retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentAccount() account: Account) {
    return {
      account: {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        emailVerified: account.emailVerified,
        phoneNumber: account.phoneNumber,
        phoneVerified: account.phoneVerified,
        twoFactorEnabled: account.twoFactorEnabled,
        preferences: account.preferences,
        subscription: {
          tier: account.subscription?.tier,
          status: account.subscription?.status,
          currentPeriodEnd: account.subscription?.currentPeriodEnd,
        },
        status: account.status,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
      },
    };
  }
}
