import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccountService } from '../services/account.service';
import { SecurityService } from '../services/security.service';

// Note: In production, you should create a separate AdminGuard that checks for admin role
// For now, we'll just use JWT auth

class SearchAccountsDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'pending_deletion', 'deleted'])
  status?: string;

  @IsOptional()
  @IsEnum(['free', 'pro', 'enterprise'])
  tier?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

class SuspendAccountDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number; // Duration in seconds, undefined for permanent suspension
}

@ApiTags('Admin Tools')
@Controller('api/v1/admin/accounts')
@UseGuards(JwtAuthGuard) // TODO: Add AdminGuard in production
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly accountService: AccountService,
    private readonly securityService: SecurityService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search accounts (Admin only)' })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'pending_deletion', 'deleted'] })
  @ApiQuery({ name: 'tier', required: false, enum: ['free', 'pro', 'enterprise'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of accounts',
    schema: {
      properties: {
        accounts: { type: 'array' },
        total: { type: 'number' },
        page: { type: 'number' },
        pages: { type: 'number' },
      },
    },
  })
  async searchAccounts(@Query() query: SearchAccountsDto) {
    const result = await this.accountService.searchAccounts({
      email: query.email,
      status: query.status,
      tier: query.tier,
      page: query.page || 1,
      limit: query.limit || 20,
    });

    return result;
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get account details (Admin only)' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Returns full account details' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccount(@Param('accountId') accountId: string) {
    const account = await this.accountService.findByIdOrThrow(accountId);

    // Return full account details (excluding sensitive fields)
    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...accountData } = account.toObject();

    return {
      account: accountData,
    };
  }

  @Post(':accountId/suspend')
  @ApiOperation({ summary: 'Suspend account (Admin only)' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account suspended successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async suspendAccount(
    @Param('accountId') accountId: string,
    @Body() suspendDto: SuspendAccountDto
  ) {
    const account = await this.accountService.suspendAccount(
      accountId,
      suspendDto.reason,
      suspendDto.duration
    );

    // Log admin action
    await this.securityService.logSecurityEvent(
      accountId,
      'account_suspended',
      {
        reason: suspendDto.reason,
        duration: suspendDto.duration,
        suspendedUntil: account.suspendedUntil,
      }
    );

    return {
      message: 'Account has been suspended',
      account: {
        id: account.id,
        status: account.status,
        suspendedReason: account.suspendedReason,
        suspendedUntil: account.suspendedUntil,
      },
    };
  }

  @Post(':accountId/unsuspend')
  @ApiOperation({ summary: 'Unsuspend account (Admin only)' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account unsuspended successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async unsuspendAccount(@Param('accountId') accountId: string) {
    const account = await this.accountService.unsuspendAccount(accountId);

    // Log admin action
    await this.securityService.logSecurityEvent(
      accountId,
      'account_unsuspended',
      {}
    );

    return {
      message: 'Account has been unsuspended',
      account: {
        id: account.id,
        status: account.status,
      },
    };
  }

  @Get(':accountId/security-logs')
  @ApiOperation({ summary: 'Get account security logs (Admin only)' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns security logs for account' })
  async getSecurityLogs(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: number
  ) {
    // This would require adding a method to SecurityService to fetch logs by account
    // For now, return a placeholder
    return {
      accountId,
      logs: [],
      message: 'Security log retrieval will be implemented with SecurityService.getLogsByAccountId()',
    };
  }

  @Get(':accountId/sessions')
  @ApiOperation({ summary: 'Get active sessions for account (Admin only)' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Returns active sessions' })
  async getSessions(@Param('accountId') accountId: string) {
    // This would require adding a method to SessionService to fetch sessions by account
    // For now, return a placeholder
    return {
      accountId,
      sessions: [],
      message: 'Session retrieval will be implemented with SessionService.getSessionsByAccountId()',
    };
  }

  @Post(':accountId/sessions/revoke-all')
  @ApiOperation({ summary: 'Revoke all sessions for account (Admin only)' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'All sessions revoked' })
  async revokeAllSessions(@Param('accountId') accountId: string) {
    // This would use SessionService.revokeAllSessions()
    // For now, return a placeholder
    return {
      message: 'Session revocation will be implemented with SessionService.revokeAllSessions()',
    };
  }
}
