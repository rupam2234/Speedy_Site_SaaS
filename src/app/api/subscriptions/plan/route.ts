import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export interface UserPlan {
  idx: number;
  user_id: string;
  plan: "Basic" | "Pro" | "Agency" | "Free";
  current_usage: number;
  usage_limit: number;
  degradation_policy: "block" | "alert" | "degrade";
  status: "active" | "inactive" | string;
  trial_ends_at: string | null;
  period_starts_at: string;
  period_ends_at: string | null;
  created_at: string;
  computed_usage_limit: number;
  updated_at: string;
  active_sites: number;
}

export async function POST(req: NextRequest) {
  const { user_id }: { user_id: string } = await req.json();

  if (!user_id) {
    return NextResponse.json(
      { message: "Request body missing" },
      { status: 401 }
    );
  }

  try {
    const { data, error } = await worker
      .from("subscription_with_limit")
      .select("*")
      .eq("user_id", user_id);

    if (error) {
      return NextResponse.json(
        { message: "Unable to find active plan" },
        { status: 400 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "No active subscription found for user" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Plan acquired", data },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}
