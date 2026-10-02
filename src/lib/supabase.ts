import "server-only";
import { createClient } from "@supabase/supabase-js";

// Read-only access with the publishable (anon) key. Server-side only: the env vars
// deliberately have no NEXT_PUBLIC_ prefix, so neither value reaches the browser.
export function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
