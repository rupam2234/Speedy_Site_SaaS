import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient } from "./lib/db/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  const isDashboard = pathname.startsWith("/dashboard");
  const isSignIn = pathname.startsWith("/sign-in");
  const isAdmin = pathname.startsWith("/dashboard/admin");

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

  // experts never reach the admin console; admins only
  if (user && isAdmin) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in/:path*"],
};

