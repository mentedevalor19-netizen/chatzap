import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategory, Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { buildDateRange, decimalToNumber, parseOptionalDate } from './finance.utils';

interface ExpenseFilters {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
  search?: string;
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, filters: ExpenseFilters) {
    this.assertAdmin(user);

    const expenses = await this.prisma.expense.findMany({
      where: this.buildWhere(user, filters),
      include: expenseInclude,
      orderBy: [{ spentAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return expenses.map((expense) => this.serialize(expense));
  }

  async create(user: AuthenticatedUser, dto: CreateExpenseDto) {
    this.assertAdmin(user);

    const expense = await this.prisma.expense.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        category: dto.category ?? ExpenseCategory.OTHER,
        description: dto.description.trim(),
        amount: dto.amount,
        spentAt: parseOptionalDate(dto.spentAt, 'spentAt') ?? new Date(),
      },
      include: expenseInclude,
    });

    return this.serialize(expense);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateExpenseDto) {
    this.assertAdmin(user);
    await this.assertExpense(user, id);

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.spentAt !== undefined ? { spentAt: parseOptionalDate(dto.spentAt, 'spentAt') } : {}),
      },
      include: expenseInclude,
    });

    return this.serialize(expense);
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    await this.assertExpense(user, id);
    await this.prisma.expense.delete({ where: { id } });
    return { ok: true };
  }

  private buildWhere(user: AuthenticatedUser, filters: ExpenseFilters) {
    const dateRange = buildDateRange(filters.from, filters.to);
    const where: Prisma.ExpenseWhereInput = {
      organizationId: user.organizationId,
      ...(dateRange ? { spentAt: dateRange } : {}),
    };

    if (filters.category) {
      this.assertExpenseCategory(filters.category);
      where.category = filters.category;
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.description = { contains: search, mode: 'insensitive' };
    }

    return where;
  }

  private async assertExpense(user: AuthenticatedUser, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage expenses');
    }
  }

  private assertExpenseCategory(category: ExpenseCategory) {
    if (!Object.values(ExpenseCategory).includes(category)) {
      throw new BadRequestException('Expense category is invalid');
    }
  }

  private serialize(expense: any) {
    return {
      ...expense,
      amount: decimalToNumber(expense.amount),
    };
  }
}

const expenseInclude = {
  createdBy: {
    select: { id: true, name: true, email: true, role: true, isActive: true },
  },
};
