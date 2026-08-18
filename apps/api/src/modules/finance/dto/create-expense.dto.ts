import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsISO8601()
  spentAt?: string;
}
