import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from '../schemas/account.schema';
import { VerificationToken } from '../schemas/verification-token.schema';
import { PasswordService } from './password.service';
import { EmailService } from './email.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    @InjectModel(VerificationToken.name)
    private readonly verificationTokenModel: Model<VerificationToken>,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Create a new account
   */
  async createAccount(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    referralCode?: string;
  }): Promise<Account> {
    // Check if account already exists
    const existingAccount = await this.findByEmail(data.email);
    if (existingAccount) {
      throw new ConflictException('Account with this email already exists');
    }

    // Validate password strength
    this.passwordService.validatePasswordStrength(data.password);

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(data.password);

    // Generate account ID
    const accountId = this.generateAccountId();

    // Create account
    const account = new this.accountModel({
      id: accountId,
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      emailVerified: false,
      twoFactorEnabled: false,
      status: 'active',
      preferences: {
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      subscription: {
        tier: 'free',
        status: 'active',
      },
      usage: {
        gamesCreated: 0,
        apiRequestsToday: 0,
        lastResetAt: new Date(),
      },
      failedLoginAttempts: 0,
      linkedAccounts: [],
      metadata: {
        referralCode: data.referralCode,
      },
    });

    await account.save();

    // Generate verification token
    await this.generateVerificationToken(account.id, 'email_verification');

    return account;
  }

  /**
   * Find account by email
   */
  async findByEmail(email: string): Promise<Account | null> {
    return this.accountModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /**
   * Find account by OAuth provider and OAuth ID
   */
  async findByOAuthProvider(provider: string, oauthId: string): Promise<Account | null> {
    return this.accountModel
      .findOne({
        linkedAccounts: {
          $elemMatch: {
            provider: provider,
            oauthId: oauthId,
          },
        },
      })
      .exec();
  }

  /**
   * Find account by ID
   */
  async findById(accountId: string): Promise<Account | null> {
    return this.accountModel.findOne({ id: accountId }).exec();
  }

  /**
   * Find account by ID or throw
   */
  async findByIdOrThrow(accountId: string): Promise<Account> {
    const account = await this.findById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  /**
   * Update account
   */
  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account> {
    const account = await this.findByIdOrThrow(accountId);

    Object.assign(account, updates);
    await account.save();

    return account;
  }

  /**
   * Generate verification token
   */
  async generateVerificationToken(
    accountId: string,
    type: 'email_verification' | 'password_reset' | 'email_change',
    newEmail?: string
  ): Promise<string> {
    const account = await this.findByIdOrThrow(accountId);

    // Invalidate existing tokens of this type
    await this.verificationTokenModel.updateMany(
      { accountId, type, used: false },
      { used: true, usedAt: new Date() }
    ).exec();

    // Generate JWT token
    const tokenPayload = { accountId, type, newEmail };
    const token = this.jwtService.sign(tokenPayload, {
      expiresIn: type === 'password_reset' ? '1h' : '24h',
    });

    // Calculate expiry
    const expiresAt = new Date();
    if (type === 'password_reset') {
      expiresAt.setHours(expiresAt.getHours() + 1);
    } else {
      expiresAt.setHours(expiresAt.getHours() + 24);
    }

    // Save verification token
    const verificationToken = new this.verificationTokenModel({
      token,
      accountId,
      type,
      newEmail,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    await verificationToken.save();

    // Send email based on type
    if (type === 'email_verification') {
      await this.emailService.sendVerificationEmail(account, token);
    } else if (type === 'password_reset') {
      await this.emailService.sendPasswordResetEmail(account, token);
    }

    return token;
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<Account> {
    // Find token
    const verificationToken = await this.verificationTokenModel.findOne({ token }).exec();

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.used) {
      throw new BadRequestException('Verification token already used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    if (verificationToken.type !== 'email_verification') {
      throw new BadRequestException('Invalid token type');
    }

    // Mark token as used
    verificationToken.used = true;
    verificationToken.usedAt = new Date();
    await verificationToken.save();

    // Update account
    const account = await this.findByIdOrThrow(verificationToken.accountId);
    account.emailVerified = true;
    account.emailVerifiedAt = new Date();
    await account.save();

    // Send welcome email
    await this.emailService.sendWelcomeEmail(account);

    return account;
  }

  /**
   * Request email change
   */
  async requestEmailChange(
    accountId: string,
    newEmail: string,
    password: string
  ): Promise<void> {
    const account = await this.findByIdOrThrow(accountId);

    // Verify password
    if (!account.passwordHash) {
      throw new BadRequestException('Password authentication not available for this account');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      account.passwordHash
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }

    // Check if new email is already in use
    const existingAccount = await this.findByEmail(newEmail);
    if (existingAccount && existingAccount.id !== accountId) {
      throw new ConflictException('Email address is already in use');
    }

    // Check if email is the same as current
    if (account.email.toLowerCase() === newEmail.toLowerCase()) {
      throw new BadRequestException('New email must be different from current email');
    }

    // Generate verification token for email change
    await this.generateVerificationToken(accountId, 'email_change', newEmail);
  }

  /**
   * Verify email change with token
   */
  async verifyEmailChange(token: string): Promise<Account> {
    // Find and validate token
    const verificationToken = await this.verificationTokenModel.findOne({ token }).exec();

    if (!verificationToken) {
      throw new BadRequestException('Invalid email change token');
    }

    if (verificationToken.used) {
      throw new BadRequestException('Email change token already used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Email change token expired');
    }

    if (verificationToken.type !== 'email_change') {
      throw new BadRequestException('Invalid token type');
    }

    if (!verificationToken.newEmail) {
      throw new BadRequestException('No new email specified in token');
    }

    // Check if new email is still available
    const existingAccount = await this.findByEmail(verificationToken.newEmail);
    if (existingAccount && existingAccount.id !== verificationToken.accountId) {
      throw new ConflictException('Email address is already in use');
    }

    // Mark token as used
    verificationToken.used = true;
    verificationToken.usedAt = new Date();
    await verificationToken.save();

    // Update account email
    const account = await this.findByIdOrThrow(verificationToken.accountId);
    const oldEmail = account.email;
    account.email = verificationToken.newEmail.toLowerCase();
    account.emailVerified = true; // Email is verified through token
    account.emailVerifiedAt = new Date();
    await account.save();

    // Send confirmation emails to both old and new email
    await this.emailService.sendEmailChangedNotification(account, oldEmail);

    return account;
  }

  /**
   * Schedule account deletion
   */
  async scheduleAccountDeletion(
    accountId: string,
    password: string,
    reason?: string
  ): Promise<{ deletionScheduledAt: Date; permanentDeletionAt: Date }> {
    const account = await this.findByIdOrThrow(accountId);

    // Verify password
    if (!account.passwordHash) {
      throw new BadRequestException('Password authentication not available for this account');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      account.passwordHash
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }

    const deletionScheduledAt = new Date();
    const permanentDeletionAt = new Date();
    permanentDeletionAt.setDate(permanentDeletionAt.getDate() + 30); // 30 days grace period

    account.status = 'pending_deletion';
    account.deletionScheduledAt = deletionScheduledAt;
    account.metadata = {
      ...account.metadata,
      permanentDeletionAt,
      deletionReason: reason,
    };

    await account.save();

    // Send deletion scheduled email
    await this.emailService.sendAccountDeletionScheduledEmail(account, permanentDeletionAt);

    return { deletionScheduledAt, permanentDeletionAt };
  }

  /**
   * Cancel account deletion
   */
  async cancelAccountDeletion(accountId: string, password: string): Promise<Account> {
    const account = await this.findByIdOrThrow(accountId);

    if (account.status !== 'pending_deletion') {
      throw new BadRequestException('Account is not scheduled for deletion');
    }

    // Verify password
    if (!account.passwordHash) {
      throw new BadRequestException('Password authentication not available for this account');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      account.passwordHash
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }

    // Cancel deletion
    account.status = 'active';
    account.deletionScheduledAt = undefined;
    delete account.metadata?.permanentDeletionAt;
    delete account.metadata?.deletionReason;

    await account.save();

    // Send cancellation confirmation email
    await this.emailService.sendAccountDeletionCancelledEmail(account);

    return account;
  }

  /**
   * Suspend account
   */
  async suspendAccount(
    accountId: string,
    reason: string,
    duration?: number
  ): Promise<Account> {
    const account = await this.findByIdOrThrow(accountId);

    account.status = 'suspended';
    account.suspendedReason = reason;

    if (duration) {
      const suspendedUntil = new Date();
      suspendedUntil.setSeconds(suspendedUntil.getSeconds() + duration);
      account.suspendedUntil = suspendedUntil;
    }

    await account.save();

    // Send suspension email
    await this.emailService.sendAccountSuspendedEmail(account, reason);

    return account;
  }

  /**
   * Unsuspend account
   */
  async unsuspendAccount(accountId: string): Promise<Account> {
    const account = await this.findByIdOrThrow(accountId);

    account.status = 'active';
    account.suspendedUntil = undefined;
    account.suspendedReason = undefined;

    await account.save();

    return account;
  }

  /**
   * Generate unique account ID
   */
  private generateAccountId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `acc_${timestamp}_${random}`;
  }

  /**
   * Change password
   */
  async changePassword(
    accountId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const account = await this.findByIdOrThrow(accountId);

    // Verify current password
    if (!account.passwordHash) {
      throw new BadRequestException('Password authentication not available for this account');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      currentPassword,
      account.passwordHash
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    this.passwordService.validatePasswordStrength(newPassword);

    // Ensure new password is different from current
    const isSamePassword = await this.passwordService.comparePassword(
      newPassword,
      account.passwordHash
    );

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash and update password
    account.passwordHash = await this.passwordService.hashPassword(newPassword);
    account.passwordChangedAt = new Date();
    await account.save();

    // Send password changed notification email
    await this.emailService.sendPasswordChangedEmail(account);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const account = await this.findByEmail(email);

    // Don't reveal if account exists (security best practice)
    if (!account) {
      return;
    }

    // Generate and send password reset token
    await this.generateVerificationToken(account.id, 'password_reset');
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find and validate token
    const verificationToken = await this.verificationTokenModel.findOne({ token }).exec();

    if (!verificationToken) {
      throw new BadRequestException('Invalid password reset token');
    }

    if (verificationToken.used) {
      throw new BadRequestException('Password reset token already used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Password reset token expired');
    }

    if (verificationToken.type !== 'password_reset') {
      throw new BadRequestException('Invalid token type');
    }

    // Validate new password strength
    this.passwordService.validatePasswordStrength(newPassword);

    // Mark token as used
    verificationToken.used = true;
    verificationToken.usedAt = new Date();
    await verificationToken.save();

    // Update account password
    const account = await this.findByIdOrThrow(verificationToken.accountId);
    account.passwordHash = await this.passwordService.hashPassword(newPassword);
    account.passwordChangedAt = new Date();

    // Reset failed login attempts on password reset
    account.failedLoginAttempts = 0;
    account.accountLockedUntil = undefined;

    await account.save();

    // Send password changed notification email
    await this.emailService.sendPasswordChangedEmail(account);
  }

  /**
   * Search accounts (admin)
   */
  async searchAccounts(query: {
    email?: string;
    status?: string;
    tier?: string;
    page?: number;
    limit?: number;
  }): Promise<{ accounts: Account[]; total: number; page: number; pages: number }> {
    const { email, status, tier, page = 1, limit = 20 } = query;

    const filter: any = {};

    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    if (tier) {
      filter['subscription.tier'] = tier;
    }

    const total = await this.accountModel.countDocuments(filter).exec();
    const accounts = await this.accountModel
      .find(filter)
      .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      accounts,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
