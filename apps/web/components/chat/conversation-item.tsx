'use client';

import type { ConversationSummary } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatMessageTime, formatPhone, initials } from '@/lib/utils';

interface ConversationItemProps {
  conversation: ConversationSummary;
  selected: boolean;
  onSelect: () => void;
}

export function ConversationItem({ conversation, selected, onSelect }: ConversationItemProps) {
  const preview =
    conversation.lastMessage?.body ??
    conversation.lastMessage?.type?.toLowerCase().replace('_', ' ') ??
    'Nova conversa';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'grid w-full grid-cols-[44px_minmax(0,1fr)_auto] gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted',
        selected && 'bg-primary/10 hover:bg-primary/10',
      )}
    >
      <Avatar className="h-11 w-11">
        <AvatarImage src={conversation.contact.avatarUrl ?? undefined} alt={conversation.contact.name} />
        <AvatarFallback>{initials(conversation.contact.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{conversation.contact.name}</span>
          {conversation.contact.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: tag.color }}
              aria-label={tag.name}
            />
          ))}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {formatPhone(conversation.contact.phone)} · {preview}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="text-[11px] text-muted-foreground">
          {formatMessageTime(conversation.lastMessageAt ?? conversation.lastMessage?.createdAt)}
        </span>
        {conversation.unreadCount > 0 ? (
          <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">
            {conversation.unreadCount}
          </Badge>
        ) : null}
      </span>
    </button>
  );
}
