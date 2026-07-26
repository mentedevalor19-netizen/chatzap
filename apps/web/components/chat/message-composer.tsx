'use client';

import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileUp, Paperclip, SendHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api';
import { emitTyping } from '@/lib/socket';
import { cn } from '@/lib/utils';

interface UploadResponse {
  fileName: string;
  mimeType: string;
  mediaUrl: string;
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function sendMessage() {
    if (!text.trim() && !file) return;

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
    setText(value);
    emitTyping('typing.start', conversationId);

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      emitTyping('typing.stop', conversationId);
    }, 1200);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
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
            <span className="shrink-0 text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</span>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remover arquivo" onClick={() => setFile(null)}>
            <X />
          </Button>
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
              disabled={sending || (!text.trim() && !file)}
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

function typeFromMime(mime: string) {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}
