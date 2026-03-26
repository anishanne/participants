import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 * Bypasses RLS — use only in API routes and server components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabase(): SupabaseClient<any> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    console.warn("getSupabase: SUPABASE_SERVICE_KEY not set, falling back to anon key");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
  }

  return createClient(url, serviceKey);
}
