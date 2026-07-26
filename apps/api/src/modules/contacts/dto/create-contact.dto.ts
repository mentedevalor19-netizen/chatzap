import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateContactDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  waId!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
