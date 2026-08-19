import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateQuickReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^\/?[a-z0-9_-]+$/)
  shortcut!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  body!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  mediaUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  mimeType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string | null;
}
