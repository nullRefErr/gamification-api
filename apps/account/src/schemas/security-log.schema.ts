import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'security_log', timestamps: false })
export class SecurityLog extends Document {
  @Prop({ required: true, unique: true })
  id: string; // log_1234567890

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({
    required: true,
    enum: [
      'login_success',
      'login_failed',
      'logout',
      'password_changed',
      'password_reset_requested',
      'password_reset_completed',
      '2fa_enabled',
      '2fa_disabled',
      'email_changed',
      'account_suspended',
      'suspicious_activity',
    ],
  })
  type: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  deviceId?: string;

  @Prop({ type: Object })
  location?: {
    city?: string;
    country?: string;
  };

  @Prop()
  userAgent?: string;

  @Prop()
  sessionId?: string;

  @Prop()
  reason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SecurityLogSchema = SchemaFactory.createForClass(SecurityLog);

// Indexes
SecurityLogSchema.index({ accountId: 1, timestamp: -1 });
SecurityLogSchema.index({ type: 1 });
SecurityLogSchema.index({ timestamp: -1 });

// TTL Index - auto-delete after 365 days
SecurityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
