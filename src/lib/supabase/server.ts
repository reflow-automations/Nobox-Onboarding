import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Server-side Supabase client met service-role key.
 *
 * BELANGRIJK: deze client bypasst RLS. NOOIT importeren in client components.
 * Alleen gebruiken in API routes (/api/*) of server components.
 *
 * Env vars (server-only):
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (NIET de anon key)
 */
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
