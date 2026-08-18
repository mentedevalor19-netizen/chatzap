import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateQuickReplyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^\/?[a-z0-9_-]+$/)
  shortcut?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  body?: string;
}
