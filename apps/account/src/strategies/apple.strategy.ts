import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AccountService } from '../services/account.service';
import { SecurityService } from '../services/security.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly securityService: SecurityService,
  ) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyLocation: configService.get<string>('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL') || 'http://localhost:3000/api/v1/oauth/apple/callback',
      scope: ['email', 'name'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: (error: any, user?: any) => void
  ): Promise<any> {
    try {
      // Apple provides limited profile data
      const { sub: oauthId, email } = idToken;

      if (!email) {
        return done(new Error('No email provided by Apple'), null);
      }

      // Find or create account
      let account = await this.accountService.findByEmail(email);

      if (!account) {
        // Apple provides name only on first authorization
        const firstName = profile?.name?.firstName || '';
        const lastName = profile?.name?.lastName || '';

        // Create new account with Apple OAuth
        account = await this.accountService.createAccount({
          email,
          password: '', // OAuth accounts don't have passwords initially
          firstName,
          lastName,
        });

        // Link Apple account
        account.linkedAccounts = account.linkedAccounts || [];
        account.linkedAccounts.push({
          provider: 'apple',
          oauthId: oauthId,
          email: email,
          linkedAt: new Date(),
        });

        // Mark email as verified (trusted OAuth provider)
        account.emailVerified = true;
        account.emailVerifiedAt = new Date();

        await account.save();

        // Log account creation
        await this.securityService.logSecurityEvent(
          account.id,
          'account_created',
          { provider: 'apple', oauthId }
        );
      } else {
        // Check if Apple is already linked
        const existingLink = account.linkedAccounts?.find(
          (link) => link.provider === 'apple' && link.oauthId === oauthId
        );

        if (!existingLink) {
          // Link Apple account to existing account
          account.linkedAccounts = account.linkedAccounts || [];
          account.linkedAccounts.push({
            provider: 'apple',
            oauthId: oauthId,
            email: email,
            linkedAt: new Date(),
          });

          // Mark email as verified if not already
          if (!account.emailVerified) {
            account.emailVerified = true;
            account.emailVerifiedAt = new Date();
          }

          await account.save();

          // Log OAuth link
          await this.securityService.logSecurityEvent(
            account.id,
            'oauth_linked',
            { provider: 'apple', oauthId }
          );
        }
      }

      // Return account for Passport
      done(null, account);
    } catch (error) {
      done(error, null);
    }
  }
}
