import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { FALLBACK_PRODUCTS } from "@/data/fallback-products";
import type { Direction } from "@/types/database";

export async function GET(request: NextRequest) {
  const direction = request.nextUrl.searchParams.get("direction") as Direction | null;

  // Check count — insert fallback if < 10
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (count !== null && count < 10) {
    for (const product of FALLBACK_PRODUCTS) {
      await supabase.from("products").upsert(
        {
          ...product,
          last_crawled_at: new Date().toISOString(),
        },
        { onConflict: "name,direction" }
      );
    }
  }

  let query = supabase
    .from("products")
    .select("*")
    .order("trending_score", { ascending: false });

  if (direction) {
    query = query.eq("direction", direction);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data || [] });
}
