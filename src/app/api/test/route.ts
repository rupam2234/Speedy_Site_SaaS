import { NextResponse } from "next/server";
import { SubscriptionCreated } from "../emails/subscriptionCreated";

export async function GET() {
  await SubscriptionCreated({
    stripeCustomerId: "cus_TRyqNKYSGbnOVR",
    billingCycleEnd: "",
    plan: "Pro",
  });

  return NextResponse.json({ success: true });
}
