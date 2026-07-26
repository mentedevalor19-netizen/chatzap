'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedMessages } from '@/lib/types';
import { apiFetch } from '@/lib/api';

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(conversationId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '35' });
      if (pageParam) params.set('cursor', pageParam);
      return apiFetch<PaginatedMessages>(`/conversations/${conversationId}/messages?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
