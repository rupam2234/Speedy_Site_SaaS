import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  user_id: string;
  site_id: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { site_id, user_id }: Props = await req.json();

  if (!user_id) {
    return NextResponse.json(
      { found: false, message: "User unauthorized" },
      { status: 401 },
    );
  }

  const { data, error } = await worker
    .from("cloudflare_auth")
    .select("token")
    .eq("site_id", site_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ found: false }, { status: 500 });
  }

  if (!data?.token) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json({ found: true }, { status: 200 }); // pass valid as true or 200 status code when we find a token for the site
}
