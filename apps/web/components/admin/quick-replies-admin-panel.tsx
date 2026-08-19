'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { FileUp, Image as ImageIcon, MessageSquareText, Plus, Save, Trash2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { QuickReplySummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

interface UploadResponse {
  fileName: string;
  mimeType: string;
  mediaUrl: string;
}

interface QuickReplyMedia {
  mediaUrl: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export function QuickRepliesAdminPanel() {
  const queryClient = useQueryClient();
  const quickRepliesQuery = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => apiFetch<QuickReplySummary[]>('/quick-replies'),
  });
  const [shortcut, setShortcut] = useState('');
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<QuickReplyMedia | null>(null);
  const [saving, setSaving] = useState(false);

  async function createQuickReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    try {
      await apiFetch('/quick-replies', {
        method: 'POST',
        body: JSON.stringify({
          shortcut,
          body,
          mediaUrl: media?.mediaUrl,
          mimeType: media?.mimeType,
          fileName: media?.fileName,
        }),
      });
      setShortcut('');
      setBody('');
      setMedia(null);
      await queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rapida criada.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Nao foi possivel criar a resposta rapida.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <h1 className="truncate text-sm font-semibold">Respostas rapidas</h1>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Comandos /atalho com texto e imagem opcional.
          </p>
        </div>
      </header>

      <div className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <form
          onSubmit={createQuickReply}
          className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[220px_minmax(0,1fr)_280px_120px]"
        >
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Comando</span>
            <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center rounded-md border border-input bg-background">
              <span className="text-center text-sm text-muted-foreground">/</span>
              <Input
                value={shortcut}
                onChange={(event) => setShortcut(event.target.value)}
                placeholder="preco"
                className="border-0 pl-0 focus-visible:ring-0"
              />
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Texto</span>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={2}
              placeholder="Mensagem que sera preenchida no input"
            />
          </label>
          <ImageAttachmentField media={media} onChange={setMedia} />
          <div className="flex items-end">
            <Button
              type="submit"
              className="w-full"
              disabled={saving || !shortcut.trim() || !body.trim()}
            >
              <Plus />
              Criar
            </Button>
          </div>
        </form>

        {quickRepliesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : quickRepliesQuery.data?.length ? (
          <div className="space-y-2">
            {quickRepliesQuery.data.map((quickReply) => (
              <QuickReplyItem key={quickReply.id} quickReply={quickReply} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
            Nenhuma resposta rapida cadastrada.
          </div>
        )}
      </div>
    </main>
  );
}

function QuickReplyItem({ quickReply }: { quickReply: QuickReplySummary }) {
  const queryClient = useQueryClient();
  const [shortcut, setShortcut] = useState(quickReply.shortcut);
  const [body, setBody] = useState(quickReply.body);
  const [media, setMedia] = useState<QuickReplyMedia | null>(() =>
    buildQuickReplyMedia(quickReply),
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setShortcut(quickReply.shortcut);
    setBody(quickReply.body);
    setMedia(buildQuickReplyMedia(quickReply));
  }, [quickReply]);

  async function updateQuickReply() {
    setSaving(true);
    try {
      await apiFetch(`/quick-replies/${quickReply.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          shortcut,
          body,
          mediaUrl: media?.mediaUrl ?? null,
          mimeType: media?.mimeType ?? null,
          fileName: media?.fileName ?? null,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rapida atualizada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar.');
    } finally {
      setSaving(false);
    }
  }

  async function removeQuickReply() {
    setRemoving(true);
    try {
      await apiFetch(`/quick-replies/${quickReply.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rapida removida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel remover.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[220px_minmax(0,1fr)_280px_96px]">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Comando</span>
        <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center rounded-md border border-input bg-background">
          <span className="text-center text-sm text-muted-foreground">/</span>
          <Input
            value={shortcut}
            onChange={(event) => setShortcut(event.target.value)}
            className="border-0 pl-0 focus-visible:ring-0"
          />
        </div>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Texto</span>
        <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} />
      </label>
      <ImageAttachmentField media={media} onChange={setMedia} />
      <div className="flex items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Salvar resposta rapida"
          disabled={saving || !shortcut.trim() || !body.trim()}
          onClick={() => void updateQuickReply()}
        >
          <Save />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Excluir resposta rapida"
          disabled={removing}
          onClick={() => void removeQuickReply()}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

function buildQuickReplyMedia(quickReply: QuickReplySummary): QuickReplyMedia | null {
  if (!quickReply.mediaUrl) {
    return null;
  }

  return {
    mediaUrl: quickReply.mediaUrl,
    mimeType: quickReply.mimeType,
    fileName: quickReply.fileName,
  };
}

function ImageAttachmentField({
  media,
  onChange,
}: {
  media: QuickReplyMedia | null;
  onChange: (media: QuickReplyMedia | null) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const upload = await apiFetch<UploadResponse>('/uploads', {
        method: 'POST',
        body: form,
      });

      onChange({
        mediaUrl: upload.mediaUrl,
        mimeType: upload.mimeType,
        fileName: upload.fileName,
      });
      toast.success('Imagem anexada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel anexar a imagem.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Imagem opcional</span>
      <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2">
        <Input
          value={media?.mediaUrl ?? ''}
          onChange={(event) =>
            onChange(
              event.target.value
                ? { mediaUrl: event.target.value, mimeType: null, fileName: null }
                : null,
            )
          }
          placeholder="URL ou upload"
        />
        <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-muted">
          <FileUp className="h-4 w-4 text-primary" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void uploadImage(event)}
          />
        </label>
      </div>
      <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">
            {uploading ? 'Enviando...' : media?.fileName || media?.mediaUrl || 'Sem imagem'}
          </span>
        </div>
        {media ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover imagem"
            onClick={() => onChange(null)}
          >
            <X />
          </Button>
        ) : null}
      </div>
      {media?.mediaUrl ? (
        <img
          src={media.mediaUrl}
          alt="Imagem da resposta rapida"
          className="h-24 w-full rounded-md object-cover"
        />
      ) : null}
    </div>
  );
}
