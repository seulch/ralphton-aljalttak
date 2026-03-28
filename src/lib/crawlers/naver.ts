import type { RawCrawlData } from "./index";

const QUERIES = [
  "미국 선물 추천",
  "한국에서 사올것",
  "미국여행 쇼핑리스트",
];

interface NaverBlogItem {
  title: string;
  description: string;
  link: string;
}

export async function crawlNaver(): Promise<RawCrawlData> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[naver] NAVER_CLIENT_ID or NAVER_CLIENT_SECRET not configured");
    return { source: "naver", texts: [], urls: [] };
  }

  const texts: string[] = [];
  const urls: string[] = [];

  for (const query of QUERIES) {
    try {
      const params = new URLSearchParams({
        query,
        display: "20",
        sort: "date",
      });
      const res = await fetch(
        `https://openapi.naver.com/v1/search/blog.json?${params}`,
        {
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret,
          },
        }
      );
      if (!res.ok) continue;

      const data = (await res.json()) as { items: NaverBlogItem[] };
      for (const item of data.items || []) {
        const clean = (s: string) =>
          s.replace(/<\/?b>/g, "").replace(/&[a-z]+;/g, " ");
        const text = `${clean(item.title)} — ${clean(item.description)}`;
        texts.push(text);
        if (item.link) urls.push(item.link);
      }
    } catch (err) {
      console.error(`[naver] error for "${query}":`, err);
    }
  }

  return { source: "naver", texts, urls };
}
