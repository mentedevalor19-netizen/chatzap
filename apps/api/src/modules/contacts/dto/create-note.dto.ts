import { IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MinLength(2)
  body!: string;
}
