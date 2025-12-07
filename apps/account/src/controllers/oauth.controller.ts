import { Controller, Get, Post, UseGuards, Req, Res, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentAccount } from '../decorators/current-account.decorator';
import { Account } from '../schemas/account.schema';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { SecurityService } from '../services/security.service';

@ApiTags('OAuth')
@Controller('api/v1/oauth')
export class OAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
  ) {}

  // ============================================
  // GOOGLE OAUTH
  // ============================================
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res, 'google');
  }

  // ============================================
  // FACEBOOK OAUTH
  // ============================================
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Facebook OAuth' })
  facebookAuth() {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookAuthCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res, 'facebook');
  }

  // ============================================
  // APPLE OAUTH
  // ============================================
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Apple OAuth' })
  appleAuth() {
    // Guard redirects to Apple
  }

  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  async appleAuthCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res, 'apple');
  }

  // ============================================
  // DISCORD OAUTH
  // ============================================
  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  @ApiOperation({ summary: 'Initiate Discord OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Discord OAuth' })
  discordAuth() {
    // Guard redirects to Discord
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  @ApiOperation({ summary: 'Discord OAuth callback' })
  async discordAuthCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res, 'discord');
  }

  // ============================================
  // STEAM OAUTH
  // ============================================
  @Get('steam')
  @UseGuards(AuthGuard('steam'))
  @ApiOperation({ summary: 'Initiate Steam OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Steam OAuth' })
  steamAuth() {
    // Guard redirects to Steam
  }

  @Get('steam/callback')
  @UseGuards(AuthGuard('steam'))
  @ApiOperation({ summary: 'Steam OAuth callback' })
  async steamAuthCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res, 'steam');
  }

  // ============================================
  // OAUTH MANAGEMENT
  // ============================================
  @Post(':provider/unlink')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink OAuth provider from account' })
  @ApiParam({ name: 'provider', enum: ['google', 'facebook', 'apple', 'discord', 'steam'] })
  @ApiResponse({ status: 200, description: 'OAuth provider unlinked successfully' })
  @ApiResponse({ status: 400, description: 'Provider not linked or cannot unlink' })
  async unlinkProvider(
    @CurrentAccount() account: Account,
    @Param('provider') provider: string
  ) {
    // Check if provider is linked
    const linkedAccount = account.linkedAccounts?.find(
      (link) => link.provider === provider
    );

    if (!linkedAccount) {
      throw new Error(`${provider} is not linked to this account`);
    }

    // Ensure account has password or other OAuth provider
    // Don't allow unlinking the only authentication method
    const hasPassword = !!account.passwordHash;
    const otherOAuthProviders = account.linkedAccounts?.filter(
      (link) => link.provider !== provider
    );

    if (!hasPassword && (!otherOAuthProviders || otherOAuthProviders.length === 0)) {
      throw new Error(
        'Cannot unlink the only authentication method. Please set a password or link another provider first.'
      );
    }

    // Remove the linked account
    account.linkedAccounts = account.linkedAccounts?.filter(
      (link) => link.provider !== provider
    ) || [];

    await account.save();

    // Log security event
    await this.securityService.logSecurityEvent(
      account.id,
      'oauth_unlinked',
      { provider }
    );

    return {
      message: `${provider} has been unlinked from your account`,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private async handleOAuthCallback(req: Request, res: Response, provider: string) {
    try {
      const account = req.user as Account;

      if (!account) {
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        return res.redirect(`${frontendUrl}/auth/error?reason=oauth_failed`);
      }

      // Generate JWT tokens
      const tokens = await this.authService['generateTokens'](account.id);

      // Create session
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const session = await this.sessionService.createSession(
        account.id,
        tokens.refreshToken,
        metadata
      );

      // Log successful OAuth login
      await this.securityService.logSecurityEvent(
        account.id,
        'login_success',
        {
          ...metadata,
          sessionId: session.id,
          provider,
        }
      );

      // Check if account requires email completion (for Steam)
      if (account.metadata?.requiresEmailCompletion) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        return res.redirect(
          `${frontendUrl}/auth/complete-profile?token=${tokens.accessToken}&requiresEmail=true`
        );
      }

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`
      );
    } catch (error) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      res.redirect(`${frontendUrl}/auth/error?reason=oauth_callback_failed`);
    }
  }
}
