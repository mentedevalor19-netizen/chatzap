import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, search?: string) {
    const where: Prisma.ContactWhereInput = {
      organizationId: user.organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { waId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const contacts = await this.prisma.contact.findMany({
      where,
      include: this.contactInclude,
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
      take: 50,
    });

    return contacts.map((contact) => this.serialize(contact));
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: user.organizationId },
      include: this.contactInclude,
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.serialize(contact);
  }

  async create(user: AuthenticatedUser, dto: CreateContactDto) {
    const contact = await this.prisma.contact.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        phone: dto.phone,
        waId: dto.waId,
        avatarUrl: dto.avatarUrl,
        tags: dto.tagIds?.length
          ? {
              createMany: {
                data: dto.tagIds.map((tagId) => ({
                  tagId,
                  organizationId: user.organizationId,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: this.contactInclude,
    });

    return this.serialize(contact);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateContactDto) {
    await this.assertContact(user, id);

    const contact = await this.prisma.$transaction(async (tx) => {
      if (dto.tagIds) {
        await tx.contactTag.deleteMany({
          where: { contactId: id, organizationId: user.organizationId },
        });
        if (dto.tagIds.length) {
          await tx.contactTag.createMany({
            data: dto.tagIds.map((tagId) => ({
              contactId: id,
              tagId,
              organizationId: user.organizationId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.contact.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
          waId: dto.waId,
          avatarUrl: dto.avatarUrl,
        },
        include: this.contactInclude,
      });
    });

    return this.serialize(contact);
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.assertContact(user, id);
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }

  async addNote(user: AuthenticatedUser, contactId: string, dto: CreateNoteDto) {
    await this.assertContact(user, contactId);

    return this.prisma.note.create({
      data: {
        organizationId: user.organizationId,
        contactId,
        userId: user.id,
        body: dto.body,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async listNotes(user: AuthenticatedUser, contactId: string) {
    await this.assertContact(user, contactId);

    return this.prisma.note.findMany({
      where: {
        organizationId: user.organizationId,
        contactId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertContact(user: AuthenticatedUser, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
  }

  private get contactInclude() {
    return {
      tags: {
        include: {
          tag: true,
        },
      },
      notes: {
        take: 5,
        orderBy: {
          createdAt: 'desc' as const,
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    };
  }

  private serialize(contact: any) {
    return {
      ...contact,
      tags: contact.tags.map((contactTag: any) => contactTag.tag),
    };
  }
}
