'use client';

import { Bot, LogOut, MessageSquareText, Plus, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ContactSummary, ConversationSummary } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { ContactCreateForm } from '@/components/chat/contact-create-form';
import { ConversationItem } from '@/components/chat/conversation-item';
import { ConversationSkeletons } from '@/components/chat/conversation-skeletons';
import { useContacts } from '@/hooks/use-contacts';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { cn, formatPhone, initials } from '@/lib/utils';

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  loading: boolean;
  tab: 'conversations' | 'contacts' | 'admin';
  onTabChange: (tab: 'conversations' | 'contacts' | 'admin') => void;
}

const statusFilters = [
  { value: 'ALL', label: 'Todas' },
  { value: 'OPEN', label: 'Em atendimento' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'CLOSED', label: 'Finalizadas' },
] as const;

export function ConversationSidebar({ conversations, loading, tab, onTabChange }: ConversationSidebarProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const search = useChatStore((state) => state.search);
  const setSearch = useChatStore((state) => state.setSearch);
  const status = useChatStore((state) => state.status);
  const setStatus = useChatStore((state) => state.setStatus);
  const [creatingContact, setCreatingContact] = useState(false);
  const contactsQuery = useContacts(tab === 'contacts' ? search : '');

  const contactConversationMap = useMemo(() => {
    return new Map(conversations.map((conversation) => [conversation.contact.id, conversation.id]));
  }, [conversations]);

  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-r border-border bg-card md:w-[360px] md:min-w-[340px] xl:w-[390px]">
      <header className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials(user?.name ?? 'CRM')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">Atendimento oficial Meta</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Sair" onClick={logout}>
                <LogOut />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sair</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="space-y-3 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Pesquisar nome, telefone ou mensagem"
          />
        </div>

        <div className={cn('grid gap-2', user?.role === 'ADMIN' ? 'grid-cols-3' : 'grid-cols-2')}>
          <Button
            type="button"
            variant={tab === 'conversations' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTabChange('conversations')}
          >
            <MessageSquareText />
            Conversas
          </Button>
          <Button
            type="button"
            variant={tab === 'contacts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTabChange('contacts')}
          >
            <UsersRound />
            Contatos
          </Button>
          {user?.role === 'ADMIN' ? (
            <Button
              type="button"
              variant={tab === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTabChange('admin')}
            >
              <Bot />
              Admin
            </Button>
          ) : null}
        </div>
      </div>

      {tab === 'conversations' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 thin-scrollbar">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  status === filter.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
            {loading ? (
              <ConversationSkeletons />
            ) : conversations.length ? (
              <div className="p-2">
                {conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    selected={conversation.id === selectedConversationId}
                    onSelect={() => selectConversation(conversation.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyList title="Nenhuma conversa" description="Novas conversas aparecerão aqui." />
            )}
          </div>
        </div>
      ) : null}
      {tab === 'contacts' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Lista de contatos</span>
            <Button size="icon" variant="ghost" aria-label="Novo contato" onClick={() => setCreatingContact(true)}>
              <Plus />
            </Button>
          </div>
          {creatingContact ? <ContactCreateForm onDone={() => setCreatingContact(false)} /> : null}
          <div className="min-h-0 flex-1 overflow-y-auto p-2 thin-scrollbar">
            {contactsQuery.isLoading ? (
              <ConversationSkeletons />
            ) : contactsQuery.data?.length ? (
              contactsQuery.data.map((contact) => (
                <ContactListItem
                  key={contact.id}
                  contact={contact}
                  onClick={() => {
                    const conversationId = contactConversationMap.get(contact.id);
                    if (conversationId) {
                      selectConversation(conversationId);
                      onTabChange('conversations');
                    }
                  }}
                />
              ))
            ) : (
              <EmptyList title="Nenhum contato" description="Crie contatos manualmente ou receba novas mensagens." />
            )}
          </div>
        </div>
      ) : null}
      {tab === 'admin' ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-8 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium">Painel administrativo</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Gerencie funil, equipe, vendas e financeiro.</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function ContactListItem({ contact, onClick }: { contact: ContactSummary; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
    >
      <Avatar className="h-11 w-11">
        <AvatarImage src={contact.avatarUrl ?? undefined} alt={contact.name} />
        <AvatarFallback>{initials(contact.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{contact.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{formatPhone(contact.phone)}</span>
      </span>
    </button>
  );
}

function EmptyList({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
