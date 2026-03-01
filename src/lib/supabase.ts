// ============================================================
// luna Brain — Supabase Client
// ============================================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client-side (browser) — uses anon key, respects RLS
export function createBrowserClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server-side (API routes, server components) — uses service role key, bypasses RLS
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Default export for convenience in API routes
export const supabase = createServerClient;
