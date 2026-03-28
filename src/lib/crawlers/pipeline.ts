import { supabase } from "@/lib/supabase/client";
import { crawlReddit } from "./reddit";
import { crawlTikTok } from "./tiktok";
import { crawlInstagram } from "./instagram";
import { crawlYouTube } from "./youtube";
import { crawlGoogleSearch } from "./google-search";
import { crawlNaver } from "./naver";
import { extractProducts, deduplicateProducts } from "./ai-extractor";
import type { RawCrawlData } from "./index";
import type { CrawlPhase } from "@/types/database";

async function logCrawlRun(
  source: string,
  phase: CrawlPhase,
  fn: () => Promise<{ itemsFound: number }>
) {
  const { data: run } = await supabase
    .from("crawl_runs")
    .insert({ source, phase, status: "running" })
    .select("id")
    .single();

  try {
    const result = await fn();
    if (run) {
      await supabase
        .from("crawl_runs")
        .update({
          status: "completed",
          items_found: result.itemsFound,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }
    return result;
  } catch (err) {
    if (run) {
      await supabase
        .from("crawl_runs")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }
    throw err;
  }
}

export async function runSnsCrawlers(): Promise<RawCrawlData[]> {
  const results = await Promise.allSettled([
    crawlReddit(),
    crawlTikTok(),
    crawlInstagram(),
  ]);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RawCrawlData> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}

export async function runCommunityCrawlers(): Promise<RawCrawlData[]> {
  const results = await Promise.allSettled([
    crawlYouTube(),
    crawlGoogleSearch(),
    crawlNaver(),
  ]);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RawCrawlData> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}

export async function runPhase1Pipeline(): Promise<number> {
  let snsData: RawCrawlData[] = [];
  let communityData: RawCrawlData[] = [];

  await Promise.all([
    logCrawlRun("sns", "phase1_sns", async () => {
      snsData = await runSnsCrawlers();
      return { itemsFound: snsData.reduce((s, d) => s + d.texts.length, 0) };
    }),
    logCrawlRun("community", "phase1_community", async () => {
      communityData = await runCommunityCrawlers();
      return { itemsFound: communityData.reduce((s, d) => s + d.texts.length, 0) };
    }),
  ]);

  const allRawData = [...snsData, ...communityData];
  const withTexts = allRawData.filter((d) => d.texts.length > 0);

  if (withTexts.length === 0) {
    console.error("[pipeline] No data from any source");
    return 0;
  }

  // Try AI extraction first, fall back to keyword extraction
  let extracted = await extractProducts(withTexts);
  if (extracted.length === 0) {
    console.error("[pipeline] AI extraction returned 0 products, using keyword fallback");
    extracted = keywordExtract(withTexts);
  }
  const deduplicated = deduplicateProducts(extracted);

  let stored = 0;
  for (const product of deduplicated) {
    const { error } = await supabase.from("products").upsert(
      {
        name: product.name,
        name_localized: product.name_localized,
        direction: product.direction,
        category: product.category,
        estimated_us_price: product.estimated_us_price,
        estimated_kr_price: product.estimated_kr_price,
        is_country_exclusive: product.is_country_exclusive,
        tags: product.tags,
        why_popular: product.why_popular,
        trending_score: product.trending_score,
        source: product.source,
        best_for_age: product.best_for_age,
        best_for_interests: product.best_for_interests,
        best_for_relationship: product.best_for_relationship,
        last_crawled_at: new Date().toISOString(),
      },
      { onConflict: "name,direction" }
    );
    if (!error) stored++;
  }

  return stored;
}

// Keyword-based fallback extractor when OpenAI is unavailable
function keywordExtract(
  rawData: RawCrawlData[]
): Omit<import("@/types/database").Product, "id" | "created_at" | "last_crawled_at" | "image_url" | "source_url">[] {
  const KNOWN_PRODUCTS: Record<string, { name: string; name_localized: string | null; direction: "us_to_kr" | "kr_to_us"; category: "food" | "beauty" | "health" | "tech" | "fashion" | "home"; is_country_exclusive: boolean; estimated_us_price: number | null; estimated_kr_price: number | null }> = {
    "trader joe": { name: "Trader Joe's Products", name_localized: "트레이더조", direction: "us_to_kr", category: "food", is_country_exclusive: true, estimated_us_price: 5, estimated_kr_price: null },
    "bath & body": { name: "Bath & Body Works", name_localized: "배쓰앤바디웍스", direction: "us_to_kr", category: "home", is_country_exclusive: true, estimated_us_price: 15, estimated_kr_price: null },
    "costco": { name: "Costco Kirkland Products", name_localized: "코스트코 커클랜드", direction: "us_to_kr", category: "health", is_country_exclusive: true, estimated_us_price: 20, estimated_kr_price: null },
    "sephora": { name: "Sephora Collection", name_localized: "세포라", direction: "us_to_kr", category: "beauty", is_country_exclusive: true, estimated_us_price: 15, estimated_kr_price: null },
    "tylenol": { name: "Tylenol Extra Strength", name_localized: "타이레놀", direction: "us_to_kr", category: "health", is_country_exclusive: true, estimated_us_price: 9, estimated_kr_price: null },
    "올리브영": { name: "Olive Young K-Beauty", name_localized: "올리브영", direction: "kr_to_us", category: "beauty", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 15000 },
    "olive young": { name: "Olive Young K-Beauty", name_localized: "올리브영", direction: "kr_to_us", category: "beauty", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 15000 },
    "김": { name: "Korean Roasted Seaweed", name_localized: "김", direction: "kr_to_us", category: "food", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 10000 },
    "홍삼": { name: "Korean Red Ginseng", name_localized: "홍삼", direction: "kr_to_us", category: "health", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 50000 },
    "다이소": { name: "Daiso Korea", name_localized: "다이소", direction: "kr_to_us", category: "home", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 3000 },
    "마스크팩": { name: "Korean Sheet Masks", name_localized: "마스크팩", direction: "kr_to_us", category: "beauty", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 1500 },
    "라면": { name: "Korean Ramen Variety", name_localized: "한국 라면", direction: "kr_to_us", category: "food", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 5000 },
    "kbeauty": { name: "K-Beauty Skincare Set", name_localized: "케이뷰티", direction: "kr_to_us", category: "beauty", is_country_exclusive: true, estimated_us_price: null, estimated_kr_price: 20000 },
  };

  const allText = rawData.map((d) => d.texts.join(" ").toLowerCase()).join(" ");
  const found = new Map<string, typeof KNOWN_PRODUCTS[string] & { score: number; source: string }>();

  for (const [keyword, product] of Object.entries(KNOWN_PRODUCTS)) {
    const regex = new RegExp(keyword, "gi");
    const matches = allText.match(regex);
    if (matches && matches.length > 0) {
      const existing = found.get(product.name);
      const score = Math.min(95, 50 + matches.length * 5 + (product.is_country_exclusive ? 25 : 0));
      if (!existing || score > existing.score) {
        const matchSource = rawData.find((d) =>
          d.texts.some((t) => t.toLowerCase().includes(keyword))
        );
        found.set(product.name, {
          ...product,
          score,
          source: matchSource?.source || "google",
        });
      }
    }
  }

  return Array.from(found.values()).map((p) => ({
    name: p.name,
    name_localized: p.name_localized,
    direction: p.direction,
    category: p.category,
    estimated_us_price: p.estimated_us_price,
    estimated_kr_price: p.estimated_kr_price,
    is_country_exclusive: p.is_country_exclusive,
    tags: ["community_recommended" as const],
    why_popular: `Frequently mentioned in ${p.source} discussions about cross-border gifts.`,
    trending_score: p.score,
    source: p.source as import("@/types/database").CrawlSource,
    best_for_age: [] as string[],
    best_for_interests: [] as string[],
    best_for_relationship: [] as string[],
  }));
}

export async function checkCrawlCooldown(): Promise<{
  canCrawl: boolean;
  reason?: string;
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: recent } = await supabase
    .from("crawl_runs")
    .select("id")
    .eq("phase", "pipeline")
    .gte("started_at", oneHourAgo);

  if (recent && recent.length > 0) {
    return { canCrawl: false, reason: "Cooldown: wait 1 hour between crawls" };
  }

  const { data: today } = await supabase
    .from("crawl_runs")
    .select("id")
    .eq("phase", "pipeline")
    .gte("started_at", todayStart.toISOString());

  if (today && today.length >= 3) {
    return { canCrawl: false, reason: "Daily limit: max 3 crawls per day" };
  }

  return { canCrawl: true };
}
