import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(request: NextRequest) {
  try {
    const { journeyId } = await request.json();

    if (!journeyId) {
      return NextResponse.json(
        { message: "Missing journeyId" },
        { status: 400 }
      );
    }

    // Get the journey
    const { data: journey, error: journeyError } = await worker
      .from("journeys")
      .select("id, name, created_at")
      .eq("id", journeyId)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json(
        { message: "Journey not found", error: journeyError },
        { status: 404 }
      );
    }

    // Get associated steps
    const { data: steps, error: stepsError } = await worker
      .from("steps")
      .select("*")
      .eq("journey_id", journeyId)
      .order("step_order", { ascending: true });

    if (stepsError) {
      return NextResponse.json(
        { message: "Error fetching steps", error: stepsError },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Journey fetched successfully",
        id: journey.id,
        name: journey.name,
        created_at: journey.created_at,
        steps,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: "Unexpected server error", error: err?.message },
      { status: 500 }
    );
  }
}
