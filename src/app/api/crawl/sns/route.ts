import { NextResponse } from "next/server";
import { runSnsCrawlers } from "@/lib/crawlers/pipeline";

export async function POST() {
  try {
    const data = await runSnsCrawlers();
    return NextResponse.json({
      success: true,
      data: data.map((d) => ({
        source: d.source,
        textsCount: d.texts.length,
        urlsCount: d.urls.length,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "SNS crawl failed" },
      { status: 500 }
    );
  }
}
