import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SaleStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { MetaConversionsService } from '../meta/meta-conversions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { buildDateRange, cleanOptionalText, decimalToNumber, parseOptionalDate } from './finance.utils';

interface SaleFilters {
  from?: string;
  to?: string;
  sellerId?: string;
  status?: SaleStatus;
  search?: string;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metaConversions: MetaConversionsService,
  ) {}

  async findAll(user: AuthenticatedUser, filters: SaleFilters) {
    const sales = await this.prisma.sale.findMany({
      where: this.buildWhere(user, filters),
      include: saleInclude,
      orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return sales.map((sale) => this.serialize(sale));
  }

  async create(user: AuthenticatedUser, dto: CreateSaleDto) {
    const sellerId = await this.resolveSellerId(user, dto.sellerId);
    const conversation = await this.resolveConversation(user, dto.conversationId);
    const contactId = cleanOptionalText(dto.contactId) ?? conversation?.contactId ?? null;

    if (contactId) {
      await this.assertContact(user, contactId);
    }

    const sale = await this.prisma.sale.create({
      data: {
        organizationId: user.organizationId,
        sellerId,
        contactId,
        conversationId: conversation?.id ?? null,
        title: dto.title.trim(),
        amount: dto.amount,
        status: dto.status ?? SaleStatus.PAID,
        note: cleanOptionalText(dto.note),
        soldAt: parseOptionalDate(dto.soldAt, 'soldAt') ?? new Date(),
      },
      include: saleInclude,
    });

    this.syncPaidSaleWithMeta(user.organizationId, sale.id, sale.status);

    return this.serialize(sale);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateSaleDto) {
    await this.assertSaleAccess(user, id);
    const previousSale = await this.prisma.sale.findUnique({
      where: { id },
      select: { status: true },
    });
    const sellerId = dto.sellerId !== undefined ? await this.resolveSellerId(user, dto.sellerId) : undefined;
    const conversation = dto.conversationId !== undefined ? await this.resolveConversation(user, dto.conversationId) : undefined;
    const contactId =
      dto.contactId !== undefined
        ? cleanOptionalText(dto.contactId) ?? conversation?.contactId ?? null
        : conversation?.contactId;

    if (contactId) {
      await this.assertContact(user, contactId);
    }

    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.note !== undefined ? { note: cleanOptionalText(dto.note) } : {}),
        ...(dto.soldAt !== undefined ? { soldAt: parseOptionalDate(dto.soldAt, 'soldAt') } : {}),
        ...(dto.sellerId !== undefined ? { sellerId } : {}),
        ...(dto.contactId !== undefined || conversation ? { contactId: contactId ?? null } : {}),
        ...(dto.conversationId !== undefined ? { conversationId: conversation?.id ?? null } : {}),
      },
      include: saleInclude,
    });

    if (sale.status === SaleStatus.PAID && previousSale?.status !== SaleStatus.PAID) {
      this.syncPaidSaleWithMeta(user.organizationId, sale.id, sale.status);
    }

    return this.serialize(sale);
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.assertSaleAccess(user, id);
    await this.prisma.sale.delete({ where: { id } });
    return { ok: true };
  }

  private buildWhere(user: AuthenticatedUser, filters: SaleFilters) {
    const dateRange = buildDateRange(filters.from, filters.to);
    const where: Prisma.SaleWhereInput = {
      organizationId: user.organizationId,
      ...(dateRange ? { soldAt: dateRange } : {}),
    };

    if (filters.status) {
      this.assertSaleStatus(filters.status);
      where.status = filters.status;
    }

    if (user.role !== UserRole.ADMIN) {
      where.sellerId = user.id;
    } else if (filters.sellerId?.trim()) {
      where.sellerId = filters.sellerId.trim();
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search, mode: 'insensitive' } } },
        { seller: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private async resolveSellerId(user: AuthenticatedUser, sellerId?: string | null) {
    const normalizedSellerId = cleanOptionalText(sellerId) ?? user.id;

    if (user.role !== UserRole.ADMIN && normalizedSellerId !== user.id) {
      throw new ForbiddenException('You can only create sales for yourself');
    }

    const seller = await this.prisma.user.findFirst({
      where: {
        id: normalizedSellerId,
        organizationId: user.organizationId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return seller.id;
  }

  private async resolveConversation(user: AuthenticatedUser, conversationId?: string | null) {
    const normalizedConversationId = cleanOptionalText(conversationId);

    if (!normalizedConversationId) {
      return null;
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: normalizedConversationId, organizationId: user.organizationId },
      select: { id: true, contactId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private async assertContact(user: AuthenticatedUser, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
  }

  private async assertSaleAccess(user: AuthenticatedUser, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ...(user.role === UserRole.ADMIN ? {} : { sellerId: user.id }),
      },
      select: { id: true },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
  }

  private assertSaleStatus(status: SaleStatus) {
    if (!Object.values(SaleStatus).includes(status)) {
      throw new BadRequestException('Sale status is invalid');
    }
  }

  private serialize(sale: any) {
    return {
      ...sale,
      amount: decimalToNumber(sale.amount),
    };
  }

  private syncPaidSaleWithMeta(organizationId: string, saleId: string, status: SaleStatus) {
    if (status !== SaleStatus.PAID) {
      return;
    }

    void this.metaConversions.sendPurchaseForSale(organizationId, saleId).catch(() => undefined);
  }
}

const saleInclude = {
  seller: {
    select: { id: true, name: true, email: true, role: true, isActive: true },
  },
  contact: {
    select: { id: true, name: true, phone: true, waId: true, avatarUrl: true },
  },
  conversation: {
    select: { id: true, status: true },
  },
  metaConversionEvents: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      eventName: true,
      eventId: true,
      status: true,
      errorMessage: true,
      sentAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};
