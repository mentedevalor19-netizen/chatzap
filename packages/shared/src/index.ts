export const conversationStatuses = ['OPEN', 'PENDING', 'CLOSED'] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

export const messageDirections = ['INBOUND', 'OUTBOUND'] as const;
export type MessageDirection = (typeof messageDirections)[number];

export const messageTypes = [
  'TEXT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'DOCUMENT',
  'LOCATION',
  'CONTACT',
  'STICKER',
  'TEMPLATE',
  'SYSTEM',
] as const;
export type MessageType = (typeof messageTypes)[number];

export const messageStatuses = [
  'QUEUED',
  'RECEIVED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
] as const;
export type MessageStatus = (typeof messageStatuses)[number];

export const funnelStepTypes = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'] as const;
export type FunnelStepType = (typeof funnelStepTypes)[number];

export type RealtimeEvent =
  | 'conversation.upsert'
  | 'conversation.read'
  | 'message.created'
  | 'message.status'
  | 'contact.upsert'
  | 'typing.start'
  | 'typing.stop';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  organizationId: string;
}

export interface ContactSummary {
  id: string;
  name: string;
  phone: string;
  waId: string;
  avatarUrl?: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
}

export interface ConversationSummary {
  id: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: string | null;
  contact: ContactSummary;
  lastMessage?: {
    id: string;
    body: string | null;
    type: MessageType;
    direction: MessageDirection;
    status: MessageStatus;
    createdAt: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  type: MessageType;
  status: MessageStatus;
  body?: string | null;
  mediaId?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  caption?: string | null;
  locationLatitude?: string | null;
  locationLongitude?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  contactPayload?: unknown;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface FunnelStepSummary {
  id: string;
  position: number;
  type: FunnelStepType;
  body?: string | null;
  mediaId?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  caption?: string | null;
  waitForReply: boolean;
}

export interface FunnelSummary {
  id: string;
  name: string;
  isActive: boolean;
  handoffMessage?: string | null;
  steps: FunnelStepSummary[];
}
