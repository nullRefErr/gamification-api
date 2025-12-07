import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code: string;
}

export class RegenerateBackupCodesDto {
  @ApiProperty()
  @IsString()
  password: string;
}
