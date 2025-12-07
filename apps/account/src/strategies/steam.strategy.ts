import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import { ConfigService } from '@nestjs/config';
import { AccountService } from '../services/account.service';
import { SecurityService } from '../services/security.service';

@Injectable()
export class SteamStrategy extends PassportStrategy(Strategy, 'steam') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly securityService: SecurityService,
  ) {
    super({
      returnURL: configService.get<string>('STEAM_RETURN_URL') || 'http://localhost:3000/api/v1/oauth/steam/callback',
      realm: configService.get<string>('STEAM_REALM') || 'http://localhost:3000',
      apiKey: configService.get<string>('STEAM_API_KEY'),
    });
  }

  async validate(
    identifier: string,
    profile: any,
    done: (error: any, user?: any) => void
  ): Promise<any> {
    try {
      // Steam OpenID identifier format: https://steamcommunity.com/openid/id/{STEAM_ID}
      const steamId = identifier.split('/').pop();

      if (!steamId) {
        return done(new Error('Invalid Steam identifier'), null);
      }

      // Steam doesn't provide email directly - we need to handle this differently
      // Option 1: Require email collection after Steam login
      // Option 2: Use Steam ID as a placeholder email until user updates

      const { displayName, photos } = profile;

      // Check if account is already linked by Steam ID
      const existingAccount = await this.accountService.findByOAuthProvider('steam', steamId);

      let account;

      if (!existingAccount) {
        // For new Steam accounts, we'll need to collect email separately
        // Create a placeholder account that requires email completion
        const placeholderEmail = `steam_${steamId}@placeholder.local`;

        account = await this.accountService.createAccount({
          email: placeholderEmail,
          password: '', // OAuth accounts don't have passwords initially
          firstName: displayName || 'Steam User',
          lastName: '',
        });

        // Link Steam account
        account.linkedAccounts = account.linkedAccounts || [];
        account.linkedAccounts.push({
          provider: 'steam',
          oauthId: steamId,
          email: undefined, // Steam doesn't provide email
          linkedAt: new Date(),
        });

        // Don't mark email as verified since it's a placeholder
        account.emailVerified = false;

        // Set avatar if available
        if (photos && photos.length > 0) {
          account.avatar = photos[0].value;
        }

        // Add metadata to indicate email collection is required
        account.metadata = {
          ...account.metadata,
          requiresEmailCompletion: true,
          steamId,
        };

        await account.save();

        // Log account creation
        await this.securityService.logSecurityEvent(
          account.id,
          'account_created',
          { provider: 'steam', oauthId: steamId }
        );
      } else {
        account = existingAccount;

        // Check if Steam is already linked
        const existingLink = account.linkedAccounts?.find(
          (link) => link.provider === 'steam' && link.oauthId === steamId
        );

        if (!existingLink) {
          // Link Steam account to existing account
          account.linkedAccounts = account.linkedAccounts || [];
          account.linkedAccounts.push({
            provider: 'steam',
            oauthId: steamId,
            email: undefined,
            linkedAt: new Date(),
          });

          await account.save();

          // Log OAuth link
          await this.securityService.logSecurityEvent(
            account.id,
            'oauth_linked',
            { provider: 'steam', oauthId: steamId }
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
