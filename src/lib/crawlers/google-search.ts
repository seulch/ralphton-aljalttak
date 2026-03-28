import type { RawCrawlData } from "./index";

const QUERIES = [
  "site:threads.net korea gift",
  "site:x.com 한국 선물 추천",
  "best gifts from US for Koreans 2026",
  "한국에서 미국 선물 뭐사갈까",
  "best Korean gifts for Americans",
];

interface SerpResult {
  title: string;
  snippet: string;
  link: string;
}

export async function crawlGoogleSearch(): Promise<RawCrawlData> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.error("[google-search] SERPAPI_KEY not configured");
    return { source: "google", texts: [], urls: [] };
  }

  const texts: string[] = [];
  const urls: string[] = [];

  for (const query of QUERIES) {
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
        organic_results?: SerpResult[];
      };
      for (const result of data.organic_results || []) {
        const text = `${result.title} — ${result.snippet || ""}`;
        texts.push(text);
        if (result.link) urls.push(result.link);
      }
    } catch (err) {
      console.error(`[google-search] error for "${query}":`, err);
    }
  }

  return { source: "google", texts, urls };
}
