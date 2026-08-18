import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaConversionStatus, Prisma, SaleStatus, UserRole } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMetaConversionsSettingsDto } from './dto/upsert-meta-conversions-settings.dto';

interface ResolvedMetaSettings {
  isEnabled: boolean;
  datasetId: string | null;
  whatsappBusinessAccountId: string | null;
  graphApiVersion: string;
  accessToken: string | null;
  testEventCode: string | null;
  currency: string;
  sendLeadEvents: boolean;
  sendPurchaseEvents: boolean;
}

interface ConversionEventInput {
  organizationId: string;
  eventName: 'Purchase' | 'LeadSubmitted';
  eventId: string;
  eventTime: Date;
  saleId?: string | null;
  attributionId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  ctwaClid?: string | null;
  value?: number;
  contentName?: string | null;
  force?: boolean;
}

@Injectable()
export class MetaConversionsService {
  private readonly logger = new Logger(MetaConversionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getSettings(user: AuthenticatedUser) {
    this.assertAdmin(user);
    const setting = await this.prisma.metaIntegrationSetting.findUnique({
      where: { organizationId: user.organizationId },
    });
    const resolved = await this.resolveSettings(user.organizationId, setting);

    return {
      id: setting?.id ?? null,
      isEnabled: resolved.isEnabled,
      datasetId: resolved.datasetId,
      whatsappBusinessAccountId: resolved.whatsappBusinessAccountId,
      graphApiVersion: resolved.graphApiVersion,
      testEventCode: resolved.testEventCode,
      currency: resolved.currency,
      sendLeadEvents: resolved.sendLeadEvents,
      sendPurchaseEvents: resolved.sendPurchaseEvents,
      hasAccessToken: Boolean(resolved.accessToken),
      usingEnvAccessToken: Boolean(!setting?.accessTokenEncrypted && this.config.get<string>('META_CAPI_ACCESS_TOKEN')),
    };
  }

  async upsertSettings(user: AuthenticatedUser, dto: UpsertMetaConversionsSettingsDto) {
    this.assertAdmin(user);
    const accessToken = dto.accessToken?.trim();
    const accessTokenEncrypted = dto.clearAccessToken
      ? null
      : accessToken
        ? this.encrypt(accessToken)
        : undefined;

    await this.prisma.metaIntegrationSetting.upsert({
      where: { organizationId: user.organizationId },
      update: {
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.datasetId !== undefined ? { datasetId: this.clean(dto.datasetId) } : {}),
        ...(dto.whatsappBusinessAccountId !== undefined
          ? { whatsappBusinessAccountId: this.clean(dto.whatsappBusinessAccountId) }
          : {}),
        ...(dto.graphApiVersion !== undefined ? { graphApiVersion: this.clean(dto.graphApiVersion) } : {}),
        ...(accessTokenEncrypted !== undefined ? { accessTokenEncrypted } : {}),
        ...(dto.testEventCode !== undefined ? { testEventCode: this.clean(dto.testEventCode) } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency.trim().toUpperCase() } : {}),
        ...(dto.sendLeadEvents !== undefined ? { sendLeadEvents: dto.sendLeadEvents } : {}),
        ...(dto.sendPurchaseEvents !== undefined ? { sendPurchaseEvents: dto.sendPurchaseEvents } : {}),
      },
      create: {
        organizationId: user.organizationId,
        isEnabled: dto.isEnabled ?? false,
        datasetId: this.clean(dto.datasetId) ?? this.config.get<string>('META_DATASET_ID') ?? null,
        whatsappBusinessAccountId:
          this.clean(dto.whatsappBusinessAccountId) ?? this.config.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID') ?? null,
        graphApiVersion:
          this.clean(dto.graphApiVersion) ?? this.config.get<string>('META_CAPI_GRAPH_API_VERSION') ?? this.config.get<string>('META_GRAPH_API_VERSION') ?? 'v20.0',
        accessTokenEncrypted:
          accessTokenEncrypted === undefined ? this.encryptOptional(this.config.get<string>('META_CAPI_ACCESS_TOKEN')) : accessTokenEncrypted,
        testEventCode: this.clean(dto.testEventCode) ?? this.config.get<string>('META_TEST_EVENT_CODE') ?? null,
        currency: dto.currency?.trim().toUpperCase() ?? this.config.get<string>('META_CAPI_CURRENCY') ?? 'BRL',
        sendLeadEvents: dto.sendLeadEvents ?? this.booleanEnv('META_CAPI_SEND_LEAD_EVENTS', false),
        sendPurchaseEvents: dto.sendPurchaseEvents ?? this.booleanEnv('META_CAPI_SEND_PURCHASE_EVENTS', true),
      },
    });

    return this.getSettings(user);
  }

  async listEvents(user: AuthenticatedUser) {
    this.assertAdmin(user);

    const events = await this.prisma.metaConversionEvent.findMany({
      where: { organizationId: user.organizationId },
      include: conversionEventInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return events.map((event) => this.serializeEvent(event));
  }

  async retryEvent(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    const event = await this.prisma.metaConversionEvent.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, saleId: true, attributionId: true, eventName: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('Meta conversion event not found');
    }

    if (event.status === MetaConversionStatus.SENT) {
      return this.findEventById(user.organizationId, event.id);
    }

    if (event.eventName === 'Purchase' && event.saleId) {
      return this.sendPurchaseForSale(user.organizationId, event.saleId, true);
    }

    if (event.eventName === 'LeadSubmitted' && event.attributionId) {
      return this.sendLeadSubmittedForAttribution(user.organizationId, event.attributionId, true);
    }

    throw new BadRequestException('This event cannot be retried');
  }

  async sendSalePurchase(user: AuthenticatedUser, saleId: string) {
    this.assertAdmin(user);

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return this.sendPurchaseForSale(user.organizationId, sale.id, true);
  }

  async recordAttribution(input: {
    organizationId: string;
    contactId: string;
    conversationId: string;
    waMessageId: string;
    referral: Record<string, unknown>;
    receivedAt: Date;
  }) {
    const ctwaClid = this.pickString(input.referral.ctwa_clid);

    if (!ctwaClid) {
      return null;
    }

    const welcomeMessage = input.referral.welcome_message as { text?: unknown } | undefined;
    const attribution = await this.prisma.adAttribution.upsert({
      where: {
        organizationId_conversationId: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
        },
      },
      update: {
        waMessageId: input.waMessageId,
        ctwaClid,
        sourceType: this.pickString(input.referral.source_type),
        sourceId: this.pickString(input.referral.source_id),
        sourceUrl: this.pickString(input.referral.source_url),
        headline: this.pickString(input.referral.headline),
        body: this.pickString(input.referral.body),
        mediaType: this.pickString(input.referral.media_type),
        imageUrl: this.pickString(input.referral.image_url),
        videoUrl: this.pickString(input.referral.video_url),
        thumbnailUrl: this.pickString(input.referral.thumbnail_url),
        welcomeMessage: this.pickString(welcomeMessage?.text),
        rawPayload: input.referral as Prisma.InputJsonValue,
        receivedAt: input.receivedAt,
      },
      create: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        conversationId: input.conversationId,
        waMessageId: input.waMessageId,
        ctwaClid,
        sourceType: this.pickString(input.referral.source_type),
        sourceId: this.pickString(input.referral.source_id),
        sourceUrl: this.pickString(input.referral.source_url),
        headline: this.pickString(input.referral.headline),
        body: this.pickString(input.referral.body),
        mediaType: this.pickString(input.referral.media_type),
        imageUrl: this.pickString(input.referral.image_url),
        videoUrl: this.pickString(input.referral.video_url),
        thumbnailUrl: this.pickString(input.referral.thumbnail_url),
        welcomeMessage: this.pickString(welcomeMessage?.text),
        rawPayload: input.referral as Prisma.InputJsonValue,
        receivedAt: input.receivedAt,
      },
    });

    const settings = await this.resolveSettings(input.organizationId);
    if (settings.sendLeadEvents) {
      void this.sendLeadSubmittedForAttribution(input.organizationId, attribution.id).catch((error) => {
        this.logger.warn(`Meta LeadSubmitted event failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }

    return attribution;
  }

  async sendPurchaseForSale(organizationId: string, saleId: string, force = false) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, organizationId },
      include: {
        contact: { select: { id: true } },
        conversation: { select: { id: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    const eventId = `sale_${sale.id}_purchase`;

    if (sale.status !== SaleStatus.PAID) {
      return this.recordSkipped({
        organizationId,
        eventName: 'Purchase',
        eventId,
        eventTime: sale.soldAt,
        saleId: sale.id,
        contactId: sale.contactId,
        conversationId: sale.conversationId,
        errorMessage: 'Sale is not marked as paid',
        force,
      });
    }

    const settings = await this.resolveSettings(organizationId);

    if (!settings.sendPurchaseEvents) {
      return this.recordSkipped({
        organizationId,
        eventName: 'Purchase',
        eventId,
        eventTime: sale.soldAt,
        saleId: sale.id,
        contactId: sale.contactId,
        conversationId: sale.conversationId,
        errorMessage: 'Purchase events are disabled',
        force,
      });
    }

    const attribution = await this.findAttributionForSale(organizationId, sale);

    if (!attribution?.ctwaClid) {
      return this.recordSkipped({
        organizationId,
        eventName: 'Purchase',
        eventId,
        eventTime: sale.soldAt,
        saleId: sale.id,
        contactId: sale.contactId,
        conversationId: sale.conversationId,
        errorMessage: 'Sale has no Click-to-WhatsApp attribution',
        force,
      });
    }

    return this.submitConversionEvent({
      organizationId,
      eventName: 'Purchase',
      eventId,
      eventTime: sale.soldAt,
      saleId: sale.id,
      attributionId: attribution.id,
      contactId: sale.contactId,
      conversationId: sale.conversationId,
      ctwaClid: attribution.ctwaClid,
      value: Number(sale.amount),
      contentName: sale.title,
      force,
    });
  }

  private async sendLeadSubmittedForAttribution(organizationId: string, attributionId: string, force = false) {
    const attribution = await this.prisma.adAttribution.findFirst({
      where: { id: attributionId, organizationId },
    });

    if (!attribution) {
      throw new NotFoundException('Attribution not found');
    }

    return this.submitConversionEvent({
      organizationId,
      eventName: 'LeadSubmitted',
      eventId: `attribution_${attribution.id}_lead`,
      eventTime: attribution.receivedAt,
      attributionId: attribution.id,
      contactId: attribution.contactId,
      conversationId: attribution.conversationId,
      ctwaClid: attribution.ctwaClid,
      force,
    });
  }

  private async submitConversionEvent(input: ConversionEventInput) {
    const existing = await this.prisma.metaConversionEvent.findUnique({
      where: { eventId: input.eventId },
      include: conversionEventInclude,
    });

    if (existing?.status === MetaConversionStatus.SENT && !input.force) {
      return this.serializeEvent(existing);
    }

    const settings = await this.resolveSettings(input.organizationId);
    const missing = this.getMissingSettings(settings);

    if (!settings.isEnabled) {
      return this.recordSkipped({ ...input, errorMessage: 'Meta CAPI integration is disabled' });
    }

    if (missing.length) {
      return this.recordSkipped({
        ...input,
        errorMessage: `Missing Meta CAPI settings: ${missing.join(', ')}`,
      });
    }

    if (!input.ctwaClid) {
      return this.recordSkipped({ ...input, errorMessage: 'Missing ctwa_clid' });
    }

    if (!this.isEventTimeAllowed(input.eventTime)) {
      return this.recordSkipped({
        ...input,
        errorMessage: 'Meta Business Messaging event_time must be within the last 7 days and not in the future',
      });
    }

    const eventPayload: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: Math.floor(input.eventTime.getTime() / 1000),
      action_source: 'business_messaging',
      messaging_channel: 'whatsapp',
      event_id: input.eventId,
      user_data: {
        whatsapp_business_account_id: settings.whatsappBusinessAccountId,
        ctwa_clid: input.ctwaClid,
      },
    };

    if (input.eventName === 'Purchase') {
      eventPayload.custom_data = {
        currency: settings.currency,
        value: input.value ?? 0,
        order_id: input.saleId,
        content_name: input.contentName,
      };
    }

    const requestPayload = {
      data: [eventPayload],
      ...(settings.testEventCode ? { test_event_code: settings.testEventCode } : {}),
    };

    await this.upsertEventRecord({
      ...input,
      status: MetaConversionStatus.PENDING,
      requestPayload,
      errorMessage: null,
    });

    const version = settings.graphApiVersion.replace(/^\//, '');
    const url = `https://graph.facebook.com/${version}/${settings.datasetId}/events?access_token=${encodeURIComponent(settings.accessToken ?? '')}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
      const responsePayload = await this.parseResponsePayload(response);

      if (!response.ok) {
        throw new Error(this.extractMetaError(responsePayload, response.status));
      }

      const sent = await this.upsertEventRecord({
        ...input,
        status: MetaConversionStatus.SENT,
        requestPayload,
        responsePayload,
        errorMessage: null,
        sentAt: new Date(),
      });

      return sent;
    } catch (error) {
      return this.upsertEventRecord({
        ...input,
        status: MetaConversionStatus.FAILED,
        requestPayload,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async recordSkipped(
    input: ConversionEventInput & {
      errorMessage: string;
    },
  ) {
    const existing = await this.prisma.metaConversionEvent.findUnique({
      where: { eventId: input.eventId },
      include: conversionEventInclude,
    });

    if (existing?.status === MetaConversionStatus.SENT && !input.force) {
      return this.serializeEvent(existing);
    }

    return this.upsertEventRecord({
      ...input,
      status: MetaConversionStatus.SKIPPED,
      requestPayload: null,
      errorMessage: input.errorMessage,
    });
  }

  private async upsertEventRecord(
    input: ConversionEventInput & {
      status: MetaConversionStatus;
      requestPayload?: unknown;
      responsePayload?: unknown;
      errorMessage?: string | null;
      sentAt?: Date | null;
    },
  ) {
    const event = await this.prisma.metaConversionEvent.upsert({
      where: { eventId: input.eventId },
      update: {
        status: input.status,
        requestPayload: input.requestPayload === undefined ? undefined : (input.requestPayload as Prisma.InputJsonValue),
        responsePayload: input.responsePayload === undefined ? undefined : (input.responsePayload as Prisma.InputJsonValue),
        errorMessage: input.errorMessage,
        sentAt: input.sentAt,
        saleId: input.saleId ?? null,
        attributionId: input.attributionId ?? null,
        contactId: input.contactId ?? null,
        conversationId: input.conversationId ?? null,
      },
      create: {
        organizationId: input.organizationId,
        saleId: input.saleId ?? null,
        attributionId: input.attributionId ?? null,
        contactId: input.contactId ?? null,
        conversationId: input.conversationId ?? null,
        eventName: input.eventName,
        eventId: input.eventId,
        status: input.status,
        requestPayload: input.requestPayload === undefined ? undefined : (input.requestPayload as Prisma.InputJsonValue),
        responsePayload: input.responsePayload === undefined ? undefined : (input.responsePayload as Prisma.InputJsonValue),
        errorMessage: input.errorMessage,
        sentAt: input.sentAt,
      },
      include: conversionEventInclude,
    });

    return this.serializeEvent(event);
  }

  private async findEventById(organizationId: string, id: string) {
    const event = await this.prisma.metaConversionEvent.findFirst({
      where: { id, organizationId },
      include: conversionEventInclude,
    });

    if (!event) {
      throw new NotFoundException('Meta conversion event not found');
    }

    return this.serializeEvent(event);
  }

  private async findAttributionForSale(organizationId: string, sale: { conversationId: string | null; contactId: string | null }) {
    if (sale.conversationId) {
      const attribution = await this.prisma.adAttribution.findUnique({
        where: {
          organizationId_conversationId: {
            organizationId,
            conversationId: sale.conversationId,
          },
        },
      });

      if (attribution) {
        return attribution;
      }
    }

    if (!sale.contactId) {
      return null;
    }

    return this.prisma.adAttribution.findFirst({
      where: { organizationId, contactId: sale.contactId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  private async resolveSettings(organizationId: string, setting?: Awaited<ReturnType<PrismaService['metaIntegrationSetting']['findUnique']>>) {
    const persisted =
      setting ??
      (await this.prisma.metaIntegrationSetting.findUnique({
        where: { organizationId },
      }));

    return {
      isEnabled: persisted?.isEnabled ?? this.booleanEnv('META_CAPI_ENABLED', false),
      datasetId: this.clean(persisted?.datasetId) ?? this.config.get<string>('META_DATASET_ID') ?? null,
      whatsappBusinessAccountId:
        this.clean(persisted?.whatsappBusinessAccountId) ?? this.config.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID') ?? null,
      graphApiVersion:
        this.clean(persisted?.graphApiVersion) ??
        this.config.get<string>('META_CAPI_GRAPH_API_VERSION') ??
        this.config.get<string>('META_GRAPH_API_VERSION') ??
        'v20.0',
      accessToken: this.decryptOptional(persisted?.accessTokenEncrypted) ?? this.config.get<string>('META_CAPI_ACCESS_TOKEN') ?? null,
      testEventCode: this.clean(persisted?.testEventCode) ?? this.config.get<string>('META_TEST_EVENT_CODE') ?? null,
      currency: this.clean(persisted?.currency) ?? this.config.get<string>('META_CAPI_CURRENCY') ?? 'BRL',
      sendLeadEvents: persisted?.sendLeadEvents ?? this.booleanEnv('META_CAPI_SEND_LEAD_EVENTS', false),
      sendPurchaseEvents: persisted?.sendPurchaseEvents ?? this.booleanEnv('META_CAPI_SEND_PURCHASE_EVENTS', true),
    } satisfies ResolvedMetaSettings;
  }

  private getMissingSettings(settings: ResolvedMetaSettings) {
    return [
      ['datasetId', settings.datasetId],
      ['whatsappBusinessAccountId', settings.whatsappBusinessAccountId],
      ['accessToken', settings.accessToken],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);
  }

  private async parseResponsePayload(response: Response) {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private extractMetaError(payload: unknown, status: number) {
    const error = (payload as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;

    if (!error) {
      return `Meta Conversions API failed with HTTP ${status}`;
    }

    return [error.message, error.code ? `code ${error.code}` : null, error.error_subcode ? `subcode ${error.error_subcode}` : null]
      .filter(Boolean)
      .join(' ');
  }

  private isEventTimeAllowed(date: Date) {
    const now = Date.now();
    const eventTime = date.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return eventTime <= now + 60_000 && eventTime >= now - sevenDays;
  }

  private serializeEvent(event: any) {
    return {
      ...event,
      sale: event.sale
        ? {
            ...event.sale,
            amount: Number(event.sale.amount),
          }
        : null,
    };
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage Meta conversions');
    }
  }

  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned || null;
  }

  private pickString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private booleanEnv(name: string, fallback: boolean) {
    const value = this.config.get<string>(name);

    if (value === undefined) {
      return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private encryptOptional(value?: string | null) {
    return value?.trim() ? this.encrypt(value.trim()) : null;
  }

  private decryptOptional(value?: string | null) {
    if (!value) {
      return null;
    }

    try {
      return this.decrypt(value);
    } catch (error) {
      this.logger.warn(`Could not decrypt Meta CAPI access token: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return ['v1', iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  private decrypt(value: string) {
    const [version, iv, authTag, encrypted] = value.split(':');

    if (version !== 'v1' || !iv || !authTag || !encrypted) {
      throw new Error('Invalid encrypted token format');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
  }

  private encryptionKey() {
    const secret =
      this.config.get<string>('META_CAPI_ENCRYPTION_KEY') ??
      this.config.get<string>('JWT_SECRET') ??
      'dev-secret';

    return createHash('sha256').update(secret).digest();
  }
}

const conversionEventInclude = {
  sale: {
    select: { id: true, title: true, amount: true, status: true, soldAt: true },
  },
  contact: {
    select: { id: true, name: true, phone: true, waId: true, avatarUrl: true },
  },
  attribution: {
    select: {
      id: true,
      ctwaClid: true,
      sourceId: true,
      sourceUrl: true,
      headline: true,
      receivedAt: true,
    },
  },
};
