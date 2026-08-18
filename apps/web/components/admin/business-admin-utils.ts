import type { ExpenseCategory, SaleStatus } from '@/lib/types';
import type { MetaConversionStatus } from '@/lib/types';

export const saleStatusLabels: Record<SaleStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
};

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  ADS: 'Ads',
  SUPPLIER: 'Fornecedor',
  TOOLS: 'Ferramentas',
  OTHER: 'Outros',
};

export const metaConversionStatusLabels: Record<MetaConversionStatus, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  FAILED: 'Falhou',
  SKIPPED: 'Ignorado',
};

export function getCurrentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

export function toDateInputValue(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}
