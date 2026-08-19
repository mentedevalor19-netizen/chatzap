'use client';

import { Contact, FileText, Image as ImageIcon, MapPin, Music, Sticker, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ChatMessage } from '@/lib/types';
import { StatusIcon } from '@/components/chat/status-icon';
import { cn, formatMessageTime } from '@/lib/utils';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const outbound = message.direction === 'OUTBOUND';

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center px-4 py-2">
        <span className="max-w-[82%] rounded-md border border-border bg-card px-3 py-1 text-center text-xs text-muted-foreground shadow-sm">
          {message.body}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex px-4 py-1.5', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-md px-3 py-2 text-sm shadow-sm md:max-w-[66%]',
          outbound
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-card-foreground',
        )}
      >
        <MessageBody message={message} outbound={outbound} />
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[11px]',
            outbound ? 'text-primary-foreground/76' : 'text-muted-foreground',
          )}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {outbound ? <StatusIcon status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}

function MessageBody({ message, outbound }: { message: ChatMessage; outbound: boolean }) {
  const mediaUrl = getPlayableMediaUrl(message);

  if (message.type === 'TEXT' || message.type === 'TEMPLATE') {
    return <p className="whitespace-pre-wrap break-words leading-5">{message.body}</p>;
  }

  if (message.type === 'IMAGE') {
    return (
      <MediaShell
        icon={<ImageIcon />}
        title={message.caption || message.fileName || 'Imagem'}
        outbound={outbound}
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={message.caption ?? 'Imagem'}
            className="mt-2 max-h-72 rounded-md object-cover"
          />
        ) : null}
      </MediaShell>
    );
  }

  if (message.type === 'VIDEO') {
    return (
      <MediaShell
        icon={<Video />}
        title={message.caption || message.fileName || 'Video'}
        outbound={outbound}
      >
        {mediaUrl ? <video src={mediaUrl} controls className="mt-2 max-h-72 rounded-md" /> : null}
      </MediaShell>
    );
  }

  if (message.type === 'AUDIO') {
    return (
      <MediaShell icon={<Music />} title="Audio" outbound={outbound}>
        {mediaUrl ? <audio src={mediaUrl} controls className="mt-2 w-64 max-w-full" /> : null}
      </MediaShell>
    );
  }

  if (message.type === 'DOCUMENT') {
    return (
      <a
        href={mediaUrl ?? '#'}
        download
        className={cn(
          'flex items-center gap-3 rounded-md border p-3 transition-colors',
          outbound
            ? 'border-primary-foreground/25 hover:bg-white/10'
            : 'border-border hover:bg-muted',
        )}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{message.fileName ?? 'Documento'}</span>
          <span className="block truncate text-xs opacity-75">
            {message.mimeType ?? 'PDF ou arquivo'}
          </span>
        </span>
      </a>
    );
  }

  if (message.type === 'LOCATION') {
    const href =
      message.locationLatitude && message.locationLongitude
        ? `https://www.google.com/maps/search/?api=1&query=${message.locationLatitude},${message.locationLongitude}`
        : '#';
    return (
      <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3">
        <MapPin className="h-5 w-5 shrink-0" />
        <span>
          <span className="block font-medium">{message.locationName ?? 'Localizacao'}</span>
          <span className="block text-xs opacity-75">{message.locationAddress}</span>
        </span>
      </a>
    );
  }

  if (message.type === 'CONTACT') {
    return (
      <MediaShell icon={<Contact />} title="Contato compartilhado" outbound={outbound}>
        <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-black/10 p-2 text-xs">
          {JSON.stringify(message.contactPayload, null, 2)}
        </pre>
      </MediaShell>
    );
  }

  if (message.type === 'STICKER') {
    return <MediaShell icon={<Sticker />} title="Sticker recebido" outbound={outbound} />;
  }

  return <p className="text-sm opacity-80">Tipo de mensagem nao suportado.</p>;
}

function getPlayableMediaUrl(message: ChatMessage) {
  if (message.direction === 'INBOUND' && message.mediaId) {
    return `/api/v1/whatsapp/media/${encodeURIComponent(message.mediaId)}`;
  }

  return message.mediaUrl;
}

function MediaShell({
  icon,
  title,
  outbound,
  children,
}: {
  icon: ReactNode;
  title: string;
  outbound: boolean;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            outbound ? 'bg-white/12' : 'bg-muted',
          )}
        >
          {icon}
        </span>
        <span className="font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}
