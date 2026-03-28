"use client";

import type { ProductWithPrices } from "@/types/database";
import { PriceLinks } from "./PriceLinks";

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍜",
  beauty: "💄",
  health: "💊",
  tech: "📱",
  fashion: "👗",
  home: "🏠",
};

interface ProductCardProps {
  product: ProductWithPrices;
  exchangeRate: number;
  onAddToList: (productId: string) => void;
  onRefreshPrice?: (productId: string) => void;
}

export function ProductCard({
  product,
  exchangeRate,
  onAddToList,
  onRefreshPrice,
}: ProductCardProps) {
  const dirLabel =
    product.direction === "us_to_kr" ? "Only in US" : "Only in Korea";

  return (
    <div className="flex flex-col rounded-2xl border border-border-default bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-5">
        {/* Top: category */}
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-secondary text-sm">
            {CATEGORY_ICONS[product.category] || "📦"}
          </span>
          <span className="text-xs font-semibold uppercase text-accent-primary">
            {product.category}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-base font-bold text-fg-primary">{product.name}</h3>
        {product.name_localized && (
          <p className="-mt-2 text-[13px] text-fg-muted">
            {product.name_localized}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {product.is_country_exclusive && (
            <span className="rounded-full bg-accent-primary px-2.5 py-1 text-[11px] font-medium text-fg-inverse">
              🏷️ {dirLabel}
            </span>
          )}
          {product.tags?.includes("sns_recommended") && (
            <span className="rounded-full bg-accent-green px-2.5 py-1 text-[11px] font-medium text-fg-inverse">
              🔥 Trending on SNS
            </span>
          )}
          {product.tags?.includes("community_recommended") && (
            <span className="rounded-full bg-accent-orange px-2.5 py-1 text-[11px] font-medium text-fg-inverse">
              💬 Community Pick
            </span>
          )}
        </div>

        {/* AI reason */}
        {product.ai_reason && (
          <p className="text-[13px] leading-relaxed text-fg-secondary">
            {product.ai_reason}
          </p>
        )}

        {/* Prices */}
        <PriceLinks
          product={product}
          exchangeRate={exchangeRate}
          onRefresh={onRefreshPrice}
        />

        {/* Actions */}
        <button
          onClick={() => onAddToList(product.id)}
          className="mt-1 w-full rounded-lg bg-accent-primary py-2 text-sm font-semibold text-fg-inverse transition-colors hover:bg-blue-700"
        >
          + Add to List
        </button>
      </div>
    </div>
  );
}
