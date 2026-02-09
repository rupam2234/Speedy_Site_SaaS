import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GetServerSupabase() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side secret key
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value;
        },
        async set(name: string, value: string, options?: any) {
          (await cookieStore).set({ name, value, ...options });
        },
        async remove(name: string, options?: any) {
          (await cookieStore).delete({ name, ...options });
        },
      },
    }
  );

  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData.user) {
    return { supabase, user: null, error: error?.message || "Unauthorized" };
  }

  return { supabase, user: authData.user, error: null };
}
