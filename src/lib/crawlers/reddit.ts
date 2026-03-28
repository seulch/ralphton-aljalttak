import { runApifyActor } from "./apify-client";
import type { RawCrawlData } from "./index";

const SUBREDDITS = [
  "r/korea",
  "r/asianbeauty",
  "r/costco",
  "r/kbeauty",
  "r/KoreanBeauty",
];

const SERPAPI_QUERIES = [
  "site:reddit.com korea gift recommendation",
  "site:reddit.com best gifts from US for Koreans",
  "site:reddit.com korean beauty haul",
  "site:reddit.com trader joes gift",
  "site:reddit.com costco korean gift",
];

export async function crawlReddit(): Promise<RawCrawlData> {
  const texts: string[] = [];
  const urls: string[] = [];

  // Try Apify first
  try {
    const startUrls = SUBREDDITS.map((sub) => ({
      url: `https://www.reddit.com/${sub}/top/?t=month`,
    }));

    const items = await runApifyActor("trudax/reddit-scraper-lite", {
      startUrls,
      maxItems: 25,
    });

    for (const item of items) {
      const title = (item.title as string) || "";
      const body = (item.body as string) || "";
      const link = (item.link as string) || (item.url as string) || "";
      const combined = [title, body].filter(Boolean).join(" — ");
      if (combined.trim()) {
        texts.push(combined);
        if (link) urls.push(link);
      }
    }
  } catch (err) {
    console.error("[reddit] Apify crawl error:", err);
  }

  // Fallback: SerpAPI site:reddit.com searches
  if (texts.length === 0) {
    console.error("[reddit] Apify returned 0 results, falling back to SerpAPI");
    await serpapiFallback(texts, urls);
  }

  return { source: "reddit", texts, urls };
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
      console.error(`[reddit-fallback] error for "${query}":`, err);
    }
  }
}
