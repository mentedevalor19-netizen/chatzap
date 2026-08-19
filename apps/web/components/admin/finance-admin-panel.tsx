'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Calculator, ReceiptText, Save, Trash2, TrendingUp } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CrmMetricsSummary, ExpenseCategory, ExpenseSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { cn, formatCurrency, formatShortDate } from '@/lib/utils';
import {
  expenseCategoryLabels,
  getCurrentMonthRange,
  toDateInputValue,
} from './business-admin-utils';

const expenseCategories: ExpenseCategory[] = ['ADS', 'SUPPLIER', 'LTV', 'TOOLS', 'OTHER'];

export function FinanceAdminPanel() {
  const queryClient = useQueryClient();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [category, setCategory] = useState<ExpenseCategory>('ADS');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [spentAt, setSpentAt] = useState(toDateInputValue(new Date()));
  const [saving, setSaving] = useState(false);

  const metricsQuery = useQuery({
    queryKey: ['crm-metrics', from, to],
    queryFn: () =>
      apiFetch<CrmMetricsSummary>(`/metrics/crm?${new URLSearchParams({ from, to }).toString()}`),
  });
  const expensesQuery = useQuery({
    queryKey: ['expenses', from, to],
    queryFn: () =>
      apiFetch<ExpenseSummary[]>(`/expenses?${new URLSearchParams({ from, to }).toString()}`),
  });

  async function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          amount: Number(amount),
          spentAt,
        }),
      });
      setDescription('');
      setAmount('');
      await invalidateFinanceQueries(queryClient);
      toast.success('Gasto registrado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel registrar o gasto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase text-muted-foreground">Financeiro</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[150px_150px]">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      {metricsQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : metricsQuery.data ? (
        <MetricsOverview metrics={metricsQuery.data} />
      ) : null}

      <form
        onSubmit={createExpense}
        className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[190px_minmax(0,1fr)_150px_145px_120px]"
      >
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Categoria</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {expenseCategories.map((expenseCategory) => (
              <option key={expenseCategory} value={expenseCategory}>
                {expenseCategoryLabels[expenseCategory]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Descricao</span>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ads, fornecedor, ferramenta..."
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Valor</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Data</span>
          <Input type="date" value={spentAt} onChange={(event) => setSpentAt(event.target.value)} />
        </label>
        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full"
            disabled={saving || !description.trim() || Number(amount) <= 0}
          >
            <ReceiptText />
            Lancar
          </Button>
        </div>
      </form>

      {metricsQuery.data ? <Breakdowns metrics={metricsQuery.data} /> : null}

      {expensesQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : expensesQuery.data?.length ? (
        <div className="space-y-2">
          {expensesQuery.data.map((expense) => (
            <ExpenseItem key={expense.id} expense={expense} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
          Nenhum gasto no periodo.
        </div>
      )}
    </section>
  );
}

function MetricsOverview({ metrics }: { metrics: CrmMetricsSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Faturamento" value={formatCurrency(metrics.revenue)} />
      <MetricCard title="Gastos" value={formatCurrency(metrics.expenses)} muted />
      <MetricCard
        title="Lucro estimado"
        value={formatCurrency(metrics.profit)}
        positive={metrics.profit >= 0}
      />
      <MetricCard
        title="Margem"
        value={`${metrics.marginPercent.toFixed(1)}%`}
        positive={metrics.marginPercent >= 0}
      />
      <MetricCard title="Ticket medio" value={formatCurrency(metrics.averageTicket)} />
      <MetricCard title="Vendas LTV" value={`${metrics.ltvSalesCount}`} />
      <MetricCard
        title="Receita LTV"
        value={formatCurrency(metrics.ltvRevenue)}
        positive={metrics.ltvRevenue > 0}
      />
      <MetricCard title="Custo LTV" value={formatCurrency(metrics.ltvCost)} muted />
      <MetricCard
        title="Lucro LTV"
        value={formatCurrency(metrics.ltvProfit)}
        positive={metrics.ltvProfit >= 0}
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  muted = false,
  positive,
}: {
  title: string;
  value: string;
  muted?: boolean;
  positive?: boolean;
}) {
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <p
        className={cn(
          'mt-2 truncate text-2xl font-semibold',
          muted && 'text-muted-foreground',
          positive === true && 'text-primary',
          positive === false && 'text-destructive',
        )}
      >
        {value}
      </p>
    </article>
  );
}

function Breakdowns({ metrics }: { metrics: CrmMetricsSummary }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Vendas por atendente
          </p>
        </div>
        <div className="space-y-2">
          {metrics.salesBySeller.length ? (
            metrics.salesBySeller.map((item) => (
              <div
                key={item.sellerId ?? 'none'}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate">{item.seller?.name ?? 'Sem atendente'}</span>
                <span className="shrink-0 font-semibold text-primary">
                  {formatCurrency(item.revenue)} - {item.salesCount}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem vendas pagas no periodo.</p>
          )}
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Gastos por categoria
          </p>
        </div>
        <div className="space-y-2">
          {metrics.expensesByCategory.length ? (
            metrics.expensesByCategory.map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-3 text-sm">
                <span>{expenseCategoryLabels[item.category]}</span>
                <span className="font-semibold text-muted-foreground">
                  {formatCurrency(item.amount)} - {item.count}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem gastos no periodo.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function ExpenseItem({ expense }: { expense: ExpenseSummary }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount));
  const [spentAt, setSpentAt] = useState(toDateInputValue(expense.spentAt));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function updateExpense() {
    setSaving(true);
    try {
      await apiFetch(`/expenses/${expense.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          category,
          description,
          amount: Number(amount),
          spentAt,
        }),
      });
      await invalidateFinanceQueries(queryClient);
      toast.success('Gasto atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar.');
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense() {
    setRemoving(true);
    try {
      await apiFetch(`/expenses/${expense.id}`, { method: 'DELETE' });
      await invalidateFinanceQueries(queryClient);
      toast.success('Gasto removido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel remover.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[190px_minmax(0,1fr)_150px_145px_96px]">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Categoria</span>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {expenseCategories.map((expenseCategory) => (
            <option key={expenseCategory} value={expenseCategory}>
              {expenseCategoryLabels[expenseCategory]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Descricao</span>
        <Input value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Valor</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Data</span>
        <Input type="date" value={spentAt} onChange={(event) => setSpentAt(event.target.value)} />
        <span className="block truncate text-xs text-muted-foreground">
          {formatShortDate(expense.spentAt)}
        </span>
      </label>
      <div className="flex items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Salvar gasto"
          disabled={saving || !description.trim() || Number(amount) <= 0}
          onClick={() => void updateExpense()}
        >
          <Save />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Excluir gasto"
          disabled={removing}
          onClick={() => void removeExpense()}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

async function invalidateFinanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    queryClient.invalidateQueries({ queryKey: ['crm-metrics'] }),
  ]);
}
