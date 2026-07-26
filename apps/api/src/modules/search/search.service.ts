import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(user: AuthenticatedUser, query: string) {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      return {
        contacts: [],
        conversations: [],
        messages: [],
      };
    }

    const [contacts, conversations, messages] = await Promise.all([
      this.prisma.contact.findMany({
        where: {
          organizationId: user.organizationId,
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { phone: { contains: trimmed, mode: 'insensitive' } },
            { waId: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        include: { tags: { include: { tag: true } } },
        take: 12,
      }),
      this.prisma.conversation.findMany({
        where: {
          organizationId: user.organizationId,
          OR: [
            { contact: { name: { contains: trimmed, mode: 'insensitive' } } },
            { contact: { phone: { contains: trimmed, mode: 'insensitive' } } },
            { messages: { some: { body: { contains: trimmed, mode: 'insensitive' } } } },
          ],
        },
        include: {
          contact: { include: { tags: { include: { tag: true } } } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        take: 12,
      }),
      this.prisma.message.findMany({
        where: {
          organizationId: user.organizationId,
          body: { contains: trimmed, mode: 'insensitive' },
        },
        include: {
          contact: true,
          conversation: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      contacts: contacts.map((contact) => ({
        ...contact,
        tags: contact.tags.map((contactTag) => contactTag.tag),
      })),
      conversations: conversations.map((conversation) => ({
        ...conversation,
        contact: {
          ...conversation.contact,
          tags: conversation.contact.tags.map((contactTag) => contactTag.tag),
        },
        lastMessage: conversation.messages[0] ?? null,
        messages: undefined,
      })),
      messages,
    };
  }
}
