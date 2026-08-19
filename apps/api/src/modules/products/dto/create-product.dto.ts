import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
