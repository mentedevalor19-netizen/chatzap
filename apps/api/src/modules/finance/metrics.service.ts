import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConversationStatus, Prisma, SaleStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { buildDateRange, decimalToNumber } from './finance.utils';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, from?: string, to?: string) {
    this.assertAdmin(user);

    const soldAt = buildDateRange(from, to);
    const spentAt = buildDateRange(from, to);
    const paidSalesWhere: Prisma.SaleWhereInput = {
      organizationId: user.organizationId,
      status: SaleStatus.PAID,
      ...(soldAt ? { soldAt } : {}),
    };
    const expenseWhere: Prisma.ExpenseWhereInput = {
      organizationId: user.organizationId,
      ...(spentAt ? { spentAt } : {}),
    };

    const [
      salesAggregate,
      salesCount,
      pendingSalesCount,
      expenseAggregate,
      expenseCount,
      contactsCount,
      conversationGroups,
      salesBySellerGroups,
      expensesByCategoryGroups,
    ] = await Promise.all([
      this.prisma.sale.aggregate({ where: paidSalesWhere, _sum: { amount: true } }),
      this.prisma.sale.count({ where: paidSalesWhere }),
      this.prisma.sale.count({
        where: {
          organizationId: user.organizationId,
          status: SaleStatus.PENDING,
          ...(soldAt ? { soldAt } : {}),
        },
      }),
      this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      this.prisma.expense.count({ where: expenseWhere }),
      this.prisma.contact.count({ where: { organizationId: user.organizationId } }),
      this.prisma.conversation.groupBy({
        by: ['status'],
        where: { organizationId: user.organizationId },
        _count: { _all: true },
      }),
      this.prisma.sale.groupBy({
        by: ['sellerId'],
        where: paidSalesWhere,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: expenseWhere,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const sellerIds = salesBySellerGroups
      .map((group) => group.sellerId)
      .filter((sellerId): sellerId is string => Boolean(sellerId));
    const sellers = sellerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: sellerIds }, organizationId: user.organizationId },
          select: { id: true, name: true, email: true, role: true, isActive: true },
        })
      : [];
    const sellerMap = new Map(sellers.map((seller) => [seller.id, seller]));
    const revenue = decimalToNumber(salesAggregate._sum.amount);
    const expenses = decimalToNumber(expenseAggregate._sum.amount);
    const profit = revenue - expenses;
    const conversationStats = this.serializeConversationStats(conversationGroups);

    return {
      revenue,
      expenses,
      profit,
      marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
      salesCount,
      pendingSalesCount,
      averageTicket: salesCount > 0 ? revenue / salesCount : 0,
      expenseCount,
      contactsCount,
      conversations: conversationStats,
      salesBySeller: salesBySellerGroups.map((group) => ({
        sellerId: group.sellerId,
        seller: group.sellerId ? sellerMap.get(group.sellerId) ?? null : null,
        revenue: decimalToNumber(group._sum.amount),
        salesCount: group._count._all,
      })),
      expensesByCategory: expensesByCategoryGroups.map((group) => ({
        category: group.category,
        amount: decimalToNumber(group._sum.amount),
        count: group._count._all,
      })),
    };
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view CRM metrics');
    }
  }

  private serializeConversationStats(groups: Array<{ status: ConversationStatus; _count: { _all: number } }>) {
    const map = new Map(groups.map((group) => [group.status, group._count._all]));
    const open = map.get(ConversationStatus.OPEN) ?? 0;
    const pending = map.get(ConversationStatus.PENDING) ?? 0;
    const closed = map.get(ConversationStatus.CLOSED) ?? 0;

    return {
      open,
      pending,
      closed,
      total: open + pending + closed,
    };
  }
}
