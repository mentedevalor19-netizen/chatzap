'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef } from 'react';
import type { ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from '@/components/chat/message-bubble';
import { formatDay } from '@/lib/utils';

type Row = { kind: 'date'; id: string; label: string } | { kind: 'message'; id: string; message: ChatMessage };

interface MessageTimelineProps {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  fetchingMore: boolean;
  fetchMore: () => void;
}

export function MessageTimeline({ messages, loading, hasMore, fetchingMore, fetchMore }: MessageTimelineProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const requestedOlderRef = useRef(false);

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    let currentDay = '';

    for (const message of messages) {
      const label = formatDay(message.createdAt);
      if (label !== currentDay) {
        currentDay = label;
        result.push({ kind: 'date', id: `date-${label}-${message.id}`, label });
      }
      result.push({ kind: 'message', id: message.id, message });
    }

    return result;
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'date' ? 36 : 82),
    overscan: 10,
  });

  useEffect(() => {
    if (!rows.length) return;
    virtualizer.scrollToIndex(rows.length - 1, { align: 'end' });
  }, [rows.length, virtualizer]);

  if (loading) {
    return (
      <div className="flex-1 space-y-3 overflow-hidden p-6">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="ml-auto h-20 w-72" />
        <Skeleton className="h-16 w-64" />
        <Skeleton className="ml-auto h-24 w-80" />
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="thin-scrollbar relative min-h-0 flex-1 overflow-y-auto"
      onScroll={(event) => {
        if (!hasMore || fetchingMore) return;
        if (event.currentTarget.scrollTop < 96 && !requestedOlderRef.current) {
          requestedOlderRef.current = true;
          fetchMore();
          window.setTimeout(() => {
            requestedOlderRef.current = false;
          }, 500);
        }
      }}
    >
      <div className="sticky top-0 z-10 flex justify-center py-2">
        {hasMore ? (
          <Button type="button" variant="secondary" size="sm" onClick={fetchMore} disabled={fetchingMore}>
            {fetchingMore ? 'Carregando...' : 'Mensagens anteriores'}
          </Button>
        ) : null}
      </div>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {row.kind === 'date' ? (
                <div className="flex justify-center px-4 py-2">
                  <span className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                    {row.label}
                  </span>
                </div>
              ) : (
                <MessageBubble message={row.message} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
