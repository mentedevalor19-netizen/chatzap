'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UserSummary } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { initials } from '@/lib/utils';

export function TeamAdminPanel() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserSummary[]>('/users'),
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserSummary['role']>('AGENT');
  const [saving, setSaving] = useState(false);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('AGENT');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Atendente criado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar o atendente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <UsersRound className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase text-muted-foreground">Atendentes</p>
      </div>

      <form onSubmit={createUser} className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[1fr_1.1fr_170px_150px_120px]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Nome</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do atendente" />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">E-mail</span>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="atendente@email.com" />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Senha inicial</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="min. 6 caracteres"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Perfil</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserSummary['role'])}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="AGENT">Atendente</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={saving || !name.trim() || !email.trim() || password.length < 6}>
            <UserPlus />
            Criar
          </Button>
        </div>
      </form>

      {usersQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : usersQuery.data?.length ? (
        <div className="space-y-2">
          {usersQuery.data.map((teamUser) => (
            <TeamUserItem key={teamUser.id} teamUser={teamUser} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
          Nenhum atendente cadastrado.
        </div>
      )}
    </section>
  );
}

function TeamUserItem({ teamUser }: { teamUser: UserSummary }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(teamUser.name);
  const [email, setEmail] = useState(teamUser.email);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(teamUser.role);
  const [isActive, setIsActive] = useState(teamUser.isActive);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setName(teamUser.name);
    setEmail(teamUser.email);
    setRole(teamUser.role);
    setIsActive(teamUser.isActive);
  }, [teamUser.email, teamUser.isActive, teamUser.name, teamUser.role]);

  async function updateUser() {
    setSaving(true);
    try {
      await apiFetch(`/users/${teamUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          email,
          role,
          isActive,
          ...(password.trim() ? { password } : {}),
        }),
      });
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Atendente atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser() {
    setRemoving(true);
    try {
      await apiFetch(`/users/${teamUser.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Atendente desativado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel desativar.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_150px_150px_96px]">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{initials(teamUser.name)}</AvatarFallback>
        </Avatar>
        <label className="min-w-0 flex-1 space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Nome</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      </div>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">E-mail</span>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Nova senha</span>
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="opcional" />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Perfil</span>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserSummary['role'])}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="AGENT">Atendente</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
      <div className="flex items-end gap-1">
        <label className="mr-auto flex h-10 items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Ativo
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Salvar atendente"
          disabled={saving || !name.trim() || !email.trim() || (password.length > 0 && password.length < 6)}
          onClick={() => void updateUser()}
        >
          <Save />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Desativar atendente"
          disabled={removing || !teamUser.isActive}
          onClick={() => void deactivateUser()}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}
