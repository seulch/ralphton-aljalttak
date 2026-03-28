import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { runPhase1Pipeline, checkCrawlCooldown } from "@/lib/crawlers/pipeline";
import { refreshProductPrices } from "@/lib/price-lookup";

export async function POST() {
  const cooldown = await checkCrawlCooldown();
  if (!cooldown.canCrawl) {
    return NextResponse.json(
      { success: false, error: cooldown.reason },
      { status: 429 }
    );
  }

  // Log pipeline run
  const { data: pipelineRun } = await supabase
    .from("crawl_runs")
    .insert({ source: "pipeline", phase: "pipeline" as const, status: "running" as const })
    .select("id")
    .single();

  try {
    // Phase 1: crawl + extract
    const productsStored = await runPhase1Pipeline();

    // Phase 2: price lookup for top 20
    const { data: topProducts } = await supabase
      .from("products")
      .select("id, name")
      .order("trending_score", { ascending: false })
      .limit(20);

    let pricesUpdated = 0;
    if (topProducts) {
      for (const product of topProducts) {
        try {
          pricesUpdated += await refreshProductPrices(product.id, product.name, "us");
          pricesUpdated += await refreshProductPrices(product.id, product.name, "kr");
        } catch {
          // Continue with other products
        }
      }
    }

    if (pipelineRun) {
      await supabase
        .from("crawl_runs")
        .update({
          status: "completed",
          items_found: productsStored,
          completed_at: new Date().toISOString(),
        })
        .eq("id", pipelineRun.id);
    }

    return NextResponse.json({
      success: true,
      data: { productsStored, pricesUpdated },
    });
  } catch (err) {
    if (pipelineRun) {
      await supabase
        .from("crawl_runs")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          completed_at: new Date().toISOString(),
        })
        .eq("id", pipelineRun.id);
    }

    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
