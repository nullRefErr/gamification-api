import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from '../schemas/account.schema';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'account-service',
      version: '1.0.0',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (includes DB connection)' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readinessCheck() {
    try {
      // Check MongoDB connection
      await this.accountModel.db.db.admin().ping();

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'connected',
        },
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'disconnected',
          error: error.message,
        },
      };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  livenessCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('metrics')
  @ApiExcludeEndpoint()
  async metrics() {
    try {
      const totalAccounts = await this.accountModel.countDocuments();
      const activeAccounts = await this.accountModel.countDocuments({ status: 'active' });
      const suspendedAccounts = await this.accountModel.countDocuments({ status: 'suspended' });
      const verifiedAccounts = await this.accountModel.countDocuments({ emailVerified: true });
      const twoFactorEnabled = await this.accountModel.countDocuments({ twoFactorEnabled: true });

      // Subscription metrics
      const freeUsers = await this.accountModel.countDocuments({ 'subscription.tier': 'free' });
      const proUsers = await this.accountModel.countDocuments({ 'subscription.tier': 'pro' });
      const enterpriseUsers = await this.accountModel.countDocuments({ 'subscription.tier': 'enterprise' });

      return {
        timestamp: new Date().toISOString(),
        accounts: {
          total: totalAccounts,
          active: activeAccounts,
          suspended: suspendedAccounts,
          verified: verifiedAccounts,
          twoFactorEnabled,
        },
        subscriptions: {
          free: freeUsers,
          pro: proUsers,
          enterprise: enterpriseUsers,
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          environment: this.configService.get('NODE_ENV'),
        },
      };
    } catch (error) {
      return {
        error: 'Failed to fetch metrics',
        message: error.message,
      };
    }
  }
}
