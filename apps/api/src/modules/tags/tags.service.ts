import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser) {
    return this.prisma.tag.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
    });
  }

  create(user: AuthenticatedUser, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        color: dto.color,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTagDto) {
    await this.assertTag(user, id);

    return this.prisma.tag.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.assertTag(user, id);
    await this.prisma.tag.delete({ where: { id } });
    return { ok: true };
  }

  private async assertTag(user: AuthenticatedUser, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
  }
}
