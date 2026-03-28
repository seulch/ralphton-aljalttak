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
  extracted_price: number;
  source: string;
  product_link: string;
  link?: string;
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

    const allResults = data.shopping_results || [];

    // Match against whitelist — check if source contains any whitelisted store name
    const whitelisted = allResults.filter((r) =>
      whitelist.some((w) => {
        const src = (r.source || "").toLowerCase();
        const store = w.toLowerCase();
        return src.includes(store) || store.includes(src.split(" - ")[0]);
      })
    );

    // If no whitelisted results, take top 3 from any source
    const candidates = whitelisted.length > 0 ? whitelisted : allResults;

    // Sanity filter: US prices should be < $500, KR prices < ₩500,000
    const maxPrice = country === "us" ? 500 : 500_000;
    const minPrice = country === "us" ? 0.5 : 100;

    const results = candidates
      .filter((r) => {
        const p = r.extracted_price || r.price;
        return p > minPrice && p < maxPrice;
      })
      .sort(
        (a, b) =>
          (a.extracted_price || a.price || Infinity) -
          (b.extracted_price || b.price || Infinity)
      )
      .slice(0, 3);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return results.map((r, i) => ({
      country,
      store_name: r.source || "Unknown",
      price: r.extracted_price || r.price,
      currency: country === "us" ? "USD" : "KRW",
      product_link: r.product_link || r.link || "#",
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
): Promise<number> {
  const prices = await lookupPrice(productName, country);
  if (prices.length === 0) return 0;

  // Enforce max 3: delete existing for this product+country
  await supabase
    .from("product_prices")
    .delete()
    .eq("product_id", productId)
    .eq("country", country);

  // Insert new
  let inserted = 0;
  for (const p of prices) {
    const { error } = await supabase.from("product_prices").insert({
      product_id: productId,
      ...p,
    });
    if (!error) inserted++;
  }
  return inserted;
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
