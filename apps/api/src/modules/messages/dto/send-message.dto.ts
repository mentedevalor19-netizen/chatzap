import { MessageType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @IsEnum(MessageType)
  type!: MessageType;

  @ValidateIf((dto: SendMessageDto) => dto.type === MessageType.TEXT)
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

  @ValidateIf((dto: SendMessageDto) => dto.type === MessageType.LOCATION)
  @IsNumber()
  latitude?: number;

  @ValidateIf((dto: SendMessageDto) => dto.type === MessageType.LOCATION)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ValidateIf((dto: SendMessageDto) => dto.type === MessageType.CONTACT)
  @IsArray()
  contactPayload?: unknown[];

  @ValidateIf((dto: SendMessageDto) => dto.type === MessageType.TEMPLATE)
  @IsString()
  templateName?: string;

  @ValidateIf((dto: SendMessageDto) => dto.type === MessageType.TEMPLATE)
  @IsString()
  templateLanguageCode?: string;

  @IsOptional()
  @IsArray()
  templateComponents?: unknown[];
}
