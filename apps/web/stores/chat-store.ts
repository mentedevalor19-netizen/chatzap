'use client';

import { create } from 'zustand';
import type { ConversationStatus } from '@wa-crm/shared';

interface ChatState {
  selectedConversationId: string | null;
  search: string;
  status: ConversationStatus | 'ALL';
  infoOpen: boolean;
  selectConversation: (conversationId: string | null) => void;
  setSearch: (search: string) => void;
  setStatus: (status: ConversationStatus | 'ALL') => void;
  setInfoOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedConversationId: null,
  search: '',
  status: 'ALL',
  infoOpen: true,
  selectConversation: (selectedConversationId) => set({ selectedConversationId }),
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setInfoOpen: (infoOpen) => set({ infoOpen }),
}));
