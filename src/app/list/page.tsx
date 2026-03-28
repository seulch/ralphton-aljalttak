"use client";

import { useEffect, useState, useCallback } from "react";
import { NavBar } from "@/components/NavBar";
import type { ShoppingList, ShoppingListItem, Product } from "@/types/database";
import { formatUSD, formatKRW } from "@/lib/utils";

interface ListItemWithProduct extends ShoppingListItem {
  products: Product | null;
}

interface ListWithItems extends ShoppingList {
  shopping_list_items: ListItemWithProduct[];
}

export default function ListPage() {
  const [lists, setLists] = useState<ListWithItems[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1350);
  const [copied, setCopied] = useState(false);

  const getAnonId = useCallback(() => {
    let anonId = document.cookie
      .split("; ")
      .find((c) => c.startsWith("anon_id="))
      ?.split("=")[1];
    if (!anonId) {
      anonId = crypto.randomUUID();
      document.cookie = `anon_id=${anonId}; path=/; max-age=31536000`;
    }
    return anonId;
  }, []);

  const fetchLists = useCallback(async () => {
    const anonId = getAnonId();
    const res = await fetch(`/api/list?anonymousId=${anonId}`);
    const data = await res.json();
    if (data.success) setLists(data.data || []);
  }, [getAnonId]);

  useEffect(() => {
    fetchLists();
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setExchangeRate(d.data.rate);
      })
      .catch(() => {});
  }, [fetchLists]);

  const handleToggle = async (itemId: string, checked: boolean) => {
    await fetch("/api/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-item",
        anonymousId: getAnonId(),
        itemId,
        checked: !checked,
      }),
    });
    fetchLists();
  };

  const handleRemove = async (itemId: string) => {
    await fetch("/api/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove-item",
        anonymousId: getAnonId(),
        itemId,
      }),
    });
    fetchLists();
  };

  const handleShare = (shareToken: string) => {
    const url = `${window.location.origin}/list/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const list = lists[0];
  const items = list?.shopping_list_items || [];

  // Calculate totals
  const totalUSD = items.reduce((sum, item) => {
    const price = item.products?.estimated_us_price || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar cartCount={items.length} />

      <main className="flex flex-1 gap-8 bg-gradient-to-b from-blue-50 to-white px-6 py-10 lg:px-12">
        {/* List items */}
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-fg-primary">
              🛒 My Gift List
            </h1>
            <span className="text-sm text-fg-muted">
              {items.length} items
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <span className="text-4xl">🎁</span>
              <p className="text-fg-secondary">Your gift list is empty.</p>
              <a
                href="/"
                className="mt-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-fg-inverse"
              >
                Start Finding Gifts
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-px rounded-xl border border-border-default bg-border-default overflow-hidden">
              {items.map((item) => {
                const product = item.products;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-white px-5 py-4"
                  >
                    <button
                      onClick={() => handleToggle(item.id, item.checked)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        item.checked
                          ? "border-accent-primary bg-accent-primary text-white"
                          : "border-border-default"
                      }`}
                    >
                      {item.checked && "✓"}
                    </button>
                    <div className="flex flex-1 flex-col">
                      <span
                        className={`text-sm font-medium ${
                          item.checked
                            ? "text-fg-muted line-through"
                            : "text-fg-primary"
                        }`}
                      >
                        {product?.name || item.custom_name || "Unknown item"}
                      </span>
                      {product?.name_localized && (
                        <span className="text-xs text-fg-muted">
                          {product.name_localized}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-fg-secondary">
                      ×{item.quantity}
                    </span>
                    {product?.estimated_us_price && (
                      <span className="text-sm font-medium text-fg-primary">
                        {formatUSD(product.estimated_us_price * item.quantity)}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-fg-muted hover:text-accent-red"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {items.length > 0 && (
          <aside className="hidden w-[380px] shrink-0 lg:block">
            <div className="sticky top-24 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-fg-primary">
                Summary
              </h3>
              <p className="text-sm text-fg-secondary">
                Your curated gift list with estimated prices.
              </p>
              <div className="flex flex-col gap-2.5">
                {items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="truncate text-fg-secondary">
                      {item.products?.name || "Item"} ×{item.quantity}
                    </span>
                    <span className="font-medium text-fg-primary">
                      {item.products?.estimated_us_price
                        ? formatUSD(
                            item.products.estimated_us_price * item.quantity
                          )
                        : "—"}
                    </span>
                  </div>
                ))}
                {items.length > 5 && (
                  <span className="text-xs text-fg-muted">
                    +{items.length - 5} more items
                  </span>
                )}
              </div>
              <div className="h-px bg-surface-secondary" />
              <div className="flex justify-between">
                <span className="font-bold text-fg-primary">Total</span>
                <div className="text-right">
                  <span className="font-bold text-fg-primary">
                    {formatUSD(totalUSD)}
                  </span>
                  <span className="ml-1 text-sm text-fg-muted">
                    ({formatKRW(totalUSD * exchangeRate)})
                  </span>
                </div>
              </div>

              {totalUSD > 0 && (
                <div className="rounded-xl bg-green-50 px-4 py-3">
                  <p className="text-sm font-semibold text-accent-green">
                    💰 Country-exclusive gifts — can&#39;t buy these online!
                  </p>
                </div>
              )}

              {/* Share */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-sm font-semibold text-fg-primary">
                  Share this list
                </h4>
                {list && (
                  <button
                    onClick={() => handleShare(list.share_token)}
                    className="w-full rounded-lg bg-accent-primary py-2.5 text-sm font-semibold text-fg-inverse transition-colors hover:bg-blue-700"
                  >
                    {copied ? "Copied! ✓" : "📋 Copy Share Link"}
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}
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
