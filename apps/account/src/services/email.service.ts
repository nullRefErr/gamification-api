import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { Account } from '../schemas/account.schema';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('SendGrid API key not configured. Email sending will be disabled.');
    }
  }

  /**
   * Send verification email with token
   */
  async sendVerificationEmail(account: Account, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    const msg = {
      to: account.email,
      from: {
        email: this.configService.get('FROM_EMAIL') || 'noreply@example.com',
        name: this.configService.get('FROM_NAME') || 'Gamification Platform',
      },
      subject: 'Verify Your Email Address',
      html: `
        <h2>Welcome to Gamification Platform!</h2>
        <p>Hi ${account.firstName},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email Address</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Verification email sent to ${account.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${account.email}`, error);
      // Don't throw - email failure shouldn't block registration
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(account: Account, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const msg = {
      to: account.email,
      from: {
        email: this.configService.get('FROM_EMAIL') || 'noreply@example.com',
        name: this.configService.get('FROM_NAME') || 'Gamification Platform',
      },
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${account.firstName},</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Password reset email sent to ${account.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${account.email}`, error);
    }
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(account: Account): Promise<void> {
    const msg = {
      to: account.email,
      from: {
        email: this.configService.get('FROM_EMAIL') || 'noreply@example.com',
        name: this.configService.get('FROM_NAME') || 'Gamification Platform',
      },
      subject: 'Password Changed Successfully',
      html: `
        <h2>Password Changed</h2>
        <p>Hi ${account.firstName},</p>
        <p>Your password was successfully changed.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Changed at: ${new Date().toLocaleString()}</p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Password changed notification sent to ${account.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password changed email to ${account.email}`, error);
    }
  }

  /**
   * Send account suspended notification
   */
  async sendAccountSuspendedEmail(account: Account, reason: string): Promise<void> {
    const msg = {
      to: account.email,
      from: {
        email: this.configService.get('FROM_EMAIL') || 'noreply@example.com',
        name: this.configService.get('FROM_NAME') || 'Gamification Platform',
      },
      subject: 'Account Suspended',
      html: `
        <h2>Account Suspended</h2>
        <p>Hi ${account.firstName},</p>
        <p>Your account has been suspended.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>If you believe this is a mistake, please contact support.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Account suspended notification sent to ${account.email}`);
    } catch (error) {
      this.logger.error(`Failed to send suspension email to ${account.email}`, error);
    }
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlertEmail(account: Account, activity: string): Promise<void> {
    const msg = {
      to: account.email,
      from: {
        email: this.configService.get('FROM_EMAIL') || 'noreply@example.com',
        name: this.configService.get('FROM_NAME') || 'Gamification Platform',
      },
      subject: 'Security Alert - Unusual Activity Detected',
      html: `
        <h2>Security Alert</h2>
        <p>Hi ${account.firstName},</p>
        <p>We detected unusual activity on your account:</p>
        <p><strong>${activity}</strong></p>
        <p>If this was you, you can safely ignore this email.</p>
        <p>If you don't recognize this activity, please secure your account immediately.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Security alert sent to ${account.email}`);
    } catch (error) {
      this.logger.error(`Failed to send security alert to ${account.email}`, error);
    }
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(account: Account): Promise<void> {
    const msg = {
      to: account.email,
      from: {
        email: this.configService.get('FROM_EMAIL') || 'noreply@example.com',
        name: this.configService.get('FROM_NAME') || 'Gamification Platform',
      },
      subject: 'Welcome to Gamification Platform!',
      html: `
        <h2>Welcome Aboard!</h2>
        <p>Hi ${account.firstName},</p>
        <p>Your email has been verified successfully. Welcome to Gamification Platform!</p>
        <p>You can now start creating games and engaging your players.</p>
        <p><a href="${this.configService.get('FRONTEND_URL')}/dashboard">Go to Dashboard</a></p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Welcome email sent to ${account.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${account.email}`, error);
    }
  }
}
