import { IsHexColor, IsString, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsHexColor()
  color!: string;
}
