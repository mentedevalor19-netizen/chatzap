'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { ChatMessage, ConversationSummary } from '@/lib/types';
import { playNewMessageSound, rememberPlayedMessageId, warmNewMessageSound } from '@/lib/notification-sound';
import { disconnectChatSocket, getChatSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';

export function useChatSocket() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const playedMessageIdsRef = useRef(new Set<string>());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      disconnectChatSocket();
      return;
    }

    const socket = getChatSocket(accessToken);
    warmNewMessageSound();

    const refreshConversations = () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const handleConversation = (conversation: ConversationSummary) => {
      queryClient.setQueryData<ConversationSummary[]>(['conversations'], (current) => {
        if (!current) return current;
        const filtered = current.filter((item) => item.id !== conversation.id);
        return [conversation, ...filtered].sort(
          (a, b) =>
            new Date(b.lastMessageAt ?? b.lastMessage?.createdAt ?? 0).getTime() -
            new Date(a.lastMessageAt ?? a.lastMessage?.createdAt ?? 0).getTime(),
        );
      });
      refreshConversations();
    };

    const handleMessage = (message: ChatMessage) => {
      if (message.conversationId === selectedConversationId) {
        void queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      }
      refreshConversations();
    };

    const handleCreatedMessage = (message: ChatMessage) => {
      handleMessage(message);

      if (message.direction !== 'INBOUND') {
        return;
      }

      if (rememberPlayedMessageId(playedMessageIdsRef.current, message.id)) {
        playNewMessageSound();
      }
    };

    socket.on('conversation.upsert', handleConversation);
    socket.on('conversation.read', refreshConversations);
    socket.on('message.created', handleCreatedMessage);
    socket.on('message.status', handleMessage);
    socket.on('contact.upsert', () => void queryClient.invalidateQueries({ queryKey: ['contacts'] }));

    return () => {
      socket.off('conversation.upsert', handleConversation);
      socket.off('conversation.read', refreshConversations);
      socket.off('message.created', handleCreatedMessage);
      socket.off('message.status', handleMessage);
      socket.off('contact.upsert');
    };
  }, [accessToken, queryClient, selectedConversationId]);
}
