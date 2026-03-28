import { runApifyActor } from "./apify-client";
import type { RawCrawlData } from "./index";

const HASHTAGS = [
  "koreangift",
  "ushaul",
  "올리브영추천",
  "traderjoeshaul",
  "kbeauty",
];

export async function crawlInstagram(): Promise<RawCrawlData> {
  const texts: string[] = [];
  const urls: string[] = [];

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
    console.error("[instagram] crawl error:", err);
  }

  return { source: "instagram", texts, urls };
}
