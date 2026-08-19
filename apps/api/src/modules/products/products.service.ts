import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { cleanOptionalText, decimalToNumber } from '../finance/finance.utils';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

interface ProductFilters {
  search?: string;
  activeOnly?: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, filters: ProductFilters = {}) {
    const search = filters.search?.trim();
    const activeOnly = user.role !== UserRole.ADMIN || this.isTruthy(filters.activeOnly);

    const products = await this.prisma.product.findMany({
      where: {
        organizationId: user.organizationId,
        ...(activeOnly ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return products.map((product) => this.serialize(product));
  }

  async create(user: AuthenticatedUser, dto: CreateProductDto) {
    this.assertAdmin(user);

    try {
      const product = await this.prisma.product.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name.trim(),
          sku: cleanOptionalText(dto.sku),
          description: cleanOptionalText(dto.description),
          price: dto.price,
          isActive: dto.isActive ?? true,
        },
      });

      return this.serialize(product);
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductDto) {
    this.assertAdmin(user);
    await this.assertProduct(user, id);

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.sku !== undefined ? { sku: cleanOptionalText(dto.sku) } : {}),
          ...(dto.description !== undefined
            ? { description: cleanOptionalText(dto.description) }
            : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      return this.serialize(product);
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    await this.assertProduct(user, id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return this.serialize(product);
  }

  private async assertProduct(user: AuthenticatedUser, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage products');
    }
  }

  private serialize(product: { price: unknown }) {
    return {
      ...product,
      price: decimalToNumber(product.price),
    };
  }

  private isTruthy(value?: string) {
    return value === 'true' || value === '1' || value === 'yes';
  }

  private handleUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Product name already exists');
    }
  }
}
