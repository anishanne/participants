import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("schedule_slots")
    .select("*")
    .order("sort_order");

  if (error) return NextResponse.json([], { status: 500 });

  return NextResponse.json(data ?? []);
}
