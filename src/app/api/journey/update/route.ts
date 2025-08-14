import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/cloudflare/r2";

const worker = setupDB();

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Remove domain from required fields
    const { journeyName, steps, journeyId } = body;

    if (
      !journeyName ||
      !Array.isArray(steps) ||
      steps.length === 0 ||
      !journeyId
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch the journey and related order info
    const { data: journeyData, error: journeyFetchErr } = await worker
      .from("journeys")
      .select("id, name, order_id")
      .eq("id", journeyId)
      .single();

    if (journeyFetchErr || !journeyData) {
      return NextResponse.json(
        { message: "Journey not found", error: journeyFetchErr },
        { status: 404 }
      );
    }

    const { order_id } = journeyData;

    // Update the journey name
    const { error: updateJourneyErr } = await worker
      .from("journeys")
      .update({ name: journeyName })
      .eq("id", journeyId);

    if (updateJourneyErr) {
      return NextResponse.json(
        { message: "Failed to update journey name", error: updateJourneyErr },
        { status: 500 }
      );
    }

    // Delete existing steps
    const { error: deleteStepsErr } = await worker
      .from("steps")
      .delete()
      .eq("journey_id", journeyId);

    if (deleteStepsErr) {
      return NextResponse.json(
        { message: "Failed to delete old steps", error: deleteStepsErr },
        { status: 500 }
      );
    }

    // Insert new steps
    const stepsPayload = steps.map((step: any) => ({
      journey_id: journeyId,
      ...step,
    }));

    const { error: insertStepsErr } = await worker
      .from("steps")
      .insert(stepsPayload);

    if (insertStepsErr) {
      return NextResponse.json(
        { message: "Failed to insert new steps", error: insertStepsErr },
        { status: 500 }
      );
    }

    // Prepare journey JSON for R2 storage (no domain)
    const journeyObject = {
      journeyName,
      updated_at: new Date().toISOString(),
      journeyId,
      steps,
    };

    const safeJourneyName = journeyName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "");

    const fileKey = `journeys/${order_id}/${safeJourneyName}.json`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      Body: JSON.stringify(journeyObject, null, 2),
      ContentType: "application/json",
    });

    await r2.send(command);

    return NextResponse.json(
      { message: "Journey updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error during journey update", err);
    return NextResponse.json(
      { message: "Unexpected server error", error: err?.message },
      { status: 500 }
    );
  }
}
