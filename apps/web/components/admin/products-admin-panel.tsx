'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Package, Plus, Save, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ProductSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export function ProductsAdminPanel() {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<ProductSummary[]>('/products'),
  });
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          sku: sku.trim() || undefined,
          price: Number(price),
          description: description.trim() || undefined,
          isActive: true,
        }),
      });
      setName('');
      setSku('');
      setPrice('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar o produto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase text-muted-foreground">Produtos</p>
      </div>

      <form
        onSubmit={createProduct}
        className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[minmax(0,1fr)_160px_150px_120px]"
      >
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Produto</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do produto"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">SKU</span>
          <Input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="Opcional"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Preco</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full"
            disabled={saving || !name.trim() || !price.trim() || Number(price) < 0}
          >
            <Plus />
            Criar
          </Button>
        </div>
        <label className="space-y-1.5 xl:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Descricao</span>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Detalhes internos para identificar o produto"
          />
        </label>
      </form>

      {productsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : productsQuery.data?.length ? (
        <div className="space-y-2">
          {productsQuery.data.map((product) => (
            <ProductItem key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground">
          Nenhum produto cadastrado.
        </div>
      )}
    </section>
  );
}

function ProductItem({ product }: { product: ProductSummary }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku ?? '');
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? '');
  const [isActive, setIsActive] = useState(product.isActive);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setName(product.name);
    setSku(product.sku ?? '');
    setPrice(String(product.price));
    setDescription(product.description ?? '');
    setIsActive(product.isActive);
  }, [product]);

  async function updateProduct() {
    setSaving(true);
    try {
      await apiFetch(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          sku: sku.trim() || null,
          price: Number(price),
          description: description.trim() || null,
          isActive,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProduct() {
    setRemoving(true);
    try {
      await apiFetch(`/products/${product.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto desativado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel desativar.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-4 xl:grid-cols-[minmax(0,1fr)_160px_150px_120px_96px]">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Produto</span>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <span className="block truncate text-xs text-muted-foreground">
          {product.isActive ? 'Ativo' : 'Inativo'} - {formatCurrency(product.price)}
        </span>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">SKU</span>
        <Input value={sku} onChange={(event) => setSku(event.target.value)} />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Preco</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <label className="flex items-end gap-3 pb-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Ativo
      </label>
      <div className="flex items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Salvar produto"
          disabled={saving || !name.trim() || !price.trim() || Number(price) < 0}
          onClick={() => void updateProduct()}
        >
          <Save />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Desativar produto"
          disabled={removing}
          onClick={() => void deactivateProduct()}
        >
          <Trash2 />
        </Button>
      </div>
      <label className="space-y-1.5 xl:col-span-4">
        <span className="text-xs font-medium text-muted-foreground">Descricao</span>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />
      </label>
    </article>
  );
}
