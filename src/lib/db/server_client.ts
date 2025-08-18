// import { createServerClient } from "@supabase/ssr";
// import type { NextRequest } from "next/server";
// import type { NextResponse } from "next/server";

// export function serverClient(req: NextRequest, res: NextResponse) {
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name: string) {
//           return req.cookies.get(name)?.value ?? null;
//         },
//         set(name: string, value: string, options: any) {
//           res.cookies.set(name, value, options);
//         },
//         remove(name: string, options: any) {
//           res.cookies.set(name, "", { ...options, maxAge: -1 });
//         },
//       },
//     }
//   );
// }

export const runtime = "nodejs";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export function serverClient(req: NextRequest) {
  const res = new NextResponse(); // new response to attach cookies if needed

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value ?? null;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: -1 });
        },
      },
    }
  );

  return { supabase, res };
}
