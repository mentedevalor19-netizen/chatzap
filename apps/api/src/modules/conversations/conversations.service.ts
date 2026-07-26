import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async findAll(user: AuthenticatedUser, status?: ConversationStatus, search?: string) {
    const where: Prisma.ConversationWhereInput = {
      organizationId: user.organizationId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { contact: { name: { contains: search, mode: 'insensitive' } } },
              { contact: { phone: { contains: search, mode: 'insensitive' } } },
              { messages: { some: { body: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: this.conversationInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      take: 50,
    });

    return conversations.map((conversation) => this.serialize(conversation));
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: this.conversationInclude,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.serialize(conversation);
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateConversationStatusDto) {
    await this.assertConversation(user, id);

    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { status: dto.status },
      include: this.conversationInclude,
    });

    const serialized = this.serialize(conversation);
    this.realtime.emitToOrganization(user.organizationId, 'conversation.upsert', serialized);
    return serialized;
  }

  async assign(user: AuthenticatedUser, id: string, dto: AssignConversationDto) {
    await this.assertConversation(user, id);

    if (dto.userId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.userId, organizationId: user.organizationId },
        select: { id: true },
      });

      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }
    }

    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { assignedToId: dto.userId ?? null },
      include: this.conversationInclude,
    });

    const serialized = this.serialize(conversation);
    this.realtime.emitToOrganization(user.organizationId, 'conversation.upsert', serialized);
    return serialized;
  }

  async markRead(user: AuthenticatedUser, id: string) {
    await this.assertConversation(user, id);

    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
      include: this.conversationInclude,
    });

    const serialized = this.serialize(conversation);
    this.realtime.emitToOrganization(user.organizationId, 'conversation.read', { conversationId: id });
    this.realtime.emitToOrganization(user.organizationId, 'conversation.upsert', serialized);
    return serialized;
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

  private get conversationInclude() {
    return {
      contact: {
        include: {
          tags: {
            include: { tag: true },
          },
        },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
    };
  }

  private serialize(conversation: any) {
    const [lastMessage] = conversation.messages;

    return {
      ...conversation,
      contact: {
        ...conversation.contact,
        tags: conversation.contact.tags.map((contactTag: any) => contactTag.tag),
      },
      lastMessage: lastMessage ?? null,
      messages: undefined,
    };
  }
}
