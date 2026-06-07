import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { supabasePublishableKey, supabaseUrl } from ".";
import { cookies } from "next/headers";

export function createRouteSupabaseClient(
  req: NextRequest,
  res: NextResponse
) {
  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        get: (name: string) =>
          req.cookies.get(name)?.value ?? null,

        set: (name: string, value: string, options: any) =>
          res.cookies.set(name, value, options),

        remove: (name: string, options: any) =>
          res.cookies.set(name, "", { ...options, maxAge: -1 }),
      },
    }
  );
}

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        get: async (name: string) =>
          (await cookieStore).get(name)?.value ?? null,

        set: async (name: string, value: string, options: any) =>
          (await cookieStore).set({ name, value, ...options }),

        remove: async (name: string, options: any) =>
          (await cookieStore).delete({ name, ...options }),
      },
    }
  );
}