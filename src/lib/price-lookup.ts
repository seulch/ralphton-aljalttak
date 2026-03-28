import { supabase } from "@/lib/supabase/client";
import type { ProductPrice, Country } from "@/types/database";

const US_WHITELIST = [
  "Amazon", "Walmart", "Target", "Costco", "iHerb",
  "Bath & Body Works", "Best Buy", "Sephora", "CVS", "Trader Joe's",
];
const KR_WHITELIST = [
  "Coupang", "Naver Shopping", "Gmarket", "11st",
  "Olive Young", "SSG.com", "Musinsa",
];

interface ShoppingResult {
  title: string;
  price: number;
  source: string;
  link: string;
  currency?: string;
}

export async function lookupPrice(
  productName: string,
  country: Country
): Promise<Omit<ProductPrice, "id" | "product_id" | "fetched_at">[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const whitelist = country === "us" ? US_WHITELIST : KR_WHITELIST;

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: productName,
      gl: country,
      api_key: apiKey,
    });
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      shopping_results?: ShoppingResult[];
    };

    const results = (data.shopping_results || [])
      .filter((r) =>
        whitelist.some((w) =>
          r.source?.toLowerCase().includes(w.toLowerCase())
        )
      )
      .sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
      .slice(0, 3);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return results.map((r, i) => ({
      country,
      store_name: r.source || "Unknown",
      price: r.price,
      currency: country === "us" ? "USD" : "KRW",
      product_link: r.link || "#",
      rank: (i + 1) as 1 | 2 | 3,
      expires_at: expiresAt,
    }));
  } catch (err) {
    console.error(`[price-lookup] Error for "${productName}":`, err);
    return [];
  }
}

export async function refreshProductPrices(
  productId: string,
  productName: string,
  country: Country
): Promise<void> {
  const prices = await lookupPrice(productName, country);
  if (prices.length === 0) return;

  // Enforce max 3: delete existing for this product+country
  await supabase
    .from("product_prices")
    .delete()
    .eq("product_id", productId)
    .eq("country", country);

  // Insert new
  for (const p of prices) {
    await supabase.from("product_prices").insert({
      product_id: productId,
      ...p,
    });
  }
}

export async function getCachedPrices(
  productId: string
): Promise<ProductPrice[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("product_prices")
    .select("*")
    .eq("product_id", productId)
    .gt("expires_at", now)
    .order("rank", { ascending: true });

  return (data as ProductPrice[]) || [];
}
