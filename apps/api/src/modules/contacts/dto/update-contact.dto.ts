import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  waId?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
