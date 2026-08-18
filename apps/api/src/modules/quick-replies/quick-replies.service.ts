import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@Injectable()
export class QuickRepliesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser, search?: string) {
    const query = search?.trim();

    return this.prisma.quickReply.findMany({
      where: {
        organizationId: user.organizationId,
        ...(query
          ? {
              OR: [
                { shortcut: { contains: this.normalizeSearch(query), mode: 'insensitive' } },
                { body: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { shortcut: 'asc' },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateQuickReplyDto) {
    this.assertAdmin(user);

    try {
      return await this.prisma.quickReply.create({
        data: {
          organizationId: user.organizationId,
          shortcut: this.normalizeShortcut(dto.shortcut),
          body: dto.body.trim(),
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateQuickReplyDto) {
    this.assertAdmin(user);
    await this.assertExists(user, id);

    try {
      return await this.prisma.quickReply.update({
        where: { id },
        data: {
          ...(dto.shortcut !== undefined ? { shortcut: this.normalizeShortcut(dto.shortcut) } : {}),
          ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    await this.assertExists(user, id);
    await this.prisma.quickReply.delete({ where: { id } });
    return { ok: true };
  }

  private async assertExists(user: AuthenticatedUser, id: string) {
    const quickReply = await this.prisma.quickReply.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!quickReply) {
      throw new NotFoundException('Quick reply not found');
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage quick replies');
    }
  }

  private normalizeShortcut(shortcut: string) {
    const normalized = shortcut.trim().toLowerCase().replace(/^\/+/, '');

    if (!normalized || !/^[a-z0-9_-]+$/.test(normalized)) {
      throw new BadRequestException('Quick reply shortcut is invalid');
    }

    return normalized;
  }

  private normalizeSearch(search: string) {
    return search.trim().toLowerCase().replace(/^\/+/, '');
  }

  private handleUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Quick reply shortcut already exists');
    }
  }
}
