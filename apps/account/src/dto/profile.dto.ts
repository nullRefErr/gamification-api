import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class UpdatePreferencesDto {
  @ApiProperty({ required: false, enum: ['en', 'es', 'fr', 'de', 'tr'] })
  @IsOptional()
  @IsEnum(['en', 'es', 'fr', 'de', 'tr'])
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'newemail@example.com' })
  @IsString()
  newEmail: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class VerifyEmailChangeDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class RequestAccountDeletionDto {
  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelAccountDeletionDto {
  @ApiProperty()
  @IsString()
  password: string;
}
