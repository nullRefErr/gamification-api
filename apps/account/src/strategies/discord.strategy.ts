import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-discord';
import { ConfigService } from '@nestjs/config';
import { AccountService } from '../services/account.service';
import { SecurityService } from '../services/security.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly securityService: SecurityService,
  ) {
    super({
      clientID: configService.get<string>('DISCORD_CLIENT_ID'),
      clientSecret: configService.get<string>('DISCORD_CLIENT_SECRET'),
      callbackURL: configService.get<string>('DISCORD_CALLBACK_URL') || 'http://localhost:3000/api/v1/oauth/discord/callback',
      scope: ['identify', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void
  ): Promise<any> {
    try {
      const { id, username, email, avatar } = profile;

      if (!email) {
        return done(new Error('No email provided by Discord'), null);
      }

      // Find or create account
      let account = await this.accountService.findByEmail(email);

      if (!account) {
        // Discord doesn't provide separate first/last name
        // Use username as first name
        const firstName = username || '';
        const lastName = '';

        // Create new account with Discord OAuth
        account = await this.accountService.createAccount({
          email,
          password: '', // OAuth accounts don't have passwords initially
          firstName,
          lastName,
        });

        // Link Discord account
        account.linkedAccounts = account.linkedAccounts || [];
        account.linkedAccounts.push({
          provider: 'discord',
          oauthId: id,
          email: email,
          linkedAt: new Date(),
        });

        // Mark email as verified (trusted OAuth provider)
        account.emailVerified = true;
        account.emailVerifiedAt = new Date();

        // Set avatar if available
        if (avatar) {
          account.avatar = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
        }

        await account.save();

        // Log account creation
        await this.securityService.logSecurityEvent(
          account.id,
          'account_created',
          { provider: 'discord', oauthId: id }
        );
      } else {
        // Check if Discord is already linked
        const existingLink = account.linkedAccounts?.find(
          (link) => link.provider === 'discord' && link.oauthId === id
        );

        if (!existingLink) {
          // Link Discord account to existing account
          account.linkedAccounts = account.linkedAccounts || [];
          account.linkedAccounts.push({
            provider: 'discord',
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
            { provider: 'discord', oauthId: id }
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
