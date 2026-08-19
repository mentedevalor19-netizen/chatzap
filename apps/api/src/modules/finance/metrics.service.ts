import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConversationStatus, ExpenseCategory, Prisma, SaleStatus, UserRole } from '@prisma/client';
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
      ltvExpenseAggregate,
      contactsCount,
      conversationGroups,
      salesBySellerGroups,
      expensesByCategoryGroups,
      paidSalesInPeriod,
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
      this.prisma.expense.aggregate({
        where: {
          ...expenseWhere,
          category: ExpenseCategory.LTV,
        },
        _sum: { amount: true },
      }),
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
      this.prisma.sale.findMany({
        where: {
          ...paidSalesWhere,
          contactId: { not: null },
        },
        select: { id: true, contactId: true, amount: true, soldAt: true, createdAt: true },
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
    const ltvCost = decimalToNumber(ltvExpenseAggregate._sum.amount);
    const ltvStats = await this.calculateLtvStats(user.organizationId, paidSalesInPeriod);
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
      ltvRevenue: ltvStats.revenue,
      ltvSalesCount: ltvStats.salesCount,
      ltvCost,
      ltvProfit: ltvStats.revenue - ltvCost,
      expenseCount,
      contactsCount,
      conversations: conversationStats,
      salesBySeller: salesBySellerGroups.map((group) => ({
        sellerId: group.sellerId,
        seller: group.sellerId ? (sellerMap.get(group.sellerId) ?? null) : null,
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

  private async calculateLtvStats(
    organizationId: string,
    salesInPeriod: Array<{
      id: string;
      contactId: string | null;
      amount: unknown;
      soldAt: Date;
      createdAt: Date;
    }>,
  ) {
    const contactIds = [
      ...new Set(
        salesInPeriod.map((sale) => sale.contactId).filter((id): id is string => Boolean(id)),
      ),
    ];

    if (!contactIds.length) {
      return { revenue: 0, salesCount: 0 };
    }

    const history = await this.prisma.sale.findMany({
      where: {
        organizationId,
        status: SaleStatus.PAID,
        contactId: { in: contactIds },
      },
      select: { id: true, contactId: true, soldAt: true, createdAt: true },
      orderBy: [{ contactId: 'asc' }, { soldAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    const recurrentSaleIds = new Set<string>();
    const seenContacts = new Set<string>();

    for (const sale of history) {
      if (!sale.contactId) {
        continue;
      }

      if (seenContacts.has(sale.contactId)) {
        recurrentSaleIds.add(sale.id);
      } else {
        seenContacts.add(sale.contactId);
      }
    }

    const ltvSales = salesInPeriod.filter((sale) => recurrentSaleIds.has(sale.id));
    const revenue = ltvSales.reduce((total, sale) => total + decimalToNumber(sale.amount), 0);

    return {
      revenue,
      salesCount: ltvSales.length,
    };
  }

  private serializeConversationStats(
    groups: Array<{ status: ConversationStatus; _count: { _all: number } }>,
  ) {
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
