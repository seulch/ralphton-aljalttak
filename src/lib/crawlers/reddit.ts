import { runApifyActor } from "./apify-client";
import type { RawCrawlData } from "./index";

const SUBREDDITS = [
  "r/korea",
  "r/asianbeauty",
  "r/costco",
  "r/kbeauty",
  "r/KoreanBeauty",
];

export async function crawlReddit(): Promise<RawCrawlData> {
  const texts: string[] = [];
  const urls: string[] = [];

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
    console.error("[reddit] crawl error:", err);
  }

  return { source: "reddit", texts, urls };
}
