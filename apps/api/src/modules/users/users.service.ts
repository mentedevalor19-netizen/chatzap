import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser, search?: string) {
    this.assertAdmin(user);
    const query = search?.trim();

    return this.prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: userSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async create(user: AuthenticatedUser, dto: CreateUserDto) {
    this.assertAdmin(user);

    try {
      const created = await this.prisma.user.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(dto.password, 12),
          role: dto.role ?? UserRole.AGENT,
          isActive: true,
        },
        select: userSelect,
      });

      return created;
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    this.assertAdmin(user);
    await this.assertUserInOrganization(user, id);
    this.assertSelfUpdateIsSafe(user, id, dto);

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
          ...(dto.password !== undefined ? { passwordHash: await bcrypt.hash(dto.password, 12) } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: userSelect,
      });
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    await this.assertUserInOrganization(user, id);

    if (user.id === id) {
      throw new BadRequestException('You cannot deactivate your own user');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });
  }

  private async assertUserInOrganization(user: AuthenticatedUser, id: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage users');
    }
  }

  private assertSelfUpdateIsSafe(user: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    if (user.id !== id) {
      return;
    }

    if (dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own user');
    }

    if (dto.role && dto.role !== UserRole.ADMIN) {
      throw new BadRequestException('You cannot remove your own admin access');
    }
  }

  private handleUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('User email already exists');
    }
  }
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};
