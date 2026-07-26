'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, router, token]);

  if (!hydrated || !token) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
    );
  }

  return children;
}
