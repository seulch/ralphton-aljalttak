import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { generateShareToken } from "@/lib/utils";
import type { Direction } from "@/types/database";

export async function GET(request: NextRequest) {
  const anonymousId = request.nextUrl.searchParams.get("anonymousId");
  if (!anonymousId) {
    return NextResponse.json(
      { success: false, error: "anonymousId required" },
      { status: 400 }
    );
  }

  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("*, shopping_list_items(*, products(*, prices:product_prices(*)))")
    .eq("anonymous_id", anonymousId)
    .order("updated_at", { ascending: false });

  return NextResponse.json({ success: true, data: lists || [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: string;
      anonymousId: string;
      direction?: Direction;
      productId?: string;
      listId?: string;
      itemId?: string;
      quantity?: number;
      checked?: boolean;
    };

    const { action, anonymousId } = body;

    if (action === "create-list") {
      const { data, error } = await supabase
        .from("shopping_lists")
        .insert({
          anonymous_id: anonymousId,
          share_token: generateShareToken(),
          direction: body.direction || "us_to_kr",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data });
    }

    if (action === "add-item") {
      // Find or create list for this direction
      let listId = body.listId;
      if (!listId) {
        const { data: existing } = await supabase
          .from("shopping_lists")
          .select("id")
          .eq("anonymous_id", anonymousId)
          .limit(1)
          .single();

        if (existing) {
          listId = existing.id;
        } else {
          const { data: newList } = await supabase
            .from("shopping_lists")
            .insert({
              anonymous_id: anonymousId,
              share_token: generateShareToken(),
              direction: body.direction || "us_to_kr",
            })
            .select("id")
            .single();
          listId = newList?.id;
        }
      }

      if (!listId) {
        return NextResponse.json({ success: false, error: "Could not find or create list" }, { status: 500 });
      }

      const { data, error } = await supabase
        .from("shopping_list_items")
        .insert({
          list_id: listId,
          product_id: body.productId,
          quantity: body.quantity || 1,
        })
        .select()
        .single();

      // Update list timestamp
      await supabase
        .from("shopping_lists")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data });
    }

    if (action === "update-item") {
      const updates: Record<string, unknown> = {};
      if (body.quantity !== undefined) updates.quantity = body.quantity;
      if (body.checked !== undefined) updates.checked = body.checked;

      const { error } = await supabase
        .from("shopping_list_items")
        .update(updates)
        .eq("id", body.itemId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "remove-item") {
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("id", body.itemId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "List operation failed" },
      { status: 500 }
    );
  }
}
