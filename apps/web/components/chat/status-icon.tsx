'use client';

import { Check, CheckCheck, Clock3, XCircle } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatusIcon({ status }: { status: ChatMessage['status'] }) {
  if (status === 'QUEUED') return <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />;
  if (status === 'FAILED') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === 'READ') return <CheckCheck className="h-3.5 w-3.5 text-sky-500" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;

  return <Check className={cn('h-3.5 w-3.5 text-muted-foreground')} />;
}
