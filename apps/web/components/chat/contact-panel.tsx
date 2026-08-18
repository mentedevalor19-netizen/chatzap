'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Save, StickyNote, Tag, Trash2, Workflow, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ConversationSummary, Note } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { formatPhone, initials } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';

export function ContactPanel({ conversation }: { conversation?: ConversationSummary }) {
  const queryClient = useQueryClient();
  const infoOpen = useChatStore((state) => state.infoOpen);
  const setInfoOpen = useChatStore((state) => state.setInfoOpen);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const [name, setName] = useState(conversation?.contact.name ?? '');
  const [phone, setPhone] = useState(conversation?.contact.phone ?? '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [startingFunnel, setStartingFunnel] = useState(false);

  const notesQuery = useQuery({
    queryKey: ['contact-notes', conversation?.contact.id],
    enabled: Boolean(conversation?.contact.id),
    queryFn: () => apiFetch<Note[]>(`/contacts/${conversation?.contact.id}/notes`),
  });

  useEffect(() => {
    setName(conversation?.contact.name ?? '');
    setPhone(conversation?.contact.phone ?? '');
    setNote('');
  }, [conversation?.contact.id, conversation?.contact.name, conversation?.contact.phone]);

  if (!conversation) {
    return null;
  }

  const activeConversation = conversation;

  async function updateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation) return;

    setSaving(true);
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      await apiFetch(`/contacts/${activeConversation.contact.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          phone: normalizedPhone,
          waId: normalizedPhone,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: 'OPEN' | 'PENDING' | 'CLOSED') {
    await apiFetch(`/conversations/${activeConversation.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }

  async function startFunnel() {
    setStartingFunnel(true);
    try {
      await apiFetch(`/conversations/${activeConversation.id}/funnel/start`, {
        method: 'POST',
      });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['messages', activeConversation.id] });
      toast.success('Funil enviado e atendimento encaminhado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel iniciar o funil.');
    } finally {
      setStartingFunnel(false);
    }
  }

  async function createNote() {
    if (!note.trim()) return;
    await apiFetch(`/contacts/${activeConversation.contact.id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: note.trim() }),
    });
    setNote('');
    await queryClient.invalidateQueries({ queryKey: ['contact-notes', activeConversation.contact.id] });
  }

  async function removeContact() {
    await apiFetch(`/contacts/${activeConversation.contact.id}`, { method: 'DELETE' });
    selectConversation(null);
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    await queryClient.invalidateQueries({ queryKey: ['contacts'] });
    toast.success('Contato removido.');
  }

  return (
    <aside
      className={`hidden h-full w-[330px] shrink-0 flex-col border-l border-border bg-card xl:flex ${
        infoOpen ? '' : 'xl:hidden'
      }`}
    >
      <header className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Tag className="h-4 w-4 text-primary" />
          Contato
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar painel" onClick={() => setInfoOpen(false)}>
          <X />
        </Button>
      </header>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        <section className="flex flex-col items-center px-6 py-6 text-center">
          <Avatar className="h-20 w-20">
            <AvatarImage src={conversation.contact.avatarUrl ?? undefined} alt={conversation.contact.name} />
            <AvatarFallback className="text-xl">{initials(conversation.contact.name)}</AvatarFallback>
          </Avatar>
          <h2 className="mt-3 text-lg font-semibold">{conversation.contact.name}</h2>
          <p className="text-sm text-muted-foreground">{formatPhone(conversation.contact.phone)}</p>
        </section>

        <Separator />

        <form onSubmit={updateContact} className="space-y-3 px-4 py-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Dados do contato</p>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Telefone" />
          <Button type="submit" size="sm" className="w-full" disabled={saving}>
            <Save />
            Salvar
          </Button>
        </form>

        <Separator />

        <section className="space-y-3 px-4 py-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Atendimento</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={startingFunnel}
            onClick={() => void startFunnel()}
          >
            <Workflow />
            {startingFunnel ? 'Enviando...' : 'Enviar funil'}
          </Button>
        </section>

        <Separator />

        <section className="space-y-3 px-4 py-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Status da conversa</p>
          <div className="grid gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void updateStatus('OPEN')}>
              <Clock3 />
              Em atendimento
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void updateStatus('PENDING')}>
              <Clock3 />
              Pendente
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void updateStatus('CLOSED')}>
              <CheckCircle2 />
              Finalizar
            </Button>
          </div>
        </section>

        <Separator />

        <section className="space-y-3 px-4 py-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-2">
            {conversation.contact.tags.length ? (
              conversation.contact.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md px-2 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Sem tags.</span>
            )}
          </div>
        </section>

        <Separator />

        <section className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <StickyNote className="h-4 w-4" />
            Notas internas
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Adicionar nota interna"
            rows={3}
          />
          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => void createNote()}>
            Adicionar nota
          </Button>
          <div className="space-y-2">
            {notesQuery.data?.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background p-3">
                <p className="text-sm leading-5">{item.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {item.user.name} · {new Date(item.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="px-4 py-4">
          <Button type="button" variant="destructive" size="sm" className="w-full" onClick={() => void removeContact()}>
            <Trash2 />
            Excluir contato
          </Button>
        </section>
      </div>
    </aside>
  );
}
