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
  const [snsData, communityData] = await Promise.all([
    logCrawlRun("sns", "phase1_sns", async () => {
      const data = await runSnsCrawlers();
      return { itemsFound: data.reduce((s, d) => s + d.texts.length, 0) };
    }).then(() => runSnsCrawlers()),
    logCrawlRun("community", "phase1_community", async () => {
      const data = await runCommunityCrawlers();
      return { itemsFound: data.reduce((s, d) => s + d.texts.length, 0) };
    }).then(() => runCommunityCrawlers()),
  ]);

  const allRawData = [...snsData, ...communityData];
  const withTexts = allRawData.filter((d) => d.texts.length > 0);

  if (withTexts.length === 0) {
    console.error("[pipeline] No data from any source");
    return 0;
  }

  const extracted = await extractProducts(withTexts);
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
