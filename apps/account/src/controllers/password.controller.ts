import { Controller, Post, Body, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AccountService } from '../services/account.service';
import { SessionService } from '../services/session.service';
import { SecurityService } from '../services/security.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentAccount } from '../decorators/current-account.decorator';
import { Account } from '../schemas/account.schema';
import {
  ChangePasswordDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
} from '../dto/password.dto';

@ApiTags('Password Management')
@Controller('api/v1/accounts/password')
export class PasswordController {
  constructor(
    private readonly accountService: AccountService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
  ) {}

  @Post('change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentAccount() account: Account,
    @Body() changePasswordDto: ChangePasswordDto,
    @Ip() ipAddress: string
  ) {
    // Change password
    await this.accountService.changePassword(
      account.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );

    // Log security event
    await this.securityService.logSecurityEvent(
      account.id,
      'password_changed',
      { ipAddress }
    );

    // Optionally logout other sessions
    let sessionsRevoked = 0;
    if (changePasswordDto.logoutOtherSessions) {
      sessionsRevoked = await this.sessionService.revokeAllSessions(account.id);

      await this.securityService.logSecurityEvent(
        account.id,
        'sessions_revoked',
        { ipAddress, reason: 'password_change', sessionsRevoked }
      );
    }

    return {
      message: 'Password changed successfully',
      sessionsRevoked: changePasswordDto.logoutOtherSessions ? sessionsRevoked : 0,
    };
  }

  @Post('reset/request')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'If account exists, password reset email will be sent',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async requestPasswordReset(
    @Body() resetRequestDto: ResetPasswordRequestDto,
    @Ip() ipAddress: string
  ) {
    // Request password reset (doesn't reveal if email exists)
    await this.accountService.requestPasswordReset(resetRequestDto.email);

    // Log security event (even if account doesn't exist)
    await this.securityService.logSecurityEvent(
      'unknown',
      'password_reset_requested',
      {
        ipAddress,
        email: resetRequestDto.email,
      }
    );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent. Please check your email.',
    };
  }

  @Post('reset')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token, or weak password',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetPassword(
    @Body() resetDto: ResetPasswordDto,
    @Ip() ipAddress: string
  ) {
    // Reset password
    await this.accountService.resetPassword(resetDto.token, resetDto.newPassword);

    // Note: We can't easily get accountId from token without parsing JWT
    // Security event will be logged by AccountService

    return {
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  }
}
