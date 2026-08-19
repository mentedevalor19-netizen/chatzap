'use client';

import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

export function ContactCreateForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const waId = phone.replace(/\D/g, '');

    if (!name.trim() || !waId) {
      toast.error('Informe nome e telefone.');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: waId,
          waId,
          avatarUrl: avatarUrl.trim() || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato criado.');
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar o contato.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-b border-border p-3">
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
      <Input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Telefone com DDI"
      />
      <Input
        value={avatarUrl}
        onChange={(event) => setAvatarUrl(event.target.value)}
        placeholder="URL da foto opcional"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
