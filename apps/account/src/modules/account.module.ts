import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

// Schemas
import { Account, AccountSchema } from '../schemas/account.schema';
import { Session, SessionSchema } from '../schemas/session.schema';
import { SecurityLog, SecurityLogSchema } from '../schemas/security-log.schema';
import { VerificationToken, VerificationTokenSchema } from '../schemas/verification-token.schema';

// Services
import { PasswordService } from '../services/password.service';
import { EmailService } from '../services/email.service';
import { SecurityService } from '../services/security.service';
import { AccountService } from '../services/account.service';
import { SessionService } from '../services/session.service';
import { AuthService } from '../services/auth.service';
import { TwoFactorService } from '../services/two-factor.service';
import { SubscriptionService } from '../services/subscription.service';

// Strategies
import { JwtStrategy } from '../strategies/jwt.strategy';
import { GoogleStrategy } from '../strategies/google.strategy';
import { FacebookStrategy } from '../strategies/facebook.strategy';
import { AppleStrategy } from '../strategies/apple.strategy';
import { DiscordStrategy } from '../strategies/discord.strategy';
import { SteamStrategy } from '../strategies/steam.strategy';

// Controllers
import { AuthController } from '../controllers/auth.controller';
import { TwoFactorController } from '../controllers/two-factor.controller';
import { PasswordController } from '../controllers/password.controller';
import { OAuthController } from '../controllers/oauth.controller';
import { ProfileController } from '../controllers/profile.controller';
import { SubscriptionController } from '../controllers/subscription.controller';
import { AdminController } from '../controllers/admin.controller';
import { HealthController } from '../controllers/health.controller';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/account/.env'],
    }),

    // MongoDB Schemas
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Session.name, schema: SessionSchema },
      { name: SecurityLog.name, schema: SecurityLogSchema },
      { name: VerificationToken.name, schema: VerificationTokenSchema },
    ]),

    // Passport Module
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT Module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key-please-change',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '1h') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting Module
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: configService.get<number>('RATE_LIMIT_LOGIN_TTL') || 60000,
            limit: configService.get<number>('RATE_LIMIT_LOGIN_LIMIT') || 10,
          },
          {
            name: 'long',
            ttl: configService.get<number>('RATE_LIMIT_REGISTER_TTL') || 3600000,
            limit: configService.get<number>('RATE_LIMIT_REGISTER_LIMIT') || 3,
          },
        ],
      }),
      inject: [ConfigService],
    }),
  ],

  controllers: [
    AuthController,
    TwoFactorController,
    PasswordController,
    OAuthController,
    ProfileController,
    SubscriptionController,
    AdminController,
    HealthController,
  ],

  providers: [
    // Core Services
    PasswordService,
    EmailService,
    SecurityService,
    AccountService,
    SessionService,
    AuthService,
    TwoFactorService,
    SubscriptionService,

    // Strategies
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    AppleStrategy,
    DiscordStrategy,
    SteamStrategy,
  ],

  exports: [
    // Export MongooseModule for use in other services
    MongooseModule,

    // Export core services for use in other modules/microservices
    PasswordService,
    EmailService,
    SecurityService,
    AccountService,
    SessionService,
    AuthService,
    TwoFactorService,
    SubscriptionService,

    // Export JwtModule for authentication
    JwtModule,
  ],
})
export class AccountModule {}
