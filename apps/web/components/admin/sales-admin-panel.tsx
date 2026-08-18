'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Banknote, Save, Target, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ContactSummary, SaleStatus, SaleSummary, UserSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatPhone, formatShortDate } from '@/lib/utils';
import { getCurrentMonthRange, metaConversionStatusLabels, saleStatusLabels, toDateInputValue } from './business-admin-utils';

const saleStatuses: SaleStatus[] = ['PAID', 'PENDING', 'CANCELLED', 'REFUNDED'];

export function SalesAdminPanel() {
  const queryClient = useQueryClient();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [contactId, setContactId] = useState('');
  const [status, setStatus] = useState<SaleStatus>('PAID');
  const [soldAt, setSoldAt] = useState(toDateInputValue(new Date()));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserSummary[]>('/users'),
  });
  const contactsQuery = useQuery({
    queryKey: ['contacts', 'sales-admin'],
    queryFn: () => apiFetch<ContactSummary[]>('/contacts'),
  });
  const salesQuery = useQuery({
    queryKey: ['sales', from, to, sellerFilter],
    queryFn: () => {
      const params = new URLSearchParams({ from, to });
      if (sellerFilter !== 'ALL') {
        params.set('sellerId', sellerFilter);
      }
      return apiFetch<SaleSummary[]>(`/sales?${params.toString()}`);
    },
  });

  const users = usersQuery.data ?? [];
  const activeUsers = users.filter((user) => user.isActive);
  const contacts = contactsQuery.data ?? [];
  const totalRevenue = (salesQuery.data ?? [])
    .filter((sale) => sale.status === 'PAID')
    .reduce((total, sale) => total + sale.amount, 0);

  async function createSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiFetch('/sales', {
        method: 'POST',
        body: JSON.stringify({
          title,
          amount: Number(amount),
          sellerId: sellerId || undefined,
          contactId: contactId || undefined,
          status,
          soldAt,
          note: note.trim() || undefined,
        }),
      });
      setTitle('');
      setAmount('');
      setContactId('');
      setNote('');
      await invalidateBusinessQueries(queryClient);
      toast.success('Venda registrada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel registrar a venda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase text-muted-foreground">Vendas</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[150px_150px_minmax(180px,240px)]">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <select
            value={sellerFilter}
            onChange={(event) => setSellerFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">Todos os atendentes</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={createSale} className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[1.2fr_150px_190px_1fr_145px]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Venda</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Produto, plano ou servico" />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Valor</span>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Atendente</span>
          <select
            value={sellerId}
            onChange={(event) => setSellerId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Meu usuario</option>
            {activeUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Contato</span>
          <select
            value={contactId}
            onChange={(event) => setContactId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Sem contato vinculado</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} - {formatPhone(contact.phone)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Data</span>
          <Input type="date" value={soldAt} onChange={(event) => setSoldAt(event.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as SaleStatus)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {saleStatuses.map((saleStatus) => (
              <option key={saleStatus} value={saleStatus}>
                {saleStatusLabels[saleStatus]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 xl:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Observacao</span>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Detalhes internos" />
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={saving || !title.trim() || Number(amount) <= 0}>
            <Banknote />
            Registrar
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
        <span className="text-sm font-medium">Faturamento confirmado no filtro</span>
        <span className="text-lg font-semibold text-primary">{formatCurrency(totalRevenue)}</span>
      </div>

      {salesQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : salesQuery.data?.length ? (
        <div className="space-y-2">
          {salesQuery.data.map((sale) => (
            <SaleItem key={sale.id} sale={sale} users={users} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
          Nenhuma venda no periodo.
        </div>
      )}
    </section>
  );
}

function SaleItem({ sale, users }: { sale: SaleSummary; users: UserSummary[] }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(sale.title);
  const [amount, setAmount] = useState(String(sale.amount));
  const [sellerId, setSellerId] = useState(sale.seller?.id ?? '');
  const [status, setStatus] = useState<SaleStatus>(sale.status);
  const [soldAt, setSoldAt] = useState(toDateInputValue(sale.soldAt));
  const [note, setNote] = useState(sale.note ?? '');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [sendingMeta, setSendingMeta] = useState(false);
  const latestMetaEvent = sale.metaConversionEvents?.[0];

  async function updateSale() {
    setSaving(true);
    try {
      await apiFetch(`/sales/${sale.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          amount: Number(amount),
          sellerId: sellerId || undefined,
          status,
          soldAt,
          note: note.trim() || null,
        }),
      });
      await invalidateBusinessQueries(queryClient);
      toast.success('Venda atualizada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar.');
    } finally {
      setSaving(false);
    }
  }

  async function removeSale() {
    setRemoving(true);
    try {
      await apiFetch(`/sales/${sale.id}`, { method: 'DELETE' });
      await invalidateBusinessQueries(queryClient);
      toast.success('Venda removida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel remover.');
    } finally {
      setRemoving(false);
    }
  }

  async function sendMetaPurchase() {
    setSendingMeta(true);
    try {
      await apiFetch(`/meta/conversions/sales/${sale.id}/send`, { method: 'POST' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['meta-conversions-events'] }),
      ]);
      toast.success('Evento enviado para Meta.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel enviar para Meta.');
    } finally {
      setSendingMeta(false);
    }
  }

  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[1.2fr_150px_190px_145px_150px_96px]">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Venda</span>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        <span className="block truncate text-xs text-muted-foreground">
          {sale.contact ? `${sale.contact.name} - ${formatPhone(sale.contact.phone)}` : 'Sem contato vinculado'}
        </span>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Valor</span>
        <Input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Atendente</span>
        <select
          value={sellerId}
          onChange={(event) => setSellerId(event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as SaleStatus)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {saleStatuses.map((saleStatus) => (
            <option key={saleStatus} value={saleStatus}>
              {saleStatusLabels[saleStatus]}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Meta Ads</span>
        <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm">
          {latestMetaEvent ? metaConversionStatusLabels[latestMetaEvent.status] : 'Nao enviado'}
        </div>
        {latestMetaEvent?.errorMessage ? (
          <span className="block truncate text-xs text-destructive">{latestMetaEvent.errorMessage}</span>
        ) : null}
      </div>
      <div className="flex items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Enviar venda para Meta"
          disabled={sendingMeta || status !== 'PAID'}
          onClick={() => void sendMetaPurchase()}
        >
          <Target />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Salvar venda"
          disabled={saving || !title.trim() || Number(amount) <= 0}
          onClick={() => void updateSale()}
        >
          <Save />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Excluir venda"
          disabled={removing}
          onClick={() => void removeSale()}
        >
          <Trash2 />
        </Button>
      </div>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Data</span>
        <Input type="date" value={soldAt} onChange={(event) => setSoldAt(event.target.value)} />
      </label>
      <label className="space-y-1.5 xl:col-span-4">
        <span className="text-xs font-medium text-muted-foreground">Observacao</span>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
      </label>
      <div className="flex items-end justify-end text-sm font-semibold text-primary xl:col-span-6">
        {formatCurrency(Number(amount) || sale.amount)} em {formatShortDate(sale.soldAt)}
      </div>
    </article>
  );
}

async function invalidateBusinessQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['sales'] }),
    queryClient.invalidateQueries({ queryKey: ['crm-metrics'] }),
    queryClient.invalidateQueries({ queryKey: ['meta-conversions-events'] }),
  ]);
}
