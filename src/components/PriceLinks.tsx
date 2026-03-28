"use client";

import type { ProductWithPrices } from "@/types/database";
import { formatUSD, formatKRW } from "@/lib/utils";

interface PriceLinksProps {
  product: ProductWithPrices;
  exchangeRate: number;
  onRefresh?: (productId: string) => void;
}

export function PriceLinks({
  product,
  exchangeRate,
  onRefresh,
}: PriceLinksProps) {
  const prices = product.prices || [];
  const usPrices = prices.filter((p) => p.country === "us").slice(0, 3);
  const krPrices = prices.filter((p) => p.country === "kr").slice(0, 3);

  const hasAnyPrice = usPrices.length > 0 || krPrices.length > 0;
  const estUS = product.estimated_us_price;
  const estKR = product.estimated_kr_price;

  if (!hasAnyPrice && !estUS && !estKR) {
    return (
      <div className="border-t border-border-default pt-2.5">
        <button
          onClick={() => onRefresh?.(product.id)}
          className="text-xs font-medium text-accent-primary hover:underline"
        >
          Load prices...
        </button>
      </div>
    );
  }

  // Calculate savings
  const cheapestUS = usPrices[0]?.price ?? estUS;
  const cheapestKR = krPrices[0]?.price ?? estKR;
  let savingsText: string | null = null;
  if (cheapestUS && cheapestKR) {
    const usdInKRW = cheapestUS * exchangeRate;
    const diff = Math.abs(usdInKRW - cheapestKR);
    if (diff > 1000) {
      const cheaper =
        usdInKRW < cheapestKR ? "buying in US" : "buying in Korea";
      savingsText = `Save ${formatKRW(diff)} ${cheaper}`;
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-border-default pt-2.5">
      {usPrices.map((p) => (
        <PriceRow
          key={p.id}
          store={p.store_name}
          price={`${formatUSD(p.price)} (${formatKRW(p.price * exchangeRate)})`}
          link={p.product_link}
        />
      ))}
      {usPrices.length === 0 && estUS && (
        <PriceRow
          store="Estimated (US)"
          price={`${formatUSD(estUS)} (${formatKRW(estUS * exchangeRate)})`}
          link={null}
        />
      )}
      {krPrices.map((p) => (
        <PriceRow
          key={p.id}
          store={p.store_name}
          price={`${formatKRW(p.price)} (${formatUSD(p.price / exchangeRate)})`}
          link={p.product_link}
        />
      ))}
      {krPrices.length === 0 && estKR && (
        <PriceRow
          store="Estimated (KR)"
          price={`${formatKRW(estKR)} (${formatUSD(estKR / exchangeRate)})`}
          link={null}
        />
      )}
      {savingsText && (
        <p className="mt-1 text-xs font-semibold text-accent-green">
          💰 {savingsText}
        </p>
      )}
    </div>
  );
}

function PriceRow({
  store,
  price,
  link,
}: {
  store: string;
  price: string;
  link: string | null;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-fg-secondary">{store}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-fg-primary">{price}</span>
        {link && link !== "#" && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent-primary hover:underline"
          >
            Buy →
          </a>
        )}
      </div>
    </div>
  );
}
