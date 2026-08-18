import { FunnelStepType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertFunnelStepDto {
  @IsInt()
  @Min(1)
  position!: number;

  @IsEnum(FunnelStepType)
  type!: FunnelStepType;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  delaySeconds?: number;

  @IsOptional()
  @IsBoolean()
  audioAsVoice?: boolean;

  @IsBoolean()
  waitForReply!: boolean;
}

export class UpsertActiveFunnelDto {
  @IsString()
  name!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString()
  handoffMessage?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFunnelStepDto)
  steps!: UpsertFunnelStepDto[];
}
