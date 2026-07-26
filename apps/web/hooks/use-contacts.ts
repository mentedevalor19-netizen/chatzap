'use client';

import { useQuery } from '@tanstack/react-query';
import type { ContactSummary } from '@/lib/types';
import { apiFetch } from '@/lib/api';

export function useContacts(search = '') {
  return useQuery({
    queryKey: ['contacts', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      return apiFetch<ContactSummary[]>(`/contacts?${params.toString()}`);
    },
  });
}
