"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { ProfileForm } from "@/components/ProfileForm";
import { FilterChips } from "@/components/FilterChips";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import type {
  Direction,
  Category,
  ProductWithPrices,
  RecommendationResponse,
} from "@/types/database";

function RecommendContent() {
  const searchParams = useSearchParams();
  const direction = (searchParams.get("direction") || "us_to_kr") as Direction;
  const submitted = searchParams.get("submitted") === "true";
  const age = searchParams.get("age") || undefined;
  const gender = searchParams.get("gender") || undefined;
  const relationship = searchParams.get("relationship") || undefined;
  const freeText = searchParams.get("freeText") || undefined;

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ProductWithPrices[]>(
    []
  );
  const [aiSuggestions, setAiSuggestions] = useState<ProductWithPrices[]>([]);
  const [meta, setMeta] = useState<RecommendationResponse["meta"] | null>(
    null
  );
  const [exchangeRate, setExchangeRate] = useState(1350);

  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    "all"
  );
  const [selectedBudget, setSelectedBudget] = useState("all");
  const [selectedSort, setSelectedSort] = useState("best");

  // Fetch exchange rate
  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setExchangeRate(d.data.rate);
      })
      .catch(() => {});
  }, []);

  // Fetch recommendations
  useEffect(() => {
    if (!submitted) return;
    setLoading(true);

    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, age, gender, relationship, freeText }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setRecommendations(d.data.recommendations || []);
          setAiSuggestions(d.data.aiSuggestions || []);
          setMeta(d.data.meta);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [submitted, direction, age, gender, relationship, freeText]);

  const handleAddToList = useCallback(
    async (productId: string) => {
      let anonId = document.cookie
        .split("; ")
        .find((c) => c.startsWith("anon_id="))
        ?.split("=")[1];
      if (!anonId) {
        anonId = crypto.randomUUID();
        document.cookie = `anon_id=${anonId}; path=/; max-age=31536000`;
      }
      await fetch("/api/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-item",
          anonymousId: anonId,
          productId,
          direction,
        }),
      });
    },
    [direction]
  );

  const handleRefreshPrice = useCallback(async (productId: string) => {
    const product = recommendations.find((p) => p.id === productId);
    if (!product) return;
    const res = await fetch("/api/price-refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        productName: product.name,
        country: "us",
      }),
    });
    const data = await res.json();
    if (data.success && data.data) {
      setRecommendations((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, prices: [...p.prices, ...data.data] } : p
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let items = [...recommendations];

    if (selectedCategory !== "all") {
      items = items.filter((p) => p.category === selectedCategory);
    }

    if (selectedBudget !== "all") {
      items = items.filter((p) => {
        const price =
          direction === "us_to_kr"
            ? p.estimated_us_price
            : p.estimated_kr_price;
        if (!price) return true;
        const usd =
          direction === "us_to_kr" ? price : price / exchangeRate;
        switch (selectedBudget) {
          case "0-10":
            return usd < 10;
          case "10-30":
            return usd >= 10 && usd < 30;
          case "30-50":
            return usd >= 30 && usd < 50;
          case "50-100":
            return usd >= 50 && usd < 100;
          case "100+":
            return usd >= 100;
          default:
            return true;
        }
      });
    }

    if (selectedSort === "exclusive") {
      items.sort(
        (a, b) =>
          (b.is_country_exclusive ? 1 : 0) - (a.is_country_exclusive ? 1 : 0)
      );
    } else if (selectedSort === "price-asc") {
      items.sort((a, b) => {
        const priceA = a.estimated_us_price || a.estimated_kr_price || 999;
        const priceB = b.estimated_us_price || b.estimated_kr_price || 999;
        return priceA - priceB;
      });
    }

    return items;
  }, [
    recommendations,
    selectedCategory,
    selectedBudget,
    selectedSort,
    direction,
    exchangeRate,
  ]);

  // Show form if not submitted
  if (!submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex flex-1 flex-col items-center bg-gradient-to-b from-blue-50 to-white px-6 py-14">
          <ProfileForm direction={direction} />
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

  const dirLabel =
    direction === "us_to_kr" ? "🇺🇸 → 🇰🇷" : "🇰🇷 → 🇺🇸";

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      {/* Meta banner */}
      <div className="flex items-center gap-2 bg-gradient-to-b from-blue-50 to-blue-100 px-6 py-3 lg:px-12">
        <span className="text-accent-primary">✨</span>
        <span className="text-[13px] text-fg-secondary">
          {meta?.personalized
            ? "AI-personalized recommendations"
            : "Top trending gifts"}{" "}
          · {meta?.totalProducts || 0} products · {dirLabel}
        </span>
      </div>

      {/* Content */}
      <main className="flex flex-1 flex-col gap-6 px-6 py-6 lg:px-12">
        {/* Filters */}
        <FilterChips
          selectedCategory={selectedCategory}
          selectedBudget={selectedBudget}
          selectedSort={selectedSort}
          onCategoryChange={setSelectedCategory}
          onBudgetChange={setSelectedBudget}
          onSortChange={setSelectedSort}
        />

        {/* Section header */}
        <div className="flex items-center gap-2">
          <span className="text-xl text-accent-primary">🎁</span>
          <h2 className="text-[22px] font-bold text-fg-primary">
            Recommended Gifts
          </h2>
          <span className="text-sm text-fg-muted">
            {filtered.length} items
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                exchangeRate={exchangeRate}
                onAddToList={handleAddToList}
                onRefreshPrice={handleRefreshPrice}
              />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-fg-muted">
            No products match your filters. Try adjusting category or budget.
          </p>
        )}

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg text-accent-primary">💡</span>
              <h2 className="text-xl font-bold text-fg-primary">
                AI Suggestions
              </h2>
              <span className="text-[13px] text-fg-muted">
                {aiSuggestions.length} items
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {aiSuggestions.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  exchangeRate={exchangeRate}
                  onAddToList={handleAddToList}
                />
              ))}
            </div>
          </>
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

export default function RecommendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <RecommendContent />
    </Suspense>
  );
}
