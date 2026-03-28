import { NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/utils";

export async function GET() {
  try {
    const rate = await getExchangeRate();
    return NextResponse.json({ success: true, data: { rate, currency: "KRW" } });
  } catch {
    return NextResponse.json({ success: true, data: { rate: 1350, currency: "KRW" } });
  }
}
