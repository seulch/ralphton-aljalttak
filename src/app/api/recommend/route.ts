import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase/client";
import { getCachedPrices } from "@/lib/price-lookup";
import type { Product, ProductWithPrices, RecommendationRequest } from "@/types/database";

const SYSTEM_PROMPT = `You are a gift recommendation AI for cross-border US ↔ Korea travelers.

CRITICAL: PRIORITIZE country-exclusive products. A Trader Joe's seasoning you can ONLY buy in the US is infinitely more valuable as a gift than AirPods which anyone can order online. The gift must feel special BECAUSE the traveler went to that country.

Given a list of products and a recipient profile, return:
1. "recommendations": top 10-15 products from the list, ranked by fit. For each, add "ai_reason" explaining why it's a good gift FROM that country for this person.
2. "aiSuggestions": 3-5 additional country-exclusive products NOT in the list that would be great gifts.

Each aiSuggestion needs: name, name_localized, direction, category, is_country_exclusive (must be true), why_popular, trending_score, ai_reason, estimated_us_price or estimated_kr_price.

Return valid JSON only. No markdown.`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecommendationRequest;
    const { direction, age, gender, relationship, freeText } = body;

    if (!direction) {
      return NextResponse.json(
        { success: false, error: "direction is required" },
        { status: 400 }
      );
    }

    // Fetch products from DB
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("direction", direction)
      .order("trending_score", { ascending: false })
      .limit(50);

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          aiSuggestions: [],
          meta: { totalProducts: 0, direction, personalized: false },
        },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: return products sorted by score with prices
      const withPrices = await attachPrices(products as Product[]);
      return NextResponse.json({
        success: true,
        data: {
          recommendations: withPrices,
          aiSuggestions: [],
          meta: { totalProducts: products.length, direction, personalized: false },
        },
      });
    }

    const openai = new OpenAI({ apiKey });

    const profileDesc = [
      age && `Age: ${age}`,
      gender && `Gender: ${gender}`,
      relationship && `Relationship: ${relationship}`,
      freeText && `About them: ${freeText}`,
    ]
      .filter(Boolean)
      .join(", ");

    const productList = products
      .map(
        (p: Record<string, unknown>) =>
          `- ${p.name} (${p.name_localized || ""}) [${p.category}] score:${p.trending_score} exclusive:${p.is_country_exclusive} tags:${(p.tags as string[])?.join(",") || ""} why:${p.why_popular}`
      )
      .join("\n");

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Direction: ${direction}\nRecipient: ${profileDesc || "No specific profile"}\n\nProducts:\n${productList}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content) as {
        recommendations?: Array<{ name: string; ai_reason: string }>;
        aiSuggestions?: Array<Record<string, unknown>>;
      };

      // Map AI recommendations back to full product data
      const recNames = new Set(
        (parsed.recommendations || []).map((r) => r.name.toLowerCase())
      );
      const reasonMap = new Map(
        (parsed.recommendations || []).map((r) => [
          r.name.toLowerCase(),
          r.ai_reason,
        ])
      );

      const ordered = (products as Product[]).sort((a, b) => {
        const aRec = recNames.has(a.name.toLowerCase()) ? 0 : 1;
        const bRec = recNames.has(b.name.toLowerCase()) ? 0 : 1;
        if (aRec !== bRec) return aRec - bRec;
        return b.trending_score - a.trending_score;
      });

      const withPrices = await attachPrices(ordered);
      const recommendations = withPrices.map((p) => ({
        ...p,
        ai_reason:
          reasonMap.get(p.name.toLowerCase()) ||
          p.why_popular ||
          "Great gift choice!",
      }));

      const aiSuggestions: ProductWithPrices[] = (
        parsed.aiSuggestions || []
      ).map((s) => ({
        id: crypto.randomUUID(),
        name: (s.name as string) || "",
        name_localized: (s.name_localized as string) || null,
        direction,
        category: (s.category as Product["category"]) || "food",
        estimated_us_price: (s.estimated_us_price as number) || null,
        estimated_kr_price: (s.estimated_kr_price as number) || null,
        is_country_exclusive: true,
        tags: ["community_recommended" as const],
        why_popular: (s.why_popular as string) || "",
        trending_score: (s.trending_score as number) || 70,
        source: "google" as const,
        source_url: null,
        best_for_age: [],
        best_for_interests: [],
        best_for_relationship: [],
        image_url: null,
        last_crawled_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        prices: [],
        ai_reason: (s.ai_reason as string) || (s.why_popular as string) || "",
      }));

      return NextResponse.json({
        success: true,
        data: {
          recommendations,
          aiSuggestions,
          meta: {
            totalProducts: products.length,
            direction,
            personalized: !!profileDesc,
          },
        },
      });
    } catch {
      // OpenAI failed — fallback
      const withPrices = await attachPrices(products as Product[]);
      return NextResponse.json({
        success: true,
        data: {
          recommendations: withPrices,
          aiSuggestions: [],
          meta: { totalProducts: products.length, direction, personalized: false },
        },
      });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Recommendation failed" },
      { status: 500 }
    );
  }
}

async function attachPrices(products: Product[]): Promise<ProductWithPrices[]> {
  const result: ProductWithPrices[] = [];
  for (const p of products) {
    const prices = await getCachedPrices(p.id);
    result.push({ ...p, prices });
  }
  return result;
}
