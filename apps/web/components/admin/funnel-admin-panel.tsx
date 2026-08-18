'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  FileText,
  FileUp,
  Image as ImageIcon,
  Music,
  Plus,
  Save,
  Trash2,
  Video,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FunnelStepSummary, FunnelStepType, FunnelSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api';

interface UploadResponse {
  fileName: string;
  mimeType: string;
  mediaUrl: string;
}

interface EditableFunnelStep extends Omit<FunnelStepSummary, 'id'> {
  id: string;
  uploading?: boolean;
}

const stepTypes: Array<{ value: FunnelStepType; label: string }> = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'IMAGE', label: 'Imagem' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'DOCUMENT', label: 'Documento' },
];

export function FunnelAdminPanel() {
  const queryClient = useQueryClient();
  const funnelQuery = useQuery({
    queryKey: ['active-funnel'],
    queryFn: () => apiFetch<FunnelSummary>('/funnels/active'),
  });
  const [name, setName] = useState('Funil inicial');
  const [isActive, setIsActive] = useState(true);
  const [handoffMessage, setHandoffMessage] = useState('Atendimento humano iniciado.');
  const [steps, setSteps] = useState<EditableFunnelStep[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!funnelQuery.data) return;

    setName(funnelQuery.data.name);
    setIsActive(funnelQuery.data.isActive);
    setHandoffMessage(funnelQuery.data.handoffMessage ?? '');
    setSteps(
      funnelQuery.data.steps.map((step) => ({
        ...step,
        body: step.body ?? '',
        caption: step.caption ?? '',
        mediaId: step.mediaId ?? '',
        mediaUrl: step.mediaUrl ?? '',
        mimeType: step.mimeType ?? '',
        fileName: step.fileName ?? '',
      })),
    );
  }, [funnelQuery.data]);

  const waitingStep = useMemo(() => steps.find((step) => step.waitForReply), [steps]);

  function updateStep(id: string, patch: Partial<EditableFunnelStep>) {
    setSteps((current) =>
      current.map((step) => (step.id === id ? normalizeStep({ ...step, ...patch }) : step)),
    );
  }

  function addStep() {
    setSteps((current) => [...current, blankStep(current.length + 1)]);
  }

  function removeStep(id: string) {
    setSteps((current) => current.filter((step) => step.id !== id).map((step, index) => ({ ...step, position: index + 1 })));
  }

  function moveStep(id: string, direction: -1 | 1) {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === id);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = current.slice();
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((step, itemIndex) => ({ ...step, position: itemIndex + 1 }));
    });
  }

  async function uploadStepMedia(stepId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    updateStep(stepId, { uploading: true });
    try {
      const form = new FormData();
      form.append('file', file);
      const upload = await apiFetch<UploadResponse>('/uploads', {
        method: 'POST',
        body: form,
      });

      updateStep(stepId, {
        type: typeFromMime(upload.mimeType),
        mediaUrl: upload.mediaUrl,
        mimeType: upload.mimeType,
        fileName: upload.fileName,
        uploading: false,
      });
      toast.success('Arquivo anexado ao funil.');
    } catch (error) {
      updateStep(stepId, { uploading: false });
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel anexar o arquivo.');
    }
  }

  async function saveFunnel() {
    setSaving(true);
    try {
      const saved = await apiFetch<FunnelSummary>('/funnels/active', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          isActive,
          handoffMessage,
          steps: steps.map((step, index) => ({
            position: index + 1,
            type: step.type,
            body: step.body?.trim() || undefined,
            mediaId: step.mediaId?.trim() || undefined,
            mediaUrl: step.mediaUrl?.trim() || undefined,
            mimeType: step.mimeType?.trim() || undefined,
            fileName: step.fileName?.trim() || undefined,
            caption: step.caption?.trim() || undefined,
            waitForReply: step.waitForReply,
          })),
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ['active-funnel'] });
      setSteps(saved.steps.map((step) => ({ ...step, body: step.body ?? '', caption: step.caption ?? '' })));
      toast.success('Funil salvo.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar o funil.');
    } finally {
      setSaving(false);
    }
  }

  if (funnelQuery.isLoading) {
    return (
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        <HeaderSkeleton />
        <div className="space-y-4 p-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="truncate text-sm font-semibold">Funil de atendimento</h1>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {waitingStep ? `Pausa apos a etapa ${waitingStep.position}` : 'Sem pausa configurada'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void saveFunnel()} disabled={saving}>
          <Save />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </header>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        <section className="grid gap-4 border-b border-border p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Configuracao</p>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do funil" />
            <Textarea
              value={handoffMessage}
              onChange={(event) => setHandoffMessage(event.target.value)}
              rows={3}
              placeholder="Mensagem interna de handoff"
            />
          </div>

          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Funil ativo
            </label>
            <Separator className="my-4" />
            <div className="space-y-1">
              <p className="text-2xl font-semibold">{steps.length}</p>
              <p className="text-xs text-muted-foreground">etapas configuradas</p>
            </div>
          </div>
        </section>

        <section className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Etapas</p>
            <Button type="button" variant="secondary" size="sm" onClick={addStep}>
              <Plus />
              Adicionar
            </Button>
          </div>

          {steps.length ? (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <FunnelStepEditor
                  key={step.id}
                  step={step}
                  first={index === 0}
                  last={index === steps.length - 1}
                  onChange={(patch) => updateStep(step.id, patch)}
                  onDelete={() => removeStep(step.id)}
                  onMove={(direction) => moveStep(step.id, direction)}
                  onUpload={(event) => void uploadStepMedia(step.id, event)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-52 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
              Nenhuma etapa configurada.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FunnelStepEditor({
  step,
  first,
  last,
  onChange,
  onDelete,
  onMove,
  onUpload,
}: {
  step: EditableFunnelStep;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<EditableFunnelStep>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <article className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
            {step.position}
          </span>
          <select
            value={step.type}
            onChange={(event) => onChange({ type: event.target.value as FunnelStepType })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {stepTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Subir etapa" disabled={first} onClick={() => onMove(-1)}>
                <ArrowUp />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Subir</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Descer etapa" disabled={last} onClick={() => onMove(1)}>
                <ArrowDown />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descer</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Excluir etapa" onClick={onDelete}>
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          {step.type === 'TEXT' ? (
            <Textarea
              value={step.body ?? ''}
              onChange={(event) => onChange({ body: event.target.value })}
              rows={4}
              placeholder="Mensagem"
            />
          ) : (
            <>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm font-medium transition-colors hover:bg-muted">
                <FileUp className="h-4 w-4 text-primary" />
                {step.uploading ? 'Enviando arquivo...' : 'Anexar arquivo'}
                <input type="file" accept={acceptForType(step.type)} className="hidden" onChange={onUpload} />
              </label>
              <Input
                value={step.mediaUrl ?? ''}
                onChange={(event) => onChange({ mediaUrl: event.target.value })}
                placeholder="URL publica da midia"
              />
              <Textarea
                value={step.caption ?? ''}
                onChange={(event) => onChange({ caption: event.target.value })}
                rows={3}
                placeholder="Legenda opcional"
              />
            </>
          )}

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={step.waitForReply}
              onChange={(event) => onChange({ waitForReply: event.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Aguardar resposta do cliente
          </label>
        </div>

        <MediaPreview step={step} />
      </div>
    </article>
  );
}

function MediaPreview({ step }: { step: EditableFunnelStep }) {
  const icon = iconForType(step.type);

  if (step.type === 'TEXT') {
    return (
      <div className="min-h-36 rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
        {step.body || 'Preview da mensagem'}
      </div>
    );
  }

  return (
    <div className="min-h-36 rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        {icon}
        <span className="min-w-0 truncate">{step.fileName || step.caption || 'Midia do funil'}</span>
      </div>
      {step.type === 'IMAGE' && step.mediaUrl ? (
        <img src={step.mediaUrl} alt={step.caption || 'Imagem do funil'} className="max-h-44 w-full rounded-md object-cover" />
      ) : null}
      {step.type === 'AUDIO' && step.mediaUrl ? <audio src={step.mediaUrl} controls className="w-full" /> : null}
      {step.type === 'VIDEO' && step.mediaUrl ? <video src={step.mediaUrl} controls className="max-h-44 w-full rounded-md" /> : null}
      {step.type === 'DOCUMENT' && step.mediaUrl ? (
        <a href={step.mediaUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
          Abrir documento
        </a>
      ) : null}
      {!step.mediaUrl ? <p className="text-sm text-muted-foreground">Sem arquivo anexado.</p> : null}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-8 w-24" />
    </header>
  );
}

function blankStep(position: number): EditableFunnelStep {
  return {
    id: createClientId(),
    position,
    type: 'TEXT',
    body: '',
    mediaId: '',
    mediaUrl: '',
    mimeType: '',
    fileName: '',
    caption: '',
    waitForReply: position === 1,
  };
}

function normalizeStep(step: EditableFunnelStep): EditableFunnelStep {
  if (step.type === 'TEXT') {
    return {
      ...step,
      mediaId: '',
      mediaUrl: '',
      mimeType: '',
      fileName: '',
      caption: '',
    };
  }

  return step;
}

function createClientId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `step-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function typeFromMime(mime: string): FunnelStepType {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

function acceptForType(type: FunnelStepType) {
  if (type === 'IMAGE') return 'image/*';
  if (type === 'AUDIO') return 'audio/*';
  if (type === 'VIDEO') return 'video/*';
  if (type === 'DOCUMENT') return 'application/pdf,.pdf,.doc,.docx,.xls,.xlsx';
  return undefined;
}

function iconForType(type: FunnelStepType) {
  const className = 'h-4 w-4 shrink-0 text-primary';

  if (type === 'IMAGE') return <ImageIcon className={className} />;
  if (type === 'AUDIO') return <Music className={className} />;
  if (type === 'VIDEO') return <Video className={className} />;
  return <FileText className={className} />;
}
