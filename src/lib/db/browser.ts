import { createBrowserClient } from "@supabase/ssr";

// Build-safe fallbacks: prerendering imports this module without env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://build-placeholder.supabase.co";
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "build-placeholder";

// mainly using this on authentication and auth provider
export const browserClient = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey
);
