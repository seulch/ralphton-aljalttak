import { runApifyActor } from "./apify-client";
import type { RawCrawlData } from "./index";

const HASHTAGS = [
  "korea gift",
  "한국 선물",
  "trader joes haul",
  "올리브영 추천",
  "us gift korea",
];

const SERPAPI_QUERIES = [
  "site:tiktok.com korea gift haul",
  "site:tiktok.com trader joes haul korean",
  "site:tiktok.com olive young 올리브영",
  "site:tiktok.com what to buy in korea",
  "site:tiktok.com us gifts for koreans",
];

export async function crawlTikTok(): Promise<RawCrawlData> {
  const texts: string[] = [];
  const urls: string[] = [];

  // Try Apify first (single call with first hashtag to avoid serial timeouts)
  try {
    const items = await runApifyActor("clockworks/free-tiktok-scraper", {
      hashtags: [HASHTAGS[0]],
      resultsPerPage: 20,
      excludePinnedPosts: false,
    });

    for (const item of items) {
      const text = (item.text as string) || (item.desc as string) || "";
      const url = (item.webVideoUrl as string) || "";
      if (text.trim()) {
        texts.push(text);
        if (url) urls.push(url);
      }
    }
  } catch (err) {
    console.error("[tiktok] Apify error:", err);
  }

  // Fallback: SerpAPI site:tiktok.com searches
  if (texts.length === 0) {
    console.error("[tiktok] Apify returned 0 results, falling back to SerpAPI");
    await serpapiFallback(texts, urls);
  }

  return { source: "tiktok", texts, urls };
}

async function serpapiFallback(texts: string[], urls: string[]) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return;

  for (const query of SERPAPI_QUERIES) {
    try {
      const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        engine: "google",
        num: "10",
      });
      const res = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!res.ok) continue;

      const data = (await res.json()) as {
        organic_results?: { title: string; snippet: string; link: string }[];
      };
      for (const result of data.organic_results || []) {
        const text = `${result.title} — ${result.snippet || ""}`;
        if (text.trim()) texts.push(text);
        if (result.link) urls.push(result.link);
      }
    } catch (err) {
      console.error(`[tiktok-fallback] error for "${query}":`, err);
    }
  }
}
