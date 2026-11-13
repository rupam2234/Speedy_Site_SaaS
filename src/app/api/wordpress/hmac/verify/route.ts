import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";
import { verifySignature } from "@/lib/wordpress/hmac";

const worker = setupDB();

// Verifies the signature the plugin emitted (tour step 4).
export async function POST(req: NextRequest) {
  const { user, error } = await getSupabaseServerUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { domain, signature }: { domain?: string; signature?: string } =
      await req.json();
    const normalized = normalizeDomain(domain);

    if (!normalized || !signature) {
      return NextResponse.json(
        { error: "domain and signature are required" },
        { status: 400 },
      );
    }

    const { data: order } = await worker
      .from("orders")
      .select("website_name")
      .eq("user_id", user.id)
      .eq("website_name", normalized)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { error: "Connect this site to your account first" },
        { status: 403 },
      );
    }

    const result = await verifySignature(normalized, signature);
    if (!result.verified) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to verify signature", message: err?.message },
      { status: 500 },
    );
  }
}
