import { NextResponse, after } from "next/server";
import Stripe from "stripe";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import {
  finalizePaidOrder,
  provisionEntitlement,
  resolvePlan,
} from "@/lib/entitlement";
import { runAutoAssignmentIfEnabled } from "@/lib/services/assignmentService";
import { MANAGED_WP_PRICE_ID } from "@/lib/products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "build-placeholder"); // build-safe

// The sessionless scan only looks at very recent checkouts: it exists to catch
// a customer who *just* paid and came back, so an old session (a different
// product, a closed tab from last month) must never grant an entitlement.
const SCAN_WINDOW_SECONDS = 30 * 60;

/**
 * Provisions the entitlement for a payment that already succeeded but whose
 * webhook never landed -- local dev without `stripe listen`, a rejected
 * delivery, or a handler that failed after the money had already moved.
 *
 * Security: the session is always verified against Stripe before anything is
 * written. It must be **paid**, its `client_reference_id` must be the signed-in
 * user, and it must have charged the managed_wp price, so this can only ever
 * grant an entitlement that user actually bought. It is idempotent, so calling
 * it repeatedly is safe.
 *
 * Returns the account's freshly resolved plan so the caller can update the UI
 * immediately, without waiting for the client-side plan cache to expire.
 *
 * It also performs the webhook's order finalization (bind the entitlement to
 * the pending order, flip it to paid) so a payment whose webhook never landed
 * still completes the site instead of leaving it stuck at the pay step.
 */
export async function POST(req: Request) {
  const { user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // What a managed_wp payment actually costs, so a session for another
    // product (or an old price) is rejected instead of granting entitlement.
    let expectedAmount: number | null = null;
    if (MANAGED_WP_PRICE_ID) {
      const price = await stripe.prices.retrieve(MANAGED_WP_PRICE_ID);
      expectedAmount = price.unit_amount ?? null;
    }

    const {
      sessionId,
    }: { sessionId?: string | null } = await req.json().catch(() => ({}));

    let provisioned = false;
    let reason = "nothing-to-do";
    // The paid session whose entitlement/order link we must converge on. Kept
    // even when the entitlement already existed ("exists"), because the order
    // side of the link can still be missing (webhook died midway) and
    // finalizePaidOrder heals it.
    let paidSession: { id: string; metadata?: Record<string, any> } | null =
      null;

    // Precise path: the Stripe redirect carries the session id.
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const paid = session.payment_status === "paid";
      const ours = session.client_reference_id === user.id;

      if (!paid || !ours) {
        return NextResponse.json(
          { error: "Session is not a paid checkout of this account" },
          { status: 403 },
        );
      }

      paidSession = { id: session.id, metadata: session.metadata ?? undefined };
      const result = await provisionEntitlement(session, expectedAmount);
      provisioned = result.provisioned;
      reason = result.reason;
    } else {
      // Best-effort path: the customer came back without the redirect URL
      // (browser closed right after paying). Look through this account's very
      // recent sessions for a paid one that still has no entitlement.
      const { data: sessions } = await stripe.checkout.sessions.list({
        limit: 100,
      });

      const cutoff = Math.floor(Date.now() / 1000) - SCAN_WINDOW_SECONDS;

      const mine = sessions
        .filter(
          (s) =>
            s.client_reference_id === user.id &&
            s.payment_status === "paid" &&
            s.created >= cutoff,
        )
        .sort((a, b) => b.created - a.created);

      for (const session of mine) {
        paidSession = { id: session.id, metadata: session.metadata ?? undefined };
        const result = await provisionEntitlement(session, expectedAmount);
        if (result.provisioned) {
          provisioned = true;
          reason = result.reason;
          break;
        }
      }
    }

    // Same finalization the webhook performs: bind the entitlement to the
    // pending order and flip that order to paid. No-op without order metadata.
    if (paidSession) {
      const { orderId } = await finalizePaidOrder(paidSession);
      if (orderId) {
        after(async () => {
          try {
            await runAutoAssignmentIfEnabled(orderId);
          } catch (bgError) {
            console.error(
              `Background auto-assignment failed for order ${orderId}:`,
              bgError,
            );
          }
        });
      }
    }

    const plan = await resolvePlan(user.id);

    return NextResponse.json(
      { provisioned, reason, plan: plan.plan, expiresAt: plan.expiresAt },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to reconcile checkout", details: err?.message },
      { status: 500 },
    );
  }
}
