import { runApifyActor } from "./apify-client";
import type { RawCrawlData } from "./index";

const HASHTAGS = [
  "koreangift",
  "ushaul",
  "올리브영추천",
  "traderjoeshaul",
  "kbeauty",
];

const SERPAPI_QUERIES = [
  "site:instagram.com korean gift recommendation",
  "site:instagram.com kbeauty haul",
  "site:instagram.com olive young 올리브영",
  "site:instagram.com trader joes haul",
  "site:instagram.com us korea gift",
];

export async function crawlInstagram(): Promise<RawCrawlData> {
  const texts: string[] = [];
  const urls: string[] = [];

  // Try Apify first
  try {
    const items = await runApifyActor("apify/instagram-hashtag-scraper", {
      hashtags: HASHTAGS,
      resultsLimit: 20,
    });

    for (const item of items) {
      const caption = (item.caption as string) || "";
      const shortCode = (item.shortCode as string) || "";
      const url = (item.url as string) ||
        (shortCode ? `https://www.instagram.com/p/${shortCode}/` : "");
      if (caption.trim()) {
        texts.push(caption);
        if (url) urls.push(url);
      }
    }
  } catch (err) {
    console.error("[instagram] Apify crawl error:", err);
  }

  // Fallback: SerpAPI site:instagram.com searches
  if (texts.length === 0) {
    console.error("[instagram] Apify returned 0 results, falling back to SerpAPI");
    await serpapiFallback(texts, urls);
  }

  return { source: "instagram", texts, urls };
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
      console.error(`[instagram-fallback] error for "${query}":`, err);
    }
  }
}
