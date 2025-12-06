import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "./lib/db/server_client";
import { SignJWT, jwtVerify } from "jose";

const USER_COOKIE_NAME = "user_cache";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-change-me";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  const isAuthCallback =
    pathname === "/sign-in/auth/callback" ||
    pathname.startsWith("/sign-in/auth/callback");

  const isDashboard = pathname.startsWith("/dashboard");
  const isSignIn = pathname.startsWith("/sign-in");

  let user: any = null;
  const cookieValue = req.cookies.get(USER_COOKIE_NAME)?.value;

  // Try reading signed JWT from cookie
  if (cookieValue) {
    try {
      const { payload } = await jwtVerify(
        cookieValue,
        new TextEncoder().encode(JWT_SECRET),
      );
      user = payload;
    } catch {
      user = null; // Invalid or expired JWT
    }
  }

  // If no valid user, fetch from Supabase
  if (!user && (isDashboard || isSignIn)) {
    const supabase = serverClient(req, res);
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (supabaseUser) {
      user = { id: supabaseUser.id, email: supabaseUser.email }; // minimal info

      // Sign JWT and set as cookie
      const token = await new SignJWT(user)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(JWT_SECRET));

      res.cookies.set(USER_COOKIE_NAME, token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60, // 1 hour
        sameSite: "lax",
      });
    }
  }

  // Handle redirects
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
