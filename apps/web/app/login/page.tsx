'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const token = useAuthStore((state) => state.accessToken);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [email, setEmail] = useState('admin@crm.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && token) {
      router.replace('/');
    }
  }, [hydrated, router, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login realizado com sucesso.');
      router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1fr_440px]">
      <section className="hidden min-h-dvh flex-col justify-between bg-[linear-gradient(135deg,#0f766e,#2563eb)] p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-sm font-medium">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
            <MessageCircle className="h-5 w-5" />
          </div>
          WhatsApp Cloud CRM
        </div>
        <div className="max-w-xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-md bg-white/14 px-3 py-1.5 text-sm">
            <ShieldCheck className="h-4 w-4" />
            API Oficial da Meta
          </div>
          <h1 className="text-5xl font-semibold leading-tight">
            Atendimento rapido, organizado e com cara de produto serio.
          </h1>
          <p className="text-lg leading-8 text-white/78">
            Uma central clara para equipes que precisam responder com precisão, manter contexto
            e acompanhar cada conversa sem ruído.
          </p>
        </div>
        <p className="text-sm text-white/65">Sem APIs nao oficiais. Sem automacoes frageis.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center p-6">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Entrar no CRM</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Acesse sua central de atendimento.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Input
              aria-label="E-mail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@empresa.com"
              autoComplete="email"
              required
            />
            <Input
              aria-label="Senha"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </section>
    </main>
  );
}
