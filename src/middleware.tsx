import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isDashboard = pathname.startsWith("/dashboard");
  const isSignIn = pathname.startsWith("/sign-in");
  const isAuthCallback = pathname.startsWith("/sign-in/auth/callback");

  const token = req.cookies.get("sb-access-token")?.value;

  // If no token and trying to access dashboard, redirect to sign-in
  if (!token && isDashboard && !isAuthCallback) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // If token exists and trying to access sign-in, redirect to dashboard
  if (token && isSignIn && !isAuthCallback) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in/:path*"],
};
