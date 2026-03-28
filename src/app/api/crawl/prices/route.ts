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
    // Process in batches of 5 with delay to prevent resource exhaustion
    for (let i = 0; i < topProducts.length; i++) {
      const product = topProducts[i];
      try {
        pricesInserted += await refreshProductPrices(product.id, product.name, "us");
        pricesInserted += await refreshProductPrices(product.id, product.name, "kr");
      } catch {
        // Continue with next product
      }
      // Small delay every 5 products to prevent server overload
      if ((i + 1) % 5 === 0 && i < topProducts.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
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
