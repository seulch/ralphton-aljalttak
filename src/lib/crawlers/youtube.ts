import type { RawCrawlData } from "./index";

const QUERIES = [
  "미국 쇼핑리스트",
  "Korea haul",
  "한국 선물 추천",
  "what to buy in Korea",
  "what to buy in US for Korean",
];

interface YouTubeSearchItem {
  snippet: {
    title: string;
    description: string;
  };
  id: { videoId?: string };
}

export async function crawlYouTube(): Promise<RawCrawlData> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("[youtube] YOUTUBE_API_KEY not configured");
    return { source: "youtube", texts: [], urls: [] };
  }

  const texts: string[] = [];
  const urls: string[] = [];

  for (const query of QUERIES) {
    try {
      const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        maxResults: "10",
        order: "relevance",
        key: apiKey,
      });
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`
      );
      if (!res.ok) continue;

      const data = (await res.json()) as { items: YouTubeSearchItem[] };
      for (const item of data.items || []) {
        const text = `${item.snippet.title} — ${item.snippet.description}`;
        texts.push(text);
        if (item.id.videoId) {
          urls.push(`https://www.youtube.com/watch?v=${item.id.videoId}`);
        }
      }
    } catch (err) {
      console.error(`[youtube] error for "${query}":`, err);
    }
  }

  return { source: "youtube", texts, urls };
}
