"use client";

import { useEffect, useState, useCallback } from "react";
import { NavBar } from "@/components/NavBar";
import type { ShoppingList, ShoppingListItem, Product, ProductPrice } from "@/types/database";
import { formatUSD, formatKRW } from "@/lib/utils";

interface ListItemWithProduct extends ShoppingListItem {
  products: (Product & { prices?: ProductPrice[] }) | null;
}

interface ListWithItems extends ShoppingList {
  shopping_list_items: ListItemWithProduct[];
}

function getBestPrice(item: ListItemWithProduct): { store: string; price: string; link: string | null } | null {
  const product = item.products;
  if (!product) return null;

  const prices = product.prices || [];
  // Pick cheapest US price first, then KR
  const usPrices = prices.filter((p) => p.country === "us").sort((a, b) => a.price - b.price);
  const krPrices = prices.filter((p) => p.country === "kr").sort((a, b) => a.price - b.price);

  if (usPrices.length > 0) {
    return { store: usPrices[0].store_name, price: formatUSD(usPrices[0].price), link: usPrices[0].product_link };
  }
  if (product.estimated_us_price) {
    return { store: "Estimated", price: formatUSD(product.estimated_us_price), link: null };
  }
  if (krPrices.length > 0) {
    return { store: krPrices[0].store_name, price: formatKRW(krPrices[0].price), link: krPrices[0].product_link };
  }
  if (product.estimated_kr_price) {
    return { store: "Estimated", price: formatKRW(product.estimated_kr_price), link: null };
  }
  return null;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  beauty: "Beauty",
  health: "Health",
  tech: "Tech",
  fashion: "Fashion",
  home: "Home",
};

export default function ListPage() {
  const [lists, setLists] = useState<ListWithItems[]>([]);
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
  }, [fetchLists]);

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

  const list = lists[0];
  const items = list?.shopping_list_items || [];
  const directionLabel = list?.direction === "kr_to_us" ? "KR to US" : "US to KR";
  const directionArrow = list?.direction === "kr_to_us" ? "KR -> US" : "US -> KR";

  const handleCopyMarkdown = () => {
    const lines = [`## My Gift List (${directionArrow})`, ""];
    items.forEach((item) => {
      const product = item.products;
      const name = product?.name || item.custom_name || "Unknown item";
      const best = getBestPrice(item);
      const storePart = best ? ` -- ${best.store}` : "";
      lines.push(`- ${name}${storePart}`);
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <NavBar cartCount={items.length} />

      {/* Blue accent bar */}
      <div className="h-1 bg-accent-primary" />

      <main className="flex flex-1 gap-8 px-6 py-10 lg:px-12">
        {/* List items */}
        <div className="flex flex-1 flex-col gap-5">
          <div>
            <h1 className="text-2xl font-extrabold text-fg-primary">My List</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {directionLabel} · {items.length} items saved
            </p>
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
            <div className="flex flex-col divide-y divide-gray-200 rounded-xl bg-white shadow-sm">
              {items.map((item) => {
                const product = item.products;
                const best = getBestPrice(item);
                const categoryLabel = CATEGORY_LABELS[product?.category || ""] || "Item";

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-fg-primary">
                        {product?.name || item.custom_name || "Unknown item"}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {categoryLabel}
                        {best ? ` · ~${best.price} at ${best.store}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {best?.link && best.link !== "#" ? (
                        <a
                          href={best.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-accent-primary hover:underline"
                        >
                          {best.store} →
                        </a>
                      ) : best?.store && best.store !== "Estimated" ? (
                        <span className="text-sm font-medium text-fg-muted">
                          {best.store}
                        </span>
                      ) : null}
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-fg-muted hover:text-accent-red"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar - Copy as Markdown */}
        {items.length > 0 && (
          <aside className="hidden w-[380px] shrink-0 lg:block">
            <div className="sticky top-24 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-fg-primary">
                Copy as Markdown
              </h3>
              <p className="text-sm text-fg-secondary">
                Copy your list and paste it anywhere.
              </p>
              <div className="relative rounded-lg bg-gray-50 p-4">
                <button
                  onClick={handleCopyMarkdown}
                  className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-fg-secondary hover:bg-gray-50"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-fg-secondary">
{`## My Gift List (${directionArrow})
${items.map((item) => {
  const name = item.products?.name || item.custom_name || "Unknown";
  const best = getBestPrice(item);
  const store = best?.store || "";
  return `- ${name}${store ? ` -- ${store}` : ""}`;
}).join("\n")}`}
                </pre>
              </div>
              <p className="text-xs text-fg-muted">
                Hand it over to ChatGPT or Codex.
              </p>
            </div>
          </aside>
        )}
      </main>

      <footer className="flex items-center justify-between bg-surface-secondary px-6 py-7 lg:px-12">
        <span className="text-[13px] text-fg-muted">
          Built at Ralphthon SF 2026
        </span>
        <span className="text-[13px] text-fg-muted">AJT Gifts</span>
      </footer>
    </div>
  );
}
