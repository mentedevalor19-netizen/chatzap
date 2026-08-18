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

export const saleStatuses = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'] as const;
export type SaleStatus = (typeof saleStatuses)[number];

export const expenseCategories = ['ADS', 'SUPPLIER', 'TOOLS', 'OTHER'] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];

export const metaConversionStatuses = ['PENDING', 'SENT', 'FAILED', 'SKIPPED'] as const;
export type MetaConversionStatus = (typeof metaConversionStatuses)[number];

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
  delaySeconds: number;
  audioAsVoice: boolean;
  waitForReply: boolean;
}

export interface FunnelSummary {
  id: string;
  name: string;
  isActive: boolean;
  handoffMessage?: string | null;
  steps: FunnelStepSummary[];
}

export interface QuickReplySummary {
  id: string;
  shortcut: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleSummary {
  id: string;
  title: string;
  amount: number;
  status: SaleStatus;
  note?: string | null;
  soldAt: string;
  createdAt: string;
  updatedAt: string;
  seller?: UserSummary | null;
  contact?: Pick<ContactSummary, 'id' | 'name' | 'phone' | 'waId' | 'avatarUrl'> | null;
  conversation?: {
    id: string;
    status: ConversationStatus;
  } | null;
  metaConversionEvents?: Array<{
    id: string;
    eventName: string;
    eventId: string;
    status: MetaConversionStatus;
    errorMessage?: string | null;
    sentAt?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ExpenseSummary {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserSummary | null;
}

export interface CrmMetricsSummary {
  revenue: number;
  expenses: number;
  profit: number;
  marginPercent: number;
  salesCount: number;
  pendingSalesCount: number;
  averageTicket: number;
  expenseCount: number;
  contactsCount: number;
  conversations: {
    open: number;
    pending: number;
    closed: number;
    total: number;
  };
  salesBySeller: Array<{
    sellerId: string | null;
    seller: UserSummary | null;
    revenue: number;
    salesCount: number;
  }>;
  expensesByCategory: Array<{
    category: ExpenseCategory;
    amount: number;
    count: number;
  }>;
}

export interface MetaConversionsSettingsSummary {
  id: string | null;
  isEnabled: boolean;
  datasetId: string | null;
  whatsappBusinessAccountId: string | null;
  graphApiVersion: string;
  testEventCode: string | null;
  currency: string;
  sendLeadEvents: boolean;
  sendPurchaseEvents: boolean;
  hasAccessToken: boolean;
  usingEnvAccessToken: boolean;
}

export interface MetaConversionEventSummary {
  id: string;
  saleId?: string | null;
  attributionId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  eventName: string;
  eventId: string;
  status: MetaConversionStatus;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sale?: {
    id: string;
    title: string;
    amount: number;
    status: SaleStatus;
    soldAt: string;
  } | null;
  contact?: Pick<ContactSummary, 'id' | 'name' | 'phone' | 'waId' | 'avatarUrl'> | null;
  attribution?: {
    id: string;
    ctwaClid: string;
    sourceId?: string | null;
    sourceUrl?: string | null;
    headline?: string | null;
    receivedAt: string;
  } | null;
}
