'use client';

import { useQuery } from '@tanstack/react-query';
import type { ConversationSummary } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { useChatStore } from '@/stores/chat-store';

export function useConversations() {
  const status = useChatStore((state) => state.status);
  const search = useChatStore((state) => state.search);

  return useQuery({
    queryKey: ['conversations', status, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      return apiFetch<ConversationSummary[]>(`/conversations?${params.toString()}`);
    },
  });
}
