import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class UpsertMetaConversionsSettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  datasetId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  whatsappBusinessAccountId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^v\d+\.\d+$/)
  graphApiVersion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  accessToken?: string | null;

  @IsOptional()
  @IsBoolean()
  clearAccessToken?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  testEventCode?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  sendLeadEvents?: boolean;

  @IsOptional()
  @IsBoolean()
  sendPurchaseEvents?: boolean;
}
