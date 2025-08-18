// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "./lib/db/server_client";

export async function middleware(req: NextRequest) {
  const { supabase, res } = serverClient(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  const isAuthCallback =
    pathname === "/sign-in/auth/callback" ||
    pathname.startsWith("/sign-in/auth/callback");

  const isDashboard = pathname.startsWith("/dashboard");
  const isSignIn = pathname.startsWith("/sign-in");

  if (!user && isDashboard && !isAuthCallback) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (user && isSignIn && !isAuthCallback) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in/:path*"],
};
