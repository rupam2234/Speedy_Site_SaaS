import { setupDB } from "@/lib/db";
import { createRouteSupabaseClient } from "@/lib/db/server";
import { NextRequest, NextResponse } from "next/server";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

interface Props {
  domain: string;
}

export async function POST(req: NextRequest) {

  const res = NextResponse.next();
  const supabase = createRouteSupabaseClient(req, res);

  const { domain }: Props = await req.json();
  const normalized = normalizeDomain(domain);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  if (!normalized) {
    return NextResponse.json(
      { message: "Bad request" },
      { status: 400 }
    );
  }

  try {

    // validate the domain for user — try raw domain first (orders created by
    // newOrder/route.ts store website_name without normalization), then
    // normalized (orders created by managed/add normalize it).
    let verifiedDomain = null;
    let validationError = null;

    const { data: rawResult, error: rawError } = await worker
      .from("orders")
      .select("website_name, order_id")
      .eq("website_name", domain)
      .eq("user_id", user.id)
      .maybeSingle();

    if (rawResult) {
      verifiedDomain = rawResult;
    } else if (normalized !== domain) {
      const { data: normResult, error: normError } = await worker
        .from("orders")
        .select("website_name, order_id")
        .eq("website_name", normalized)
        .eq("user_id", user.id)
        .maybeSingle();

      if (normResult) {
        verifiedDomain = normResult;
      } else {
        validationError = normError || rawError;
      }
    } else {
      validationError = rawError;
    }

    if (validationError || !verifiedDomain) {
      throw new Error(validationError?.message || "Unauthorised");
    }

    // then delete the site
    const { error } = await worker
      .from("orders")
      .delete()
      .eq("website_name", verifiedDomain.website_name);

    if (error) {
      throw new Error(error.message);
    }

    // Detach any user_service linked to the deleted site: frees the free-tier
    // slot and removes the dangling managed_wp reference
    if (verifiedDomain.order_id) {
      await worker
        .from("user_services")
        .update({
          order_id: null,
          website_name: null,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", verifiedDomain.order_id);
    }

    // Drop the per-domain plugin signature so a freshly re-added site can't
    // inherit a stale verified state from the deleted order's wp_key row.
    // wp_key.domain is always stored normalized, so normalize the order's
    // website_name before matching.
    await worker
      .from("wp_key")
      .delete()
      .eq("domain", normalizeDomain(verifiedDomain.website_name));

    return NextResponse.json({ message: "website deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error deleting website" },
      { status: 500 }
    );
  }
}
