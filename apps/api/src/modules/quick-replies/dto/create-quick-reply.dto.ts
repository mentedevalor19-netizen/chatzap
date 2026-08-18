import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
}
