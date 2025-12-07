import { IsString, MinLength, IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};:,.<>?])/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  newPassword: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  logoutOtherSessions?: boolean;
}

export class ResetPasswordRequestDto {
  @ApiProperty()
  @IsString()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};:,.<>?])/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  newPassword: string;
}
