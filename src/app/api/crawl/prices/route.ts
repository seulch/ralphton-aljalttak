import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { refreshProductPrices } from "@/lib/price-lookup";

export async function POST() {
  try {
    const { data: topProducts } = await supabase
      .from("products")
      .select("id, name")
      .order("trending_score", { ascending: false })
      .limit(20);

    if (!topProducts || topProducts.length === 0) {
      return NextResponse.json({
        success: true,
        data: { updated: 0, message: "No products to price" },
      });
    }

    let pricesInserted = 0;
    for (const product of topProducts) {
      try {
        pricesInserted += await refreshProductPrices(product.id, product.name, "us");
        pricesInserted += await refreshProductPrices(product.id, product.name, "kr");
      } catch {
        // Continue
      }
    }

    return NextResponse.json({ success: true, data: { updated: pricesInserted } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Price refresh failed" },
      { status: 500 }
    );
  }
}
