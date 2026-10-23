import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient } from "./lib/db/server";
import { createClient } from "@supabase/supabase-js";

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isSignIn = pathname.startsWith("/sign-in");

  const res = NextResponse.next();
  const supabase = createRouteSupabaseClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (user && isSignIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (user && isDashboard) {
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? "user";

    // Strip legacy /admin or /expert prefixes from browser URL if entered directly
    if (pathname.startsWith("/dashboard/admin/") || pathname === "/dashboard/admin") {
      const cleanPath = pathname.replace(/^\/dashboard\/admin/, "/dashboard") || "/dashboard";
      return NextResponse.redirect(new URL(cleanPath, req.url));
    }
    if (pathname.startsWith("/dashboard/expert/") || pathname === "/dashboard/expert") {
      const cleanPath = pathname.replace(/^\/dashboard\/expert/, "/dashboard") || "/dashboard";
      return NextResponse.redirect(new URL(cleanPath, req.url));
    }

    // Role-based internal routing (URL in browser stays clean as /dashboard, /dashboard/orders, etc.)
    if (role === "admin") {
      if (pathname === "/dashboard") {
        return NextResponse.rewrite(new URL("/dashboard/admin", req.url));
      }
      if (pathname === "/dashboard/orders") {
        return NextResponse.rewrite(new URL("/dashboard/admin/orders", req.url));
      }
      if (pathname === "/dashboard/queue") {
        return NextResponse.rewrite(new URL("/dashboard/admin/queue", req.url));
      }
      if (pathname === "/dashboard/experts") {
        return NextResponse.rewrite(new URL("/dashboard/admin/experts", req.url));
      }
      if (pathname === "/dashboard/tickets") {
        return NextResponse.rewrite(new URL("/dashboard/admin/tickets", req.url));
      }
    } else if (role === "expert") {
      if (pathname === "/dashboard" || pathname === "/dashboard/orders") {
        return NextResponse.rewrite(new URL("/dashboard/expert/orders", req.url));
      }
      if (pathname === "/dashboard/tickets") {
        return NextResponse.rewrite(new URL("/account/tickets", req.url));
      }
      // Experts cannot access admin queue or expert pool management
      if (pathname === "/dashboard/queue" || pathname === "/dashboard/experts") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else {
      // Normal user (customer)
      if (pathname === "/dashboard/tickets") {
        return NextResponse.rewrite(new URL("/account/tickets", req.url));
      }
      if (
        pathname === "/dashboard/orders" ||
        pathname === "/dashboard/queue" ||
        pathname === "/dashboard/experts"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in/:path*"],
};
