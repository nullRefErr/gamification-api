import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new BadRequestException('Failed to hash password');
    }
  }

  /**
   * Compare password with hash (constant-time to prevent timing attacks)
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate password strength
   * Requirements:
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character
   */
  validatePasswordStrength(password: string): void {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};:,.<>?]/.test(password),
    };

    const failedRequirements: string[] = [];

    if (!requirements.minLength) {
      failedRequirements.push('at least 8 characters');
    }
    if (!requirements.hasUppercase) {
      failedRequirements.push('at least one uppercase letter');
    }
    if (!requirements.hasLowercase) {
      failedRequirements.push('at least one lowercase letter');
    }
    if (!requirements.hasNumber) {
      failedRequirements.push('at least one number');
    }
    if (!requirements.hasSpecial) {
      failedRequirements.push('at least one special character (!@#$%^&*()_+-=[]{};:,.<>?)');
    }

    if (failedRequirements.length > 0) {
      throw new BadRequestException(
        `Password must contain: ${failedRequirements.join(', ')}`
      );
    }
  }

  /**
   * Check if password is in common password blacklist (optional)
   */
  isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password',
      '12345678',
      'qwerty123',
      'admin123',
      'password123',
    ];
    return commonPasswords.includes(password.toLowerCase());
  }
}
