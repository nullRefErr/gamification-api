import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { AccountService } from './account.service';
import { PasswordService } from './password.service';
import { Account } from '../schemas/account.schema';

@Injectable()
export class TwoFactorService {
  private readonly appName: string;
  private readonly totpWindow: number;
  private readonly backupCodesCount: number;

  constructor(
    private readonly accountService: AccountService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {
    this.appName = this.configService.get<string>('APP_NAME') || 'Gamification Platform';
    this.totpWindow = this.configService.get<number>('TOTP_WINDOW') || 1;
    this.backupCodesCount = this.configService.get<number>('BACKUP_CODES_COUNT') || 10;
  }

  /**
   * Enable 2FA - Generate secret and QR code
   */
  async enable2FA(accountId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    if (account.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${account.email})`,
      issuer: this.appName,
      length: 32,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.passwordService.hashPassword(code))
    );

    // Store encrypted secret and hashed backup codes (but don't enable yet)
    account.twoFactorSecret = this.encryptSecret(secret.base32);
    account.twoFactorBackupCodes = hashedBackupCodes;
    account.metadata = {
      ...account.metadata,
      twoFactorPending: true,
    };

    await account.save();

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      backupCodes, // Return plaintext codes (only shown once)
    };
  }

  /**
   * Verify and activate 2FA with TOTP code
   */
  async verify2FA(accountId: string, code: string): Promise<{
    backupCodes: string[];
  }> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    if (account.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    if (!account.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication setup not initiated');
    }

    // Verify the TOTP code
    const secret = this.decryptSecret(account.twoFactorSecret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: this.totpWindow,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Activate 2FA
    account.twoFactorEnabled = true;
    delete account.metadata?.twoFactorPending;
    await account.save();

    // Return backup codes (they were already hashed and stored)
    // We need to regenerate them for display since we can't decrypt hashed codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.passwordService.hashPassword(code))
    );
    account.twoFactorBackupCodes = hashedBackupCodes;
    await account.save();

    return {
      backupCodes,
    };
  }

  /**
   * Verify TOTP or backup code
   */
  async verifyCode(account: Account, code: string): Promise<boolean> {
    if (!account.twoFactorEnabled || !account.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Remove spaces and dashes from code
    const cleanCode = code.replace(/[\s-]/g, '');

    // Try TOTP verification first (6-digit codes)
    if (cleanCode.length === 6) {
      const secret = this.decryptSecret(account.twoFactorSecret);
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: cleanCode,
        window: this.totpWindow,
      });

      if (isValid) {
        return true;
      }
    }

    // Try backup codes (formatted as XXXX-XXXX-XXXX)
    if (account.twoFactorBackupCodes && account.twoFactorBackupCodes.length > 0) {
      for (let i = 0; i < account.twoFactorBackupCodes.length; i++) {
        const hashedCode = account.twoFactorBackupCodes[i];
        const isMatch = await this.passwordService.comparePassword(cleanCode, hashedCode);

        if (isMatch) {
          // Remove used backup code
          account.twoFactorBackupCodes.splice(i, 1);
          await account.save();
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(
    accountId: string,
    password: string,
    code: string
  ): Promise<void> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    if (!account.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify password
    if (!account.passwordHash) {
      throw new BadRequestException('Password authentication not available');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      account.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify current 2FA code
    const isCodeValid = await this.verifyCode(account, code);
    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Disable 2FA
    account.twoFactorEnabled = false;
    account.twoFactorSecret = undefined;
    account.twoFactorBackupCodes = [];
    await account.save();
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    accountId: string,
    password: string
  ): Promise<string[]> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    if (!account.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify password
    if (!account.passwordHash) {
      throw new BadRequestException('Password authentication not available');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      account.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();

    // Hash backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.passwordService.hashPassword(code))
    );

    // Replace old backup codes
    account.twoFactorBackupCodes = hashedBackupCodes;
    await account.save();

    return backupCodes;
  }

  /**
   * Generate random backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.backupCodesCount; i++) {
      // Generate 12-character code in format: XXXX-XXXX-XXXX
      const part1 = this.generateRandomString(4);
      const part2 = this.generateRandomString(4);
      const part3 = this.generateRandomString(4);
      codes.push(`${part1}-${part2}-${part3}`);
    }

    return codes;
  }

  /**
   * Generate random alphanumeric string
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters (0, O, 1, I)
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      result += chars[randomIndex];
    }

    return result;
  }

  /**
   * Encrypt TOTP secret for storage
   * In production, use proper encryption with KMS or similar
   */
  private encryptSecret(secret: string): string {
    // Simple encryption - in production use proper encryption
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key';
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt TOTP secret
   */
  private decryptSecret(encryptedSecret: string): string {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key';
    const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
    let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodesCount(accountId: string): Promise<number> {
    const account = await this.accountService.findByIdOrThrow(accountId);
    return account.twoFactorBackupCodes?.length || 0;
  }
}
