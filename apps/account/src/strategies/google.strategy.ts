import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AccountService } from '../services/account.service';
import { SecurityService } from '../services/security.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly securityService: SecurityService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/v1/oauth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      const { id, emails, name, photos } = profile;

      if (!emails || emails.length === 0) {
        return done(new Error('No email provided by Google'), null);
      }

      const email = emails[0].value;

      // Find or create account
      let account = await this.accountService.findByEmail(email);

      if (!account) {
        // Create new account with Google OAuth
        account = await this.accountService.createAccount({
          email,
          password: '', // OAuth accounts don't have passwords initially
          firstName: name?.givenName || '',
          lastName: name?.familyName || '',
        });

        // Link Google account
        account.linkedAccounts = account.linkedAccounts || [];
        account.linkedAccounts.push({
          provider: 'google',
          oauthId: id,
          email: email,
          linkedAt: new Date(),
        });

        // Mark email as verified (trusted OAuth provider)
        account.emailVerified = true;
        account.emailVerifiedAt = new Date();

        // Set avatar if available
        if (photos && photos.length > 0) {
          account.avatar = photos[0].value;
        }

        await account.save();

        // Log account creation
        await this.securityService.logSecurityEvent(
          account.id,
          'account_created',
          { provider: 'google', oauthId: id }
        );
      } else {
        // Check if Google is already linked
        const existingLink = account.linkedAccounts?.find(
          (link) => link.provider === 'google' && link.oauthId === id
        );

        if (!existingLink) {
          // Link Google account to existing account
          account.linkedAccounts = account.linkedAccounts || [];
          account.linkedAccounts.push({
            provider: 'google',
            oauthId: id,
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
            { provider: 'google', oauthId: id }
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
