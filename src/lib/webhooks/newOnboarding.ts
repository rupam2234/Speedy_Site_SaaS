import { NextRequest, NextResponse, after } from "next/server";
import { emailAdminNewOnboarding } from "@/app/api/emails/adminNewOnboarding";

export interface NewOnboardingWebhookPayload {
  onboarding_id?: string;
  order_id?: string;
  user_id: string;
  user_email?: string;
  site_name?: string;
  website_name?: string;
  created_at?: string;
}

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_WEBHOOK_SECRET;
  const cronSecret = process.env.CRON_SECRET_TOKEN;

  // Allowed secrets list (ignoring empty/undefined)
  const validSecrets = [adminSecret, cronSecret].filter(Boolean) as string[];

  if (validSecrets.length === 0) {
    // If no secrets are configured in env, deny access for security
    return false;
  }

  const headerSecret = req.headers.get("x-webhook-secret");
  if (headerSecret && validSecrets.includes(headerSecret)) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (validSecrets.includes(bearerToken)) {
      return true;
    }
  }

  return false;
}

/**
 * Handles inbound new-onboarding webhook notifications for admins.
 * Validates the shared secret, returns an immediate 200 ACK, and dispatches
 * the admin intake alert email via Next.js after().
 */
export async function handleNewOnboardingWebhook(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: NewOnboardingWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  // Schedule background dispatch solely for admin onboarding alert email
  after(async () => {
    try {
      await emailAdminNewOnboarding({
        orderId: payload.order_id,
        onboardingId: payload.onboarding_id,
        userId: payload.user_id,
        userEmail: payload.user_email,
        siteName: payload.site_name,
        websiteName: payload.website_name,
        createdAt: payload.created_at,
      });
    } catch (bgError) {
      console.error("Background task error in handleNewOnboardingWebhook:", bgError);
    }
  });

  // Fast ACK: return 200 immediately
  return NextResponse.json({ received: true }, { status: 200 });
}
