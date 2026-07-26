'use client';

import { useEffect, useMemo } from 'react';
import { ContactPanel } from '@/components/chat/contact-panel';
import { ChatPanel } from '@/components/chat/chat-panel';
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { useConversations } from '@/hooks/use-conversations';
import { useChatStore } from '@/stores/chat-store';

export function CrmShell() {
  useChatSocket();
  const conversationsQuery = useConversations();
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const conversations = conversationsQuery.data ?? [];

  useEffect(() => {
    if (!selectedConversationId && conversations.length) {
      selectConversation(conversations[0].id);
    }
  }, [conversations, selectConversation, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  return (
    <div className="h-dvh overflow-hidden bg-background md:p-3">
      <div className="mx-auto flex h-full max-w-[1680px] overflow-hidden border-border bg-card shadow-soft md:rounded-lg md:border">
        <ConversationSidebar conversations={conversations} loading={conversationsQuery.isLoading} />
        <ChatPanel conversation={selectedConversation} />
        <ContactPanel conversation={selectedConversation} />
      </div>
    </div>
  );
}
