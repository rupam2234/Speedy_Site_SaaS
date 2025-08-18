import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code }: any = await request.json();

    console.log(code);

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const ANON_KEY = process.env.SUPABASE_ANON_KEY!;
    const REDIRECT_URI = "http://localhost:3000/auth/callback"; // your actual redirect URI

    const tokenUrl = `${SUPABASE_URL}/auth/v1/token`;

    // Here's your fetch call where you add the apikey header:
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`, // service role key in Authorization header
        apikey: ANON_KEY, // add anon key here
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Supabase token exchange error:", errorText);
      return NextResponse.json(
        { error: `Failed to exchange code: ${errorText}` },
        { status: 500 }
      );
    }

    const tokens = await tokenRes.json();
    return NextResponse.json(tokens, { status: 200 });
  } catch (error) {
    console.error("Exchange error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
