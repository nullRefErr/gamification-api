import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AccountService } from '../services/account.service';
import { SecurityService } from '../services/security.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly securityService: SecurityService,
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || 'http://localhost:3000/api/v1/oauth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'photos'],
      scope: ['email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void
  ): Promise<any> {
    try {
      const { id, emails, name, photos } = profile;

      if (!emails || emails.length === 0) {
        return done(new Error('No email provided by Facebook'), null);
      }

      const email = emails[0].value;

      // Find or create account
      let account = await this.accountService.findByEmail(email);

      if (!account) {
        // Create new account with Facebook OAuth
        account = await this.accountService.createAccount({
          email,
          password: '', // OAuth accounts don't have passwords initially
          firstName: name?.givenName || '',
          lastName: name?.familyName || '',
        });

        // Link Facebook account
        account.linkedAccounts = account.linkedAccounts || [];
        account.linkedAccounts.push({
          provider: 'facebook',
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
          { provider: 'facebook', oauthId: id }
        );
      } else {
        // Check if Facebook is already linked
        const existingLink = account.linkedAccounts?.find(
          (link) => link.provider === 'facebook' && link.oauthId === id
        );

        if (!existingLink) {
          // Link Facebook account to existing account
          account.linkedAccounts = account.linkedAccounts || [];
          account.linkedAccounts.push({
            provider: 'facebook',
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
            { provider: 'facebook', oauthId: id }
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
