'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RefreshCw, Save, Target } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MetaConversionEventSummary, MetaConversionsSettingsSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { cn, formatCurrency, formatShortDate } from '@/lib/utils';
import { metaConversionStatusLabels } from './business-admin-utils';

export function MetaConversionsAdminPanel() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['meta-conversions-settings'],
    queryFn: () => apiFetch<MetaConversionsSettingsSummary>('/meta/conversions/settings'),
  });
  const eventsQuery = useQuery({
    queryKey: ['meta-conversions-events'],
    queryFn: () => apiFetch<MetaConversionEventSummary[]>('/meta/conversions/events'),
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [datasetId, setDatasetId] = useState('');
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState('');
  const [graphApiVersion, setGraphApiVersion] = useState('v20.0');
  const [accessToken, setAccessToken] = useState('');
  const [testEventCode, setTestEventCode] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [sendLeadEvents, setSendLeadEvents] = useState(false);
  const [sendPurchaseEvents, setSendPurchaseEvents] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setIsEnabled(settingsQuery.data.isEnabled);
    setDatasetId(settingsQuery.data.datasetId ?? '');
    setWhatsappBusinessAccountId(settingsQuery.data.whatsappBusinessAccountId ?? '');
    setGraphApiVersion(settingsQuery.data.graphApiVersion || 'v20.0');
    setTestEventCode(settingsQuery.data.testEventCode ?? '');
    setCurrency(settingsQuery.data.currency || 'BRL');
    setSendLeadEvents(settingsQuery.data.sendLeadEvents);
    setSendPurchaseEvents(settingsQuery.data.sendPurchaseEvents);
  }, [settingsQuery.data]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiFetch('/meta/conversions/settings', {
        method: 'PUT',
        body: JSON.stringify({
          isEnabled,
          datasetId: datasetId.trim() || null,
          whatsappBusinessAccountId: whatsappBusinessAccountId.trim() || null,
          graphApiVersion: graphApiVersion.trim() || 'v20.0',
          accessToken: accessToken.trim() || undefined,
          testEventCode: testEventCode.trim() || null,
          currency: currency.trim().toUpperCase() || 'BRL',
          sendLeadEvents,
          sendPurchaseEvents,
        }),
      });
      setAccessToken('');
      await queryClient.invalidateQueries({ queryKey: ['meta-conversions-settings'] });
      toast.success('Configuracao da Meta salva.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase text-muted-foreground">Meta Ads</p>
      </div>

      {settingsQuery.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <form onSubmit={saveSettings} className="space-y-4 rounded-md border border-border bg-card p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr_140px_120px]">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Dataset ID</span>
              <Input value={datasetId} onChange={(event) => setDatasetId(event.target.value)} placeholder="1234567890" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">WhatsApp Business Account ID</span>
              <Input
                value={whatsappBusinessAccountId}
                onChange={(event) => setWhatsappBusinessAccountId(event.target.value)}
                placeholder="1234567890"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Graph API</span>
              <Input value={graphApiVersion} onChange={(event) => setGraphApiVersion(event.target.value)} placeholder="v20.0" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Moeda</span>
              <Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} />
            </label>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {settingsQuery.data?.hasAccessToken ? 'Token salvo' : 'Access token'}
              </span>
              <Input
                type="password"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder={settingsQuery.data?.hasAccessToken ? 'Preencha apenas para trocar' : 'Token do usuario de sistema'}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Test Event Code</span>
              <Input value={testEventCode} onChange={(event) => setTestEventCode(event.target.value)} placeholder="opcional" />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ToggleRow checked={isEnabled} onChange={setIsEnabled} label="Integracao ativa" />
            <ToggleRow checked={sendPurchaseEvents} onChange={setSendPurchaseEvents} label="Enviar compras" />
            <ToggleRow checked={sendLeadEvents} onChange={setSendLeadEvents} label="Enviar leads" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {settingsQuery.data?.usingEnvAccessToken ? 'Usando token das variaveis de ambiente.' : 'Token gerenciado pelo painel.'}
            </div>
            <Button type="submit" disabled={saving}>
              <Save />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Eventos recentes</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void eventsQuery.refetch()}
            disabled={eventsQuery.isFetching}
          >
            <RefreshCw />
            Atualizar
          </Button>
        </div>

        {eventsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : eventsQuery.data?.length ? (
          <div className="space-y-2">
            {eventsQuery.data.map((event) => (
              <MetaConversionEventItem key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
            Nenhum evento enviado ainda.
          </div>
        )}
      </section>
    </section>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex h-10 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );
}

function MetaConversionEventItem({ event }: { event: MetaConversionEventSummary }) {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  async function retryEvent() {
    setRetrying(true);
    try {
      await apiFetch(`/meta/conversions/events/${event.id}/retry`, { method: 'POST' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meta-conversions-events'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
      ]);
      toast.success('Evento reenviado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel reenviar.');
    } finally {
      setRetrying(false);
    }
  }

  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[180px_minmax(0,1fr)_160px_110px]">
      <div>
        <StatusBadge status={event.status} />
        <p className="mt-2 text-xs text-muted-foreground">{event.eventName}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {event.sale ? `${event.sale.title} - ${formatCurrency(event.sale.amount)}` : event.contact?.name ?? 'Evento de lead'}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {event.attribution?.headline ?? event.attribution?.sourceId ?? event.eventId}
        </p>
        {event.errorMessage ? <p className="mt-2 text-xs text-destructive">{event.errorMessage}</p> : null}
      </div>
      <div className="text-sm text-muted-foreground">
        {event.sentAt ? `Enviado em ${formatShortDate(event.sentAt)}` : `Criado em ${formatShortDate(event.createdAt)}`}
      </div>
      <div className="flex items-center justify-end">
        {event.status === 'FAILED' || event.status === 'SKIPPED' ? (
          <Button type="button" variant="secondary" size="sm" disabled={retrying} onClick={() => void retryEvent()}>
            <RefreshCw />
            Reenviar
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: MetaConversionEventSummary['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-1 text-xs font-semibold',
        status === 'SENT' && 'bg-primary/10 text-primary',
        status === 'PENDING' && 'bg-muted text-muted-foreground',
        status === 'FAILED' && 'bg-destructive/10 text-destructive',
        status === 'SKIPPED' && 'bg-amber-500/10 text-amber-600',
      )}
    >
      {metaConversionStatusLabels[status]}
    </span>
  );
}
