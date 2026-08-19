import type {
  AuthUser,
  ChatMessage,
  ContactSummary,
  ConversationSummary,
  CrmMetricsSummary,
  ExpenseCategory,
  ExpenseSummary,
  FunnelStepSummary,
  FunnelStepType,
  FunnelSummary,
  MetaConversionEventSummary,
  MetaConversionStatus,
  MetaConversionsSettingsSummary,
  ProductSummary,
  QuickReplySummary,
  SaleStatus,
  SaleSummary,
  UserSummary,
} from '@wa-crm/shared';

export type {
  AuthUser,
  ChatMessage,
  ContactSummary,
  ConversationSummary,
  CrmMetricsSummary,
  ExpenseCategory,
  ExpenseSummary,
  FunnelStepSummary,
  FunnelStepType,
  FunnelSummary,
  MetaConversionEventSummary,
  MetaConversionStatus,
  MetaConversionsSettingsSummary,
  ProductSummary,
  QuickReplySummary,
  SaleStatus,
  SaleSummary,
  UserSummary,
};

export interface PaginatedMessages {
  items: ChatMessage[];
  nextCursor: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}
