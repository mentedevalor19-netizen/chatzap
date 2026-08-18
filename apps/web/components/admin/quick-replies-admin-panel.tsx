'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MessageSquareText, Plus, Save, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { QuickReplySummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

export function QuickRepliesAdminPanel() {
  const queryClient = useQueryClient();
  const quickRepliesQuery = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => apiFetch<QuickReplySummary[]>('/quick-replies'),
  });
  const [shortcut, setShortcut] = useState('');
  const [body, setBody] = useState('');
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
        }),
      });
      setShortcut('');
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rapida criada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar a resposta rapida.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 border-t border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase text-muted-foreground">Respostas rapidas</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Use no chat digitando /comando.</p>
        </div>
      </div>

      <form onSubmit={createQuickReply} className="grid gap-3 rounded-md border border-border bg-card p-4 lg:grid-cols-[220px_minmax(0,1fr)_120px]">
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
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={saving || !shortcut.trim() || !body.trim()}>
            <Plus />
            Criar
          </Button>
        </div>
      </form>

      {quickRepliesQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : quickRepliesQuery.data?.length ? (
        <div className="space-y-2">
          {quickRepliesQuery.data.map((quickReply) => (
            <QuickReplyItem key={quickReply.id} quickReply={quickReply} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
          Nenhuma resposta rapida cadastrada.
        </div>
      )}
    </section>
  );
}

function QuickReplyItem({ quickReply }: { quickReply: QuickReplySummary }) {
  const queryClient = useQueryClient();
  const [shortcut, setShortcut] = useState(quickReply.shortcut);
  const [body, setBody] = useState(quickReply.body);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setShortcut(quickReply.shortcut);
    setBody(quickReply.body);
  }, [quickReply.body, quickReply.shortcut]);

  async function updateQuickReply() {
    setSaving(true);
    try {
      await apiFetch(`/quick-replies/${quickReply.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          shortcut,
          body,
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
    <article className="grid gap-3 rounded-md border border-border bg-card p-4 lg:grid-cols-[220px_minmax(0,1fr)_88px]">
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
