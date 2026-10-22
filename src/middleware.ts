import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient } from "./lib/db/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  const isDashboard = pathname.startsWith("/dashboard");
  const isSignIn = pathname.startsWith("/sign-in");

  const supabase = createRouteSupabaseClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // if the user is a service expert then we display dashboard with expert centric UI

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (user && isSignIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in/:path*"],
};
