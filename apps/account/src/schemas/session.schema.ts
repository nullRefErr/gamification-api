import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'sessions', timestamps: false })
export class Session extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string; // session_1234567890

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ required: true })
  refreshToken: string; // Hashed

  @Prop()
  deviceId?: string;

  @Prop()
  platform?: string; // web, ios, android, desktop

  @Prop()
  browser?: string;

  @Prop()
  os?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Object })
  location?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  lastActivityAt?: Date;

  @Prop({ default: false })
  revoked: boolean;

  @Prop()
  revokedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Indexes
SessionSchema.index({ accountId: 1, revoked: 1 }); // Active sessions per account
SessionSchema.index({ refreshToken: 1 });
SessionSchema.index({ expiresAt: 1 }); // Cleanup expired sessions

// TTL Index - auto-delete expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
