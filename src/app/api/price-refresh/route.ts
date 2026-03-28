import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { refreshProductPrices, getCachedPrices } from "@/lib/price-lookup";
import type { Country } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productId?: string;
      productName?: string;
      country?: Country;
    };

    const { productId, productName, country } = body;
    if (!productId || !productName || !country) {
      return NextResponse.json(
        { success: false, error: "productId, productName, and country required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await getCachedPrices(productId);
    const countryPrices = cached.filter((p) => p.country === country);
    if (countryPrices.length > 0) {
      return NextResponse.json({ success: true, data: countryPrices });
    }

    // Fetch fresh
    await refreshProductPrices(productId, productName, country);
    const fresh = await getCachedPrices(productId);

    // Fallback to estimated prices
    if (fresh.length === 0) {
      const { data: product } = await supabase
        .from("products")
        .select("estimated_us_price, estimated_kr_price")
        .eq("id", productId)
        .single();

      if (product) {
        const estPrice =
          country === "us"
            ? product.estimated_us_price
            : product.estimated_kr_price;
        if (estPrice) {
          return NextResponse.json({
            success: true,
            data: [
              {
                store_name: "Estimated",
                price: estPrice,
                currency: country === "us" ? "USD" : "KRW",
                product_link: "#",
                rank: 1,
              },
            ],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: fresh.filter((p) => p.country === country),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Price refresh failed" },
      { status: 500 }
    );
  }
}
