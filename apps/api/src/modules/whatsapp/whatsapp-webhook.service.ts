import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageStatus, MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { WhatsappService } from './whatsapp.service';
import {
  WhatsappInboundMessage,
  WhatsappStatusUpdate,
  WhatsappWebhookPayload,
} from './whatsapp-webhook.types';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  async handle(payload: unknown) {
    const webhook = payload as WhatsappWebhookPayload;
    const changes = webhook.entry?.flatMap((entry) => entry.changes ?? []) ?? [];

    for (const change of changes) {
      const organizationId = await this.resolveOrganizationId();

      if (!organizationId) {
        this.logger.warn('Webhook ignored because no organization exists');
        continue;
      }

      const contacts = change.value?.contacts ?? [];

      for (const status of change.value?.statuses ?? []) {
        await this.handleStatus(organizationId, status);
      }

      for (const message of change.value?.messages ?? []) {
        const profile = contacts.find((contact) => contact.wa_id === message.from);
        await this.handleInboundMessage(organizationId, message, profile?.profile?.name);
      }
    }
  }

  private async handleInboundMessage(organizationId: string, message: WhatsappInboundMessage, profileName?: string) {
    const existing = await this.prisma.message.findUnique({
      where: { waMessageId: message.id },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    const contact = await this.prisma.contact.upsert({
      where: {
        organizationId_waId: {
          organizationId,
          waId: message.from,
        },
      },
      update: {
        name: profileName ?? undefined,
        phone: message.from,
        lastSeenAt: this.fromUnixTimestamp(message.timestamp),
      },
      create: {
        organizationId,
        waId: message.from,
        phone: message.from,
        name: profileName ?? message.from,
        lastSeenAt: this.fromUnixTimestamp(message.timestamp),
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    const conversation =
      (await this.prisma.conversation.findFirst({
        where: {
          organizationId,
          contactId: contact.id,
          status: { not: 'CLOSED' },
        },
        orderBy: { updatedAt: 'desc' },
      })) ??
      (await this.prisma.conversation.create({
        data: {
          organizationId,
          contactId: contact.id,
          status: 'OPEN',
        },
      }));

    const data = await this.mapInboundMessage(organizationId, conversation.id, contact.id, message);

    const savedMessage = await this.prisma.message.create({
      data,
    });

    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: { increment: 1 },
        lastMessageAt: savedMessage.createdAt,
        status: conversation.status === 'CLOSED' ? 'OPEN' : conversation.status,
      },
      include: {
        contact: {
          include: { tags: { include: { tag: true } } },
        },
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    this.realtime.emitToOrganization(organizationId, 'contact.upsert', {
      ...contact,
      tags: contact.tags.map((contactTag) => contactTag.tag),
    });
    this.realtime.emitToOrganization(organizationId, 'conversation.upsert', {
      ...updatedConversation,
      contact: {
        ...updatedConversation.contact,
        tags: updatedConversation.contact.tags.map((contactTag) => contactTag.tag),
      },
      lastMessage: updatedConversation.messages[0] ?? null,
      messages: undefined,
    });
    this.realtime.emitToConversation(organizationId, conversation.id, 'message.created', savedMessage);

    void this.whatsapp.markIncomingAsRead(message.id).catch(() => undefined);
  }

  private async handleStatus(organizationId: string, status: WhatsappStatusUpdate) {
    const mappedStatus = this.mapMessageStatus(status.status);
    const timestamp = this.fromUnixTimestamp(status.timestamp) ?? new Date();
    const updateData: Prisma.MessageUpdateInput = {
      status: mappedStatus,
      ...(mappedStatus === MessageStatus.SENT ? { sentAt: timestamp } : {}),
      ...(mappedStatus === MessageStatus.DELIVERED ? { deliveredAt: timestamp } : {}),
      ...(mappedStatus === MessageStatus.READ ? { readAt: timestamp } : {}),
      ...(status.status === 'failed'
        ? { rawPayload: { status } as unknown as Prisma.InputJsonValue }
        : {}),
    };

    const message = await this.prisma.message
      .update({
        where: { waMessageId: status.id },
        data: updateData,
      })
      .catch(() => null);

    if (!message) {
      return;
    }

    this.realtime.emitToConversation(organizationId, message.conversationId, 'message.status', {
      id: message.id,
      conversationId: message.conversationId,
      status: message.status,
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
    });
  }

  private async mapInboundMessage(
    organizationId: string,
    conversationId: string,
    contactId: string,
    message: WhatsappInboundMessage,
  ): Promise<Prisma.MessageCreateInput> {
    const base = {
      organization: { connect: { id: organizationId } },
      conversation: { connect: { id: conversationId } },
      contact: { connect: { id: contactId } },
      waMessageId: message.id,
      direction: 'INBOUND' as const,
      status: 'RECEIVED' as const,
      rawPayload: message as unknown as Prisma.InputJsonValue,
      createdAt: this.fromUnixTimestamp(message.timestamp) ?? new Date(),
    };

    if (message.text) {
      return {
        ...base,
        type: MessageType.TEXT,
        body: message.text.body,
      };
    }

    if (message.location) {
      return {
        ...base,
        type: MessageType.LOCATION,
        locationLatitude: message.location.latitude,
        locationLongitude: message.location.longitude,
        locationName: message.location.name,
        locationAddress: message.location.address,
      };
    }

    if (message.contacts) {
      return {
        ...base,
        type: MessageType.CONTACT,
        contactPayload: message.contacts as Prisma.InputJsonValue,
      };
    }

    const media = message.image ?? message.video ?? message.audio ?? message.document ?? message.sticker;
    const type = this.mapInboundType(message.type);
    const mediaUrl = media?.id ? await this.whatsapp.resolveMediaUrl(media.id).catch(() => null) : null;

    return {
      ...base,
      type,
      mediaId: media?.id,
      mediaUrl: mediaUrl?.url,
      mimeType: media?.mime_type ?? mediaUrl?.mimeType,
      caption: media?.caption,
      fileName: message.document?.filename,
    };
  }

  private mapInboundType(type: string): MessageType {
    const mapping: Record<string, MessageType> = {
      text: MessageType.TEXT,
      image: MessageType.IMAGE,
      video: MessageType.VIDEO,
      audio: MessageType.AUDIO,
      document: MessageType.DOCUMENT,
      location: MessageType.LOCATION,
      contacts: MessageType.CONTACT,
      sticker: MessageType.STICKER,
    };

    return mapping[type] ?? MessageType.SYSTEM;
  }

  private mapMessageStatus(status: WhatsappStatusUpdate['status']) {
    const mapping: Record<WhatsappStatusUpdate['status'], MessageStatus> = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    };

    return mapping[status];
  }

  private fromUnixTimestamp(timestamp?: string) {
    if (!timestamp) {
      return null;
    }

    const seconds = Number(timestamp);
    return Number.isFinite(seconds) ? new Date(seconds * 1000) : null;
  }

  private async resolveOrganizationId() {
    const configuredId = this.config.get<string>('DEFAULT_ORGANIZATION_ID');

    if (configuredId) {
      return configuredId;
    }

    const organization = await this.prisma.organization.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    return organization?.id ?? null;
  }
}
