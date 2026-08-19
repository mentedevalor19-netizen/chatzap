'use client';

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileUp, Image as ImageIcon, Paperclip, SendHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api';
import { emitTyping } from '@/lib/socket';
import type { QuickReplySummary } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UploadResponse {
  fileName: string;
  mimeType: string;
  mediaUrl: string;
}

interface AttachedQuickReplyMedia {
  mediaUrl: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const quickRepliesQuery = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => apiFetch<QuickReplySummary[]>('/quick-replies'),
    staleTime: 60_000,
  });
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [quickReplyMedia, setQuickReplyMedia] = useState<AttachedQuickReplyMedia | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [quickReplyIndex, setQuickReplyIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickReplies = quickRepliesQuery.data ?? [];
  const quickReplyQuery = getQuickReplyQuery(text);
  const quickReplySuggestions = useMemo(() => {
    if (quickReplyQuery === null) {
      return [];
    }

    return quickReplies
      .filter((quickReply) => {
        if (!quickReplyQuery) {
          return true;
        }

        return (
          quickReply.shortcut.toLowerCase().startsWith(quickReplyQuery) ||
          quickReply.body.toLowerCase().includes(quickReplyQuery)
        );
      })
      .slice(0, 6);
  }, [quickReplies, quickReplyQuery]);
  const showQuickReplies = quickReplySuggestions.length > 0;

  useEffect(() => {
    setQuickReplyIndex(0);
  }, [quickReplyQuery, quickReplySuggestions.length]);

  async function sendMessage() {
    if (!text.trim() && !file && !quickReplyMedia) return;

    setSending(true);
    try {
      if (file) {
        const form = new FormData();
        form.append('file', file);
        const upload = await apiFetch<UploadResponse>('/uploads', {
          method: 'POST',
          body: form,
        });
        await apiFetch(`/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            type: typeFromMime(file.type),
            mediaUrl: upload.mediaUrl,
            mimeType: upload.mimeType,
            fileName: upload.fileName,
            caption: text.trim() || undefined,
          }),
        });
      } else if (quickReplyMedia) {
        await apiFetch(`/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            type: 'IMAGE',
            mediaUrl: quickReplyMedia.mediaUrl,
            mimeType: quickReplyMedia.mimeType ?? undefined,
            fileName: quickReplyMedia.fileName ?? undefined,
            caption: text.trim() || undefined,
          }),
        });
      } else {
        await apiFetch(`/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            type: 'TEXT',
            body: text.trim(),
          }),
        });
      }

      setText('');
      setFile(null);
      setQuickReplyMedia(null);
      emitTyping('typing.stop', conversationId);
      await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel enviar.');
    } finally {
      setSending(false);
    }
  }

  function handleTextChange(value: string) {
    const completedShortcut = getCompletedQuickReplyCommand(value);
    const directReply = completedShortcut
      ? findQuickReply(quickReplies, completedShortcut)
      : undefined;

    if (directReply) {
      applyQuickReply(directReply);
      return;
    }

    setText(value);
    startTyping();
  }

  function startTyping() {
    emitTyping('typing.start', conversationId);
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      emitTyping('typing.stop', conversationId);
    }, 1200);
  }

  function applyQuickReply(quickReply: QuickReplySummary) {
    setText(quickReply.body);
    setQuickReplyMedia(
      quickReply.mediaUrl
        ? {
            mediaUrl: quickReply.mediaUrl,
            mimeType: quickReply.mimeType,
            fileName: quickReply.fileName,
          }
        : null,
    );
    startTyping();
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showQuickReplies) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setQuickReplyIndex((current) => (current + 1) % quickReplySuggestions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setQuickReplyIndex(
          (current) => (current - 1 + quickReplySuggestions.length) % quickReplySuggestions.length,
        );
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        applyQuickReply(quickReplySuggestions[quickReplyIndex] ?? quickReplySuggestions[0]);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setQuickReplyMedia(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setQuickReplyMedia(null);
    }
  }

  return (
    <div
      className={cn(
        'border-t border-border bg-card p-3 transition-colors',
        dragging && 'bg-primary/10',
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {file ? (
        <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <FileUp className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {Math.round(file.size / 1024)} KB
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover arquivo"
            onClick={() => setFile(null)}
          >
            <X />
          </Button>
        </div>
      ) : null}

      {quickReplyMedia ? (
        <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">
              {quickReplyMedia.fileName || 'Imagem da resposta rapida'}
            </span>
            <a
              href={quickReplyMedia.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs text-primary underline-offset-4 hover:underline"
            >
              preview
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover imagem"
            onClick={() => setQuickReplyMedia(null)}
          >
            <X />
          </Button>
        </div>
      ) : null}

      {showQuickReplies ? (
        <div className="mb-2 overflow-hidden rounded-md border border-border bg-card shadow-soft">
          {quickReplySuggestions.map((quickReply, index) => (
            <button
              key={quickReply.id}
              type="button"
              className={cn(
                'grid w-full grid-cols-[max-content_minmax(0,1fr)] items-center gap-3 px-3 py-2 text-left transition-colors',
                index === quickReplyIndex ? 'bg-primary/10' : 'hover:bg-muted',
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                applyQuickReply(quickReply);
              }}
            >
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                /{quickReply.shortcut}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                {quickReply.mediaUrl ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
                <span className="min-w-0 truncate text-sm text-foreground">{quickReply.body}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-end gap-2">
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Anexar arquivo"
              onClick={() => inputRef.current?.click()}
            >
              <Paperclip />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Anexar arquivo</TooltipContent>
        </Tooltip>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={file ? 'Legenda opcional' : 'Digite uma mensagem'}
          className="max-h-32 min-h-10"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              aria-label="Enviar mensagem"
              disabled={sending || (!text.trim() && !file && !quickReplyMedia)}
              onClick={() => void sendMessage()}
            >
              <SendHorizontal />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Enviar</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function getQuickReplyQuery(value: string) {
  const match = value.match(/^\/([a-z0-9_-]*)$/i);
  return match ? match[1].toLowerCase() : null;
}

function getCompletedQuickReplyCommand(value: string) {
  const match = value.match(/^\/([a-z0-9_-]+)\s$/i);
  return match ? match[1].toLowerCase() : null;
}

function findQuickReply(quickReplies: QuickReplySummary[], shortcut: string) {
  return quickReplies.find((quickReply) => quickReply.shortcut.toLowerCase() === shortcut);
}

function typeFromMime(mime: string) {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}
