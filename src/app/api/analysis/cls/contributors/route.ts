import { NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";

export type clsAnalysisType<T> = {
  metric: "CLS";
  data: T;
};

export async function POST() {
  const { user } = await getSupabaseServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication is required." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      error: "analysis_retired",
      message:
        "Element-level AI analysis has been retired. Use the detected issues panel for evidence-backed diagnoses.",
    },
    { status: 410 },
  );
}
