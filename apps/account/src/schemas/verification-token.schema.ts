import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'verification_tokens', timestamps: false })
export class VerificationToken extends Document {
  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ required: true, enum: ['email_verification', 'password_reset', 'email_change'] })
  type: string;

  @Prop()
  newEmail?: string; // For email change

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop()
  usedAt?: Date;

  @Prop({ required: true })
  createdAt: Date;
}

export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);

// Indexes
VerificationTokenSchema.index({ token: 1 }, { unique: true });
VerificationTokenSchema.index({ accountId: 1, type: 1 });
VerificationTokenSchema.index({ expiresAt: 1 });

// TTL Index - auto-delete expired tokens
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
