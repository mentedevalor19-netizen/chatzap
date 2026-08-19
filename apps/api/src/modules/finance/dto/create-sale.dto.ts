import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SaleStatus } from '@prisma/client';

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsString()
  sellerId?: string | null;

  @IsOptional()
  @IsString()
  contactId?: string | null;

  @IsOptional()
  @IsString()
  conversationId?: string | null;

  @IsOptional()
  @IsString()
  productId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @IsOptional()
  @IsISO8601()
  soldAt?: string;
}
