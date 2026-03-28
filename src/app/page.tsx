"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { DirectionCard } from "@/components/DirectionCard";

export default function Home() {
  const [stats, setStats] = useState({ products: 0, sources: 6 });
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownMsg, setCooldownMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setStats((s) => ({ ...s, products: d.data.length }));
          if (d.data.length === 0) {
            // First visit — trigger crawl silently
            fetch("/api/crawl", { method: "POST" }).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCooldownMsg(null);
    try {
      const res = await fetch("/api/crawl", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setCooldownMsg(data.error || "Refresh failed");
      } else {
        // Reload stats
        const statsRes = await fetch("/api/products");
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats((s) => ({ ...s, products: statsData.data.length }));
        }
      }
    } catch {
      setCooldownMsg("Network error");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center bg-gradient-to-b from-blue-50 to-white px-6 pt-16 pb-12">
        <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-fg-secondary">
          🎁 Cross-Border Gift Finder
        </span>
        <h1 className="mt-6 text-center text-5xl font-extrabold leading-tight text-fg-primary">
          AJT-gift
        </h1>
        <div className="mt-3 h-[3px] w-12 rounded-full bg-accent-primary" />
        <p className="mt-4 max-w-md text-center text-[15px] leading-relaxed text-fg-secondary">
          Discover country-exclusive gifts that you can only get by traveling
          between the US and Korea. Powered by real community recommendations.
        </p>

        {/* Stats */}
        <p className="mt-6 text-sm text-fg-muted">
          Tracking{" "}
          <span className="font-semibold text-accent-primary">
            {stats.products}
          </span>{" "}
          country-exclusive gifts from{" "}
          <span className="font-semibold text-accent-primary">
            {stats.sources}
          </span>{" "}
          community sources
        </p>

        {/* Direction cards */}
        <div className="mt-10 flex w-full max-w-2xl flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <DirectionCard direction="us_to_kr" />
          <DirectionCard direction="kr_to_us" />
        </div>

        {/* Refresh */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg bg-surface-secondary px-5 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            {refreshing ? "Refreshing trends..." : "🔄 Refresh Trends"}
          </button>
          {cooldownMsg && (
            <p className="text-xs text-accent-orange">{cooldownMsg}</p>
          )}
          <p className="text-[11px] text-fg-muted">
            1h cooldown · 3 refreshes per day
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between bg-surface-secondary px-6 py-7 lg:px-12">
        <span className="text-[13px] text-fg-muted">
          Built at Ralphthon SF 2026
        </span>
        <span className="text-[13px] text-fg-muted">AJT-gift</span>
      </footer>
    </div>
  );
}
