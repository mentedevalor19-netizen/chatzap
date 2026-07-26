'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, MoreVertical, PanelRightOpen, Phone } from 'lucide-react';
import type { ConversationSummary } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageComposer } from '@/components/chat/message-composer';
import { MessageTimeline } from '@/components/chat/message-timeline';
import { apiFetch } from '@/lib/api';
import { getChatSocket } from '@/lib/socket';
import { formatPhone, initials } from '@/lib/utils';
import { useMessages } from '@/hooks/use-messages';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';

export function ChatPanel({ conversation }: { conversation?: ConversationSummary }) {
  const token = useAuthStore((state) => state.accessToken);
  const setInfoOpen = useChatStore((state) => state.setInfoOpen);
  const messagesQuery = useMessages(conversation?.id ?? null);
  const [typing, setTyping] = useState(false);

  const messages = useMemo(() => {
    return messagesQuery.data?.pages.slice().reverse().flatMap((page) => page.items) ?? [];
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!conversation?.id || !token) return;

    const socket = getChatSocket(token);
    socket.emit('conversation.join', { conversationId: conversation.id });

    const handleTypingStart = (payload: { conversationId?: string }) => {
      if (payload.conversationId === conversation.id) setTyping(true);
    };

    const handleTypingStop = (payload: { conversationId?: string }) => {
      if (payload.conversationId === conversation.id) setTyping(false);
    };

    socket.on('typing.start', handleTypingStart);
    socket.on('typing.stop', handleTypingStop);

    return () => {
      socket.emit('conversation.leave', { conversationId: conversation.id });
      socket.off('typing.start', handleTypingStart);
      socket.off('typing.stop', handleTypingStop);
    };
  }, [conversation?.id, token]);

  useEffect(() => {
    if (!conversation?.id || conversation.unreadCount === 0) return;
    void apiFetch(`/conversations/${conversation.id}/read`, { method: 'POST' }).catch(() => undefined);
  }, [conversation?.id, conversation?.unreadCount]);

  if (!conversation) {
    return (
      <main className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-background text-center md:flex">
        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MessageCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">Selecione uma conversa</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Escolha um atendimento na lista para continuar.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contact.avatarUrl ?? undefined} alt={conversation.contact.name} />
            <AvatarFallback>{initials(conversation.contact.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold">{conversation.contact.name}</h1>
              {conversation.status === 'CLOSED' ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  Finalizada
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {typing ? 'digitando...' : formatPhone(conversation.contact.phone)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Telefone">
                <Phone />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Telefone</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Informacoes do contato"
                onClick={() => setInfoOpen(true)}
              >
                <PanelRightOpen />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Informacoes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Mais opcoes">
                <MoreVertical />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mais opcoes</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <section className="chat-surface flex min-h-0 flex-1 flex-col">
        <MessageTimeline
          messages={messages}
          loading={messagesQuery.isLoading}
          hasMore={Boolean(messagesQuery.hasNextPage)}
          fetchingMore={messagesQuery.isFetchingNextPage}
          fetchMore={() => void messagesQuery.fetchNextPage()}
        />
        <MessageComposer conversationId={conversation.id} />
      </section>
    </main>
  );
}
