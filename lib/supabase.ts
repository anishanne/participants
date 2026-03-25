import { createClient } from "@supabase/supabase-js";
import type { StudentScheduleOverrides } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
}

/**
 * Fetch personalized schedule overrides for a student from Supabase.
 * Returns null if Supabase is not configured or the query fails.
 * The result is a single-student overrides record: { [slotId]: { title?, location? } }
 */
export async function fetchStudentOverrides(
  studentId: string
): Promise<Record<string, { title?: string; location?: string }> | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("student_schedule_overrides")
      .select("schedule_slot_id, replacement_title, replacement_location")
      .eq("student_id", studentId);

    if (error || !data || data.length === 0) return null;

    const overrides: Record<string, { title?: string; location?: string }> = {};

    for (const row of data) {
      // schedule_slot_id is UUID in Supabase; we need to map it to our local slot id.
      // The local schedule uses slug-based ids. Query the slot to get its slug.
      overrides[row.schedule_slot_id] = {
        title: row.replacement_title || undefined,
        location: row.replacement_location || undefined
      };
    }

    return overrides;
  } catch {
    return null;
  }
}

/**
 * Try to load overrides for a student: Supabase first, then fall back to local data.
 */
export async function loadStudentOverrides(
  studentId: string,
  localOverrides: StudentScheduleOverrides
): Promise<Record<string, { title?: string; location?: string }>> {
  // Try Supabase
  const remote = await fetchStudentOverrides(studentId);
  if (remote) return remote;

  // Fall back to local/demo data
  return localOverrides[studentId] ?? {};
}
