"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, TextArea, Select } from "@whop/react/components";
import { formatUsd } from "@/lib/fees";
import BrandIcon from "@/components/BrandIcon";

type ProductType = "DIGITAL" | "PHYSICAL";

export interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  type: ProductType;
  salesCount: number;
}

export default function ProductManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [type, setType] = useState<ProductType>("DIGITAL");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceDollars = price.trim() === "" ? 0 : Number(price);
    if (!Number.isFinite(priceDollars) || priceDollars < 0) {
      setError("Enter a valid price ($0 or more).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          priceCents: Math.round(priceDollars * 100),
          imageUrl: imageUrl || undefined,
          type,
          downloadUrl: downloadUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create product");
        setSaving(false);
        return;
      }
      setTitle("");
      setDescription("");
      setPrice("");
      setImageUrl("");
      setType("DIGITAL");
      setDownloadUrl("");
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete product");
        setDeletingId(null);
        return;
      }
      setDeletingId(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="kofi-card flex gap-4 p-4">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl border border-line object-cover"
                />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-line bg-surface-2">
                  <BrandIcon name="shop" className="h-12 w-12" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-semibold">{product.title}</h3>
                  <span className="shrink-0 font-semibold">
                    {product.priceCents === 0 ? "Free" : formatUsd(product.priceCents)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {product.type === "DIGITAL" ? "Digital" : "Physical"} · {product.salesCount} sold
                </p>
                {product.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>
                ) : null}
                <div className="mt-auto self-start pt-2">
                  <Button
                    type="button"
                    size="2"
                    variant="surface"
                    color="gray"
                    onClick={() => onDelete(product.id)}
                    disabled={deletingId === product.id}
                  >
                    {deletingId === product.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kofi-card p-6 text-sm text-muted">
          No products yet. Add your first item below.
        </div>
      )}

      <form onSubmit={onSubmit} className="kofi-card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Add a product</h2>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="product-title">
            Title
          </label>
          <TextField.Root size="3">
            <TextField.Input
              id="product-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="High-res wallpaper pack"
              required
              maxLength={120}
            />
          </TextField.Root>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="product-description">
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <TextArea
            id="product-description"
            size="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="What's included."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="product-price">
              Price (USD) <span className="font-normal text-muted">— 0 for free</span>
            </label>
            <TextField.Root size="3">
              <TextField.Slot>$</TextField.Slot>
              <TextField.Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </TextField.Root>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="product-type">
              Type
            </label>
            <Select.Root value={type} onValueChange={(v) => setType(v as ProductType)}>
              <Select.Trigger id="product-type" className="w-full" />
              <Select.Content>
                <Select.Item value="DIGITAL">Digital</Select.Item>
                <Select.Item value="PHYSICAL">Physical</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="product-image">
            Image URL <span className="font-normal text-muted">(optional)</span>
          </label>
          <TextField.Root size="3">
            <TextField.Input
              id="product-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </TextField.Root>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="product-download">
            Download URL <span className="font-normal text-muted">(optional, for digital)</span>
          </label>
          <TextField.Root size="3">
            <TextField.Input
              id="product-download"
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://…"
            />
          </TextField.Root>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" size="3" variant="solid" disabled={saving}>
          {saving ? "Adding…" : "Add product"}
        </Button>
      </form>
    </div>
  );
}
