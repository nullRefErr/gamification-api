import { Controller, Get, Put, Post, Body, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentAccount } from '../decorators/current-account.decorator';
import { Account } from '../schemas/account.schema';
import { AccountService } from '../services/account.service';
import { SecurityService } from '../services/security.service';
import {
  UpdateProfileDto,
  UpdatePreferencesDto,
  RequestEmailChangeDto,
  VerifyEmailChangeDto,
  RequestAccountDeletionDto,
  CancelAccountDeletionDto,
} from '../dto/profile.dto';

@ApiTags('Profile Management')
@Controller('api/v1/accounts/profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(
    private readonly accountService: AccountService,
    private readonly securityService: SecurityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current account profile' })
  @ApiResponse({ status: 200, description: 'Returns account profile' })
  async getProfile(@CurrentAccount() account: Account) {
    // Return account without sensitive fields
    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...profile } = account.toObject();

    return {
      profile,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update account profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid profile data' })
  async updateProfile(
    @CurrentAccount() account: Account,
    @Body() updateProfileDto: UpdateProfileDto,
    @Ip() ipAddress: string
  ) {
    // Update profile fields
    if (updateProfileDto.firstName !== undefined) {
      account.firstName = updateProfileDto.firstName;
    }
    if (updateProfileDto.lastName !== undefined) {
      account.lastName = updateProfileDto.lastName;
    }
    if (updateProfileDto.dateOfBirth !== undefined) {
      account.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }
    if (updateProfileDto.bio !== undefined) {
      account.bio = updateProfileDto.bio;
    }
    if (updateProfileDto.avatar !== undefined) {
      account.avatar = updateProfileDto.avatar;
    }
    if (updateProfileDto.phoneNumber !== undefined) {
      account.phoneNumber = updateProfileDto.phoneNumber;
    }

    await account.save();

    // Log security event
    await this.securityService.logSecurityEvent(
      account.id,
      'profile_updated',
      { ipAddress, fields: Object.keys(updateProfileDto) }
    );

    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...profile } = account.toObject();

    return {
      message: 'Profile updated successfully',
      profile,
    };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update account preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @CurrentAccount() account: Account,
    @Body() updatePreferencesDto: UpdatePreferencesDto
  ) {
    // Update preferences
    if (updatePreferencesDto.language !== undefined) {
      account.preferences.language = updatePreferencesDto.language;
    }
    if (updatePreferencesDto.timezone !== undefined) {
      account.preferences.timezone = updatePreferencesDto.timezone;
    }
    if (updatePreferencesDto.emailNotifications !== undefined) {
      account.preferences.notifications.email = updatePreferencesDto.emailNotifications;
    }
    if (updatePreferencesDto.pushNotifications !== undefined) {
      account.preferences.notifications.push = updatePreferencesDto.pushNotifications;
    }
    if (updatePreferencesDto.smsNotifications !== undefined) {
      account.preferences.notifications.sms = updatePreferencesDto.smsNotifications;
    }

    await account.save();

    return {
      message: 'Preferences updated successfully',
      preferences: account.preferences,
    };
  }

  @Post('email/change/request')
  @ApiOperation({ summary: 'Request email change' })
  @ApiResponse({
    status: 200,
    description: 'Email change verification sent to new email address',
  })
  @ApiResponse({ status: 400, description: 'Invalid password or email already in use' })
  async requestEmailChange(
    @CurrentAccount() account: Account,
    @Body() requestEmailChangeDto: RequestEmailChangeDto,
    @Ip() ipAddress: string
  ) {
    await this.accountService.requestEmailChange(
      account.id,
      requestEmailChangeDto.newEmail,
      requestEmailChangeDto.password
    );

    // Log security event
    await this.securityService.logSecurityEvent(
      account.id,
      'email_change_requested',
      {
        ipAddress,
        oldEmail: account.email,
        newEmail: requestEmailChangeDto.newEmail,
      }
    );

    return {
      message: `A verification email has been sent to ${requestEmailChangeDto.newEmail}. Please check your inbox and click the link to complete the email change.`,
    };
  }

  @Post('email/change/verify')
  @ApiOperation({ summary: 'Verify and complete email change' })
  @ApiResponse({ status: 200, description: 'Email changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmailChange(
    @Body() verifyEmailChangeDto: VerifyEmailChangeDto,
    @Ip() ipAddress: string
  ) {
    const account = await this.accountService.verifyEmailChange(verifyEmailChangeDto.token);

    // Log security event
    await this.securityService.logSecurityEvent(
      account.id,
      'email_changed',
      { ipAddress, newEmail: account.email }
    );

    return {
      message: 'Email address has been successfully changed',
      newEmail: account.email,
    };
  }

  @Post('deletion/request')
  @ApiOperation({ summary: 'Request account deletion (30-day grace period)' })
  @ApiResponse({
    status: 200,
    description: 'Account deletion scheduled',
    schema: {
      properties: {
        message: { type: 'string' },
        deletionScheduledAt: { type: 'string', format: 'date-time' },
        permanentDeletionAt: { type: 'string', format: 'date-time' },
        gracePeriodDays: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  async requestAccountDeletion(
    @CurrentAccount() account: Account,
    @Body() requestDeletionDto: RequestAccountDeletionDto,
    @Ip() ipAddress: string
  ) {
    const result = await this.accountService.scheduleAccountDeletion(
      account.id,
      requestDeletionDto.password,
      requestDeletionDto.reason
    );

    // Log security event
    await this.securityService.logSecurityEvent(
      account.id,
      'account_deletion_scheduled',
      {
        ipAddress,
        reason: requestDeletionDto.reason,
        permanentDeletionAt: result.permanentDeletionAt,
      }
    );

    return {
      message: 'Account deletion has been scheduled. You have 30 days to cancel this request.',
      deletionScheduledAt: result.deletionScheduledAt,
      permanentDeletionAt: result.permanentDeletionAt,
      gracePeriodDays: 30,
    };
  }

  @Post('deletion/cancel')
  @ApiOperation({ summary: 'Cancel scheduled account deletion' })
  @ApiResponse({ status: 200, description: 'Account deletion cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Account is not scheduled for deletion or invalid password' })
  async cancelAccountDeletion(
    @CurrentAccount() account: Account,
    @Body() cancelDeletionDto: CancelAccountDeletionDto,
    @Ip() ipAddress: string
  ) {
    await this.accountService.cancelAccountDeletion(account.id, cancelDeletionDto.password);

    // Log security event
    await this.securityService.logSecurityEvent(
      account.id,
      'account_deletion_cancelled',
      { ipAddress }
    );

    return {
      message: 'Account deletion has been cancelled successfully',
    };
  }

  @Get('linked-accounts')
  @ApiOperation({ summary: 'Get linked OAuth accounts' })
  @ApiResponse({ status: 200, description: 'Returns list of linked accounts' })
  async getLinkedAccounts(@CurrentAccount() account: Account) {
    const linkedAccounts = account.linkedAccounts?.map((link) => ({
      provider: link.provider,
      linkedAt: link.linkedAt,
      email: link.email,
    })) || [];

    return {
      linkedAccounts,
      hasPassword: !!account.passwordHash,
    };
  }
}
