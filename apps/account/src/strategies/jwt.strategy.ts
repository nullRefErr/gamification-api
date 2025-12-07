import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { Account } from '../schemas/account.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret-key-please-change',
    });
  }

  /**
   * Validate JWT payload and return account
   * This method is called automatically by Passport after JWT is verified
   */
  async validate(payload: any): Promise<Account> {
    if (!payload.accountId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Validate account and check status
    const account = await this.authService.validateAccountFromToken(payload.accountId);

    return account;
  }
}
