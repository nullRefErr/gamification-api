import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TwoFactorService } from '../services/two-factor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentAccount } from '../decorators/current-account.decorator';
import { Account } from '../schemas/account.schema';
import {
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
  RegenerateBackupCodesDto,
} from '../dto/two-factor.dto';

@ApiTags('Two-Factor Authentication')
@Controller('api/v1/accounts/2fa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('enable')
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @ApiResponse({
    status: 201,
    description: 'Returns TOTP secret, QR code, and backup codes',
    schema: {
      properties: {
        secret: { type: 'string', example: 'JBSWY3DPEHPK3PXP' },
        qrCode: { type: 'string', description: 'QR code data URL' },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          example: ['ABCD-EFGH-IJKL', 'MNOP-QRST-UVWX'],
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  async enable2FA(@CurrentAccount() account: Account) {
    const result = await this.twoFactorService.enable2FA(account.id);

    return {
      ...result,
      message:
        'Two-factor authentication setup initiated. Please verify with the code from your authenticator app to complete activation.',
    };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify and activate two-factor authentication' })
  @ApiResponse({
    status: 200,
    description: '2FA activated successfully',
    schema: {
      properties: {
        message: { type: 'string' },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'New backup codes (store securely)',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '2FA already enabled or not initiated' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async verify2FA(
    @CurrentAccount() account: Account,
    @Body() verifyDto: VerifyTwoFactorDto
  ) {
    const result = await this.twoFactorService.verify2FA(account.id, verifyDto.code);

    return {
      message: 'Two-factor authentication has been successfully enabled',
      backupCodes: result.backupCodes,
    };
  }

  @Post('disable')
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: '2FA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid password or 2FA code' })
  async disable2FA(
    @CurrentAccount() account: Account,
    @Body() disableDto: DisableTwoFactorDto
  ) {
    await this.twoFactorService.disable2FA(
      account.id,
      disableDto.password,
      disableDto.code
    );

    return {
      message: 'Two-factor authentication has been disabled',
    };
  }

  @Post('backup-codes/regenerate')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({
    status: 200,
    description: 'New backup codes generated',
    schema: {
      properties: {
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          example: ['ABCD-EFGH-IJKL', 'MNOP-QRST-UVWX'],
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '2FA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async regenerateBackupCodes(
    @CurrentAccount() account: Account,
    @Body() regenerateDto: RegenerateBackupCodesDto
  ) {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(
      account.id,
      regenerateDto.password
    );

    return {
      backupCodes,
      message:
        'New backup codes have been generated. Store them securely - they replace your previous backup codes.',
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get two-factor authentication status' })
  @ApiResponse({
    status: 200,
    description: '2FA status information',
    schema: {
      properties: {
        enabled: { type: 'boolean' },
        backupCodesRemaining: { type: 'number' },
      },
    },
  })
  async get2FAStatus(@CurrentAccount() account: Account) {
    const backupCodesRemaining = await this.twoFactorService.getBackupCodesCount(
      account.id
    );

    return {
      enabled: account.twoFactorEnabled,
      backupCodesRemaining,
    };
  }
}
