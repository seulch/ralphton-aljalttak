import { runApifyActor } from "./apify-client";
import type { RawCrawlData } from "./index";

const HASHTAGS = [
  "korea gift",
  "한국 선물",
  "trader joes haul",
  "올리브영 추천",
  "us gift korea",
];

export async function crawlTikTok(): Promise<RawCrawlData> {
  const texts: string[] = [];
  const urls: string[] = [];

  for (const hashtag of HASHTAGS) {
    try {
      const items = await runApifyActor("clockworks/free-tiktok-scraper", {
        hashtags: [hashtag],
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
      console.error(`[tiktok] crawl error for "${hashtag}":`, err);
    }
  }

  return { source: "tiktok", texts, urls };
}
