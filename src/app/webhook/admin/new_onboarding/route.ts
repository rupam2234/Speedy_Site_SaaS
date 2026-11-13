import { NextRequest } from "next/server";
import { handleNewOnboardingWebhook } from "@/lib/webhooks/newOnboarding";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleNewOnboardingWebhook(req);
}
