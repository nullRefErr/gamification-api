import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'accounts', timestamps: true })
export class Account extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string; // acc_1234567890

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop()
  passwordHash?: string; // bcrypt hash (optional for OAuth-only accounts)

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  phoneNumber?: string;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret?: string; // Encrypted TOTP secret

  @Prop({ type: Array, default: [] })
  twoFactorBackupCodes?: string[]; // Hashed backup codes

  @Prop({ type: Array, default: [] })
  linkedAccounts: Array<{
    provider: string; // google, facebook, apple, discord, steam
    oauthId: string;
    email?: string;
    linkedAt: Date;
  }>;

  @Prop({ type: Object })
  preferences: {
    language?: string;
    timezone?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };

  @Prop({ type: Object, default: { tier: 'free' } })
  subscription: {
    tier: string; // free, pro, enterprise
    status: string; // active, cancelled, expired, trial
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };

  @Prop({ type: Object, default: {} })
  usage: {
    gamesCreated?: number;
    apiRequestsToday?: number;
    lastResetAt?: Date;
  };

  @Prop({ default: 'active', enum: ['active', 'suspended', 'pending_deletion', 'deleted'] })
  status: string;

  @Prop()
  suspendedUntil?: Date;

  @Prop()
  suspendedReason?: string;

  @Prop()
  deletionScheduledAt?: Date;

  @Prop()
  lastPasswordChange?: Date;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLoginIp?: string;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  accountLockedUntil?: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

// Indexes
AccountSchema.index({ email: 1 }, { unique: true });
AccountSchema.index({ status: 1 });
AccountSchema.index({ createdAt: -1 });
AccountSchema.index({ 'linkedAccounts.provider': 1, 'linkedAccounts.oauthId': 1 });
