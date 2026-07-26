import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageStatus, MessageType, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async findByConversation(
    user: AuthenticatedUser,
    conversationId: string,
    cursor?: string,
    limit = 30,
  ) {
    await this.assertConversation(user, conversationId);

    const take = Math.min(Math.max(limit, 1), 80) + 1;
    const messages = await this.prisma.message.findMany({
      where: {
        organizationId: user.organizationId,
        conversationId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const hasMore = messages.length === take;
    const page = hasMore ? messages.slice(0, -1) : messages;
    const ordered = page.reverse();

    return {
      items: ordered,
      nextCursor: hasMore ? ordered[0]?.createdAt.toISOString() : null,
    };
  }

  async send(user: AuthenticatedUser, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      include: {
        contact: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.validateSendPayload(dto);

    const draft = await this.prisma.message.create({
      data: {
        organization: { connect: { id: user.organizationId } },
        conversation: { connect: { id: conversationId } },
        contact: { connect: { id: conversation.contactId } },
        senderUser: { connect: { id: user.id } },
        direction: 'OUTBOUND',
        status: 'QUEUED',
        type: dto.type,
        body: dto.body,
        mediaId: dto.mediaId,
        mediaUrl: dto.mediaUrl,
        mimeType: dto.mimeType,
        fileName: dto.fileName,
        caption: dto.caption,
        locationLatitude: dto.latitude,
        locationLongitude: dto.longitude,
        locationName: dto.locationName,
        locationAddress: dto.locationAddress,
        contactPayload: dto.contactPayload as Prisma.InputJsonValue,
      },
    });

    let saved = draft;

    try {
      const waMessageId = await this.sendThroughWhatsapp(conversation.contact.waId, dto);
      saved = await this.prisma.message.update({
        where: { id: draft.id },
        data: {
          waMessageId,
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      saved = await this.prisma.message.update({
        where: { id: draft.id },
        data: {
          status: MessageStatus.FAILED,
          rawPayload: {
            error: error instanceof Error ? error.message : 'Unknown WhatsApp send error',
          },
        },
      });
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: conversation.status === 'CLOSED' ? 'OPEN' : conversation.status,
        lastMessageAt: saved.createdAt,
      },
    });

    this.realtime.emitToConversation(user.organizationId, conversationId, 'message.created', saved);
    return saved;
  }

  private async sendThroughWhatsapp(to: string, dto: SendMessageDto) {
    switch (dto.type) {
      case MessageType.TEXT:
        return this.whatsapp.sendText(to, dto.body ?? '');
      case MessageType.IMAGE:
      case MessageType.VIDEO:
      case MessageType.AUDIO:
      case MessageType.DOCUMENT:
        return this.whatsapp.sendMedia({
          type: dto.type,
          to,
          mediaId: dto.mediaId,
          mediaUrl: dto.mediaUrl,
          caption: dto.caption,
          fileName: dto.fileName,
        });
      case MessageType.LOCATION:
        return this.whatsapp.sendLocation(to, {
          latitude: dto.latitude ?? 0,
          longitude: dto.longitude ?? 0,
          name: dto.locationName,
          address: dto.locationAddress,
        });
      case MessageType.CONTACT:
        return this.whatsapp.sendContact(to, dto.contactPayload ?? []);
      case MessageType.TEMPLATE:
        return this.whatsapp.sendTemplate({
          to,
          name: dto.templateName ?? '',
          languageCode: dto.templateLanguageCode ?? 'pt_BR',
          components: dto.templateComponents,
        });
      default:
        throw new BadRequestException(`Unsupported outbound message type: ${dto.type}`);
    }
  }

  private validateSendPayload(dto: SendMessageDto) {
    if (dto.type === MessageType.TEXT && !dto.body?.trim()) {
      throw new BadRequestException('Text message body is required');
    }

    const mediaTypes: MessageType[] = [
      MessageType.IMAGE,
      MessageType.VIDEO,
      MessageType.AUDIO,
      MessageType.DOCUMENT,
    ];

    if (mediaTypes.includes(dto.type) && !dto.mediaId && !dto.mediaUrl) {
      throw new BadRequestException('Media message requires mediaId or mediaUrl');
    }

    if (dto.type === MessageType.LOCATION && (dto.latitude === undefined || dto.longitude === undefined)) {
      throw new BadRequestException('Location message requires latitude and longitude');
    }

    if (dto.type === MessageType.TEMPLATE && !dto.templateName) {
      throw new BadRequestException('Template name is required');
    }
  }

  private async assertConversation(user: AuthenticatedUser, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
  }
}
