import { NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

export const runtime = "nodejs";

type AddManagedOrderBody = {
  website: string;
  wp_login_url: string;
  payment_id?: string | null;
  /** Sent by the onboarding flow (useAddSite): orderData.favicon_file holds the
   *  Supabase storage path of the uploaded favicon (e.g. favicon-x.com.png). */
  orderData?: { favicon_file?: string | null };
};

/**
 * POST /api/orders/managed/add
 *
 * Creates a Managed WP order inside the onboarding steps flow.
 *
 * Payment is no longer required up front: the order is created first, and the
 * customer pays at the end of the setup flow (after plugin verification). The
 * paid entitlement is linked to this order -- and the order flipped to
 * order_status = true -- by the Stripe webhook / reconcile endpoint once
 * payment completes (see finalizePaidOrder in @/lib/entitlement).
 *
 * The order is therefore created UNPAID (order_status = false). Everything
 * that means "this site is live" reads that flag, so a site that is still
 * being connected stays out of the customer's site list, keeps the paid
 * dashboard sections locked (CrUX stays open), and never reaches the expert
 * queue until payment lands.
 *
 *  1. Creates an `orders` row for the site (product_type = "managed_wp").
 *  2. Creates a `wordpress_cred` row with the customer's WP site + login URL.
 *
 * Expert auto-assignment deliberately does NOT run here: an order only enters
 * the expert queue once it is paid and validated.
 *
 * Idempotent: if an order already exists for this site, just ensures the
 * wordpress_cred row exists and returns success.
 */
export async function POST(req: Request) {
  const { user, error: authError } = await getSupabaseServerUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Missing user authentication" }, { status: 401 });
  }

  const user_id = user.id;

  try {
    const {
      website,
      wp_login_url,
      payment_id,
      orderData,
    }: AddManagedOrderBody = await req.json().catch(() => ({}));

    if (!website || !wp_login_url) {
      return NextResponse.json(
        { error: "website and wp_login_url are required" },
        { status: 400 },
      );
    }

    // The favicon was already fetched + uploaded to storage by the client;
    // we only persist the resulting storage path on the orders row.
    const faviconFile =
      typeof orderData?.favicon_file === "string" &&
      orderData.favicon_file.trim()
        ? orderData.favicon_file.trim()
        : null;

    const websiteName = normalizeDomain(website);
    if (!websiteName) {
      return NextResponse.json(
        { error: "Please enter a valid domain (e.g. example.com)" },
        { status: 400 },
      );
    }

    const websiteAddress = `https://${websiteName}`;

    // Check if an order already exists for this site first — this catches
    // re-adds of the same site (and retries) before creating a duplicate.
    const { data: existingSite, error: siteError } = await worker
      .from("orders")
      .select("*")
      .eq("user_id", user_id)
      .eq("website_name", websiteName)
      .maybeSingle();

    if (siteError) {
      return NextResponse.json(
        { error: "Error checking existing site" },
        { status: 500 },
      );
    }

    if (existingSite) {
      // The order exists, but its credential row may not (a failed first
      // attempt, or a manual data reset). Now that order_id is unique the
      // upsert is idempotent, so ensure the cred row before answering 409.
      const { error: credError } = await worker.from("wordpress_cred").upsert(
        {
          order_id: existingSite.order_id,
          payment_id: payment_id ?? null,
          wp_address: websiteAddress,
          wp_login_url,
        },
        { onConflict: "order_id" },
      );

      if (credError) {
        return NextResponse.json(
          {
            error: "Failed to store WordPress credentials",
            details: credError.message,
          },
          { status: 500 },
        );
      }

      // Orders created before favicon storage existed have favicon_file =
      // null even though the file may already sit in the bucket: backfill it
      // when the client re-sends an uploaded path.
      if (!existingSite.favicon_file && faviconFile) {
        await worker
          .from("orders")
          .update({ favicon_file: faviconFile })
          .eq("order_id", existingSite.order_id);
      }

      return NextResponse.json(
        {
          message: `${websiteName} already exists.`,
          order: {
            ...existingSite,
            favicon_file: existingSite.favicon_file ?? faviconFile,
          },
        },
        { status: 409 },
      );
    }

    let insertedOrder: any = existingSite;

    if (!existingSite) {
      // 1. Create the orders row UNPAID. No entitlement check — payment
      //    happens at the end of the setup flow, not up front — and
      //    order_status stays false until the Stripe webhook / reconcile
      //    endpoint flips it (finalizePaidOrder), which is what unlocks the
      //    site everywhere else in the product.
      const { data: newOrder, error: insertError, status: insertStatus } =
        await worker
          .from("orders")
          .insert({
            website_name: websiteName,
            website_address: websiteAddress,
            favicon_file: faviconFile,
            order_status: false,
            user_id,
            product_type: "managed_wp",
          })
          .select("*")
          .single();

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to insert order data", details: insertError.message },
          { status: insertStatus ?? 500 },
        );
      }

      insertedOrder = newOrder;
    }

    // 2. Create (or update) the wordpress_cred row.
    const { error: credError } = await worker.from("wordpress_cred").upsert(
      {
        order_id: insertedOrder.order_id,
        payment_id: payment_id ?? null,
        wp_address: websiteAddress,
        wp_login_url,
      },
      { onConflict: "order_id" },
    );

    if (credError) {
      return NextResponse.json(
        { error: "Failed to store WordPress credentials", details: credError.message },
        { status: 500 },
      );
    }

    // 3. No auto-assignment here: the order is unpaid. Assignment is triggered
    //    by the Stripe webhook / reconcile endpoint once payment completes
    //    (finalizePaidOrder), which is when the order becomes real work.

    return NextResponse.json(
      {
        message: existingSite
          ? "Site order already existed; credentials updated."
          : "Managed WP order created successfully",
        order: insertedOrder,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
