'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hydrated: false,
      async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          throw new Error('E-mail ou senha invalidos.');
        }

        const data = (await response.json()) as { accessToken: string; user: AuthUser };
        set({ accessToken: data.accessToken, user: data.user });
      },
      logout() {
        set({ accessToken: null, user: null });
      },
      setHydrated(hydrated) {
        set({ hydrated });
      },
    }),
    {
      name: 'wa-crm-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
