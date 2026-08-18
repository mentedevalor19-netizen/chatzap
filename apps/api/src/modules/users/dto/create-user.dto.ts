import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
