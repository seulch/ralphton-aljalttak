"use client";

import { useEffect, useState, use } from "react";
import { NavBar } from "@/components/NavBar";
import type { ShoppingList, ShoppingListItem, Product } from "@/types/database";
import { formatUSD } from "@/lib/utils";

interface ListItemWithProduct extends ShoppingListItem {
  products: Product | null;
}

interface ListWithItems extends ShoppingList {
  shopping_list_items: ListItemWithProduct[];
}

export default function SharedListPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [list, setList] = useState<ListWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/list/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setList(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-fg-muted">Loading shared list...</p>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <span className="text-4xl">🔗</span>
          <p className="text-fg-secondary">List not found or link expired.</p>
        </div>
      </div>
    );
  }

  const items = list.shopping_list_items || [];
  const dirLabel =
    list.direction === "us_to_kr" ? "🇺🇸 → 🇰🇷" : "🇰🇷 → 🇺🇸";

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <div>
          <span className="rounded-lg bg-surface-secondary px-3 py-1 text-xs font-semibold text-fg-secondary">
            {dirLabel} Shared List
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-fg-primary">
            {list.name}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {items.length} items · Read-only view
          </p>
        </div>

        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border-default bg-border-default">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 bg-white px-5 py-4"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  item.checked
                    ? "border-accent-primary bg-accent-primary text-white"
                    : "border-border-default"
                }`}
              >
                {item.checked && "✓"}
              </span>
              <div className="flex flex-1 flex-col">
                <span
                  className={`text-sm font-medium ${
                    item.checked
                      ? "text-fg-muted line-through"
                      : "text-fg-primary"
                  }`}
                >
                  {item.products?.name || item.custom_name || "Unknown"}
                </span>
                {item.products?.name_localized && (
                  <span className="text-xs text-fg-muted">
                    {item.products.name_localized}
                  </span>
                )}
              </div>
              <span className="text-sm text-fg-secondary">
                ×{item.quantity}
              </span>
              {item.products?.estimated_us_price && (
                <span className="text-sm font-medium text-fg-primary">
                  {formatUSD(item.products.estimated_us_price * item.quantity)}
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
      <footer className="flex items-center justify-between bg-surface-secondary px-6 py-7 lg:px-12">
        <span className="text-[13px] text-fg-muted">
          Built at Ralphthon SF 2026
        </span>
        <span className="text-[13px] text-fg-muted">AJT-gift</span>
      </footer>
    </div>
  );
}
