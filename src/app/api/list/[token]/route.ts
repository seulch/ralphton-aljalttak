import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: list } = await supabase
    .from("shopping_lists")
    .select("*, shopping_list_items(*, products(*))")
    .eq("share_token", token)
    .single();

  if (!list) {
    return NextResponse.json(
      { success: false, error: "List not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: list });
}
