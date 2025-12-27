import { setupDB } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/serverSupabase";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  site: string;
}

export async function POST(req: NextRequest) {
  const { site }: Props = await req.json();
  const user = await getServerSupabase();

  if (!user.user?.id) {
    return NextResponse.json(
      { message: "User authentication failed", isConnectionAvailable: false },
      { status: 401 },
    );
  }

  if (!site) {
    return NextResponse.json(
      { message: "Bad request", isConnectionAvailable: false },
      { status: 404 },
    );
  }

  const { data: siteData, error: siteError } = await worker
    .from("orders")
    .select("order_id")
    .eq("website_name", site)
    .maybeSingle();

  if (siteError || !siteData?.order_id) {
    return NextResponse.json(
      {
        message: "Unable to find the website in database",
        isConnectionAvailable: false,
      },
      { status: 500 },
    );
  }

  // now check for the cloudflare connection
  const { data, error } = await worker
    .from("cloudflare_auth")
    .select("token")
    .eq("user_id", user.user?.id)
    .eq("site_id", siteData?.order_id)
    .maybeSingle();

  if (error || !data?.token) {
    return NextResponse.json(
      {
        message: "Token not found for the site",
        isConnectionAvailable: false,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      message: "Token found for the site",
      isConnectionAvailable: true,
    },
    { status: 200 },
  );
}
