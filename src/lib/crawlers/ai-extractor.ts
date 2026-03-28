import OpenAI from "openai";
import type { RawCrawlData } from "./index";
import type { Product, ProductTag, Direction, Category, CrawlSource } from "@/types/database";

interface ExtractedProduct {
  name: string;
  name_localized: string | null;
  direction: Direction;
  category: Category;
  is_country_exclusive: boolean;
  tags: string[];
  why_popular: string;
  trending_score: number;
  estimated_us_price: number | null;
  estimated_kr_price: number | null;
  best_for_age: string[];
  best_for_interests: string[];
  best_for_relationship: string[];
}

const SYSTEM_PROMPT = `You are a product extraction AI for a cross-border gift recommendation app (US ↔ Korea).

TASK: Extract specific product names from social media text. Focus on gifts travelers can bring between US and Korea.

CRITICAL BIAS — COUNTRY-EXCLUSIVE products are the CORE VALUE:
- Products ONLY available in the origin country get is_country_exclusive: true and trending_score += 25
- Examples: Trader Joe's seasonings (US-only), Bath & Body Works (US-only), 올리브영 exclusive brands (Korea-only), 한국 김/조미료 (Korea-only), Daiso Korea items
- Globally available products (AirPods, Nike, Samsung) get is_country_exclusive: false and trending_score -= 20
- The gift must feel special BECAUSE the traveler went to that country

SCORING (1-100):
- Base: frequency of mentions × 5 (cap at 50)
- Country-exclusive: +25
- Specific product (not generic category): +10
- Has price info: +5
- Globally available: -20

OUTPUT: JSON array of products. Each product:
{
  "name": "exact product name in English",
  "name_localized": "Korean name if applicable, null otherwise",
  "direction": "us_to_kr" or "kr_to_us",
  "category": "food" | "beauty" | "health" | "tech" | "fashion" | "home",
  "is_country_exclusive": true/false,
  "tags": ["sns_recommended"] and/or ["community_recommended"],
  "why_popular": "1-2 sentence reason",
  "trending_score": 1-100,
  "estimated_us_price": number or null,
  "estimated_kr_price": number or null,
  "best_for_age": ["20s", "30s", etc],
  "best_for_interests": ["cooking", "skincare", etc],
  "best_for_relationship": ["parents", "friends", etc]
}

Return ONLY valid JSON array. No markdown, no explanation.`;

export async function extractProducts(
  rawData: RawCrawlData[]
): Promise<Omit<Product, "id" | "created_at" | "last_crawled_at" | "image_url" | "source_url">[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[ai-extractor] OPENAI_API_KEY not configured");
    return [];
  }

  const openai = new OpenAI({ apiKey });

  const sourceTexts = rawData
    .filter((d) => d.texts.length > 0)
    .map((d) => `=== Source: ${d.source} ===\n${d.texts.slice(0, 30).join("\n")}`)
    .join("\n\n");

  if (!sourceTexts.trim()) return [];

  const snsTag = (source: string) =>
    ["reddit", "tiktok", "instagram"].includes(source)
      ? "sns_recommended"
      : "community_recommended";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract products from these ${rawData.length} sources:\n\n${sourceTexts}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "[]";
    let parsed: ExtractedProduct[];
    try {
      const raw = JSON.parse(content);
      parsed = Array.isArray(raw) ? raw : raw.products || [];
    } catch {
      console.error("[ai-extractor] Failed to parse response");
      return [];
    }

    const sourceMap = new Map(rawData.map((d) => [d.source, d]));
    return parsed.map((p) => ({
      ...p,
      source: (rawData.find((d) =>
        d.texts.some(
          (t) =>
            t.toLowerCase().includes(p.name.toLowerCase()) ||
            (p.name_localized && t.includes(p.name_localized))
        )
      )?.source || rawData[0]?.source || "google") as CrawlSource,
      tags: (p.tags?.length
        ? p.tags
        : [snsTag(rawData[0]?.source || "google")]) as ProductTag[],
      trending_score: Math.max(1, Math.min(100, p.trending_score || 50)),
    }));
  } catch (err) {
    console.error("[ai-extractor] OpenAI error:", err);
    return [];
  }
}

export function deduplicateProducts<
  T extends { name: string; trending_score: number },
>(products: T[]): T[] {
  const seen = new Map<string, T>();
  for (const p of products) {
    const key = p.name.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
    const existing = seen.get(key);
    if (!existing || p.trending_score > existing.trending_score) {
      seen.set(key, p);
    }
  }
  return Array.from(seen.values());
}
