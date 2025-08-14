import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/cloudflare/r2";

const worker = setupDB();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { domain, journeyName, steps } = body;

    if (
      !domain ||
      !journeyName ||
      !Array.isArray(steps) ||
      steps.length === 0
    ) {
      return NextResponse.json(
        { message: "Missing required fields: domain, journeyName, or steps" },
        { status: 400 }
      );
    }

    // Fetch site details
    const { data: siteData, error: siteError } = await worker
      .from("orders")
      .select("order_id, journey_count")
      .eq("website_name", domain)
      .limit(1)
      .single();

    if (siteError || !siteData) {
      return NextResponse.json(
        { message: "Unable to retrieve site information", error: siteError },
        { status: 500 }
      );
    }

    const { order_id, journey_count } = siteData;

    // Check journey limit
    if (journey_count !== null && journey_count >= 10) {
      return NextResponse.json(
        { message: "Journey limit reached (10/10)" },
        { status: 403 }
      );
    }

    // Insert journey
    const { data: journeyData, error: journeyErr } = await worker
      .from("journeys")
      .insert([{ order_id, name: journeyName }])
      .select()
      .single();

    if (journeyErr || !journeyData) {
      return NextResponse.json(
        { message: "Error adding journey", error: journeyErr },
        { status: 500 }
      );
    }

    // Insert steps
    const stepsPayload = steps.map((step: any) => ({
      journey_id: journeyData.id,
      ...step,
    }));

    const { error: stepsErr } = await worker.from("steps").insert(stepsPayload);

    if (stepsErr) {
      return NextResponse.json(
        { message: "Error adding steps", error: stepsErr },
        { status: 500 }
      );
    }

    // Construct the JSON content
    const journeyObject = {
      site: domain,
      journeyName,
      created_at: new Date().toISOString(),
      journeyId: journeyData.id,
      steps,
    };

    const safeJourneyName = journeyName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "");

    const fileKey = `journeys/${domain}/${safeJourneyName}.json`;

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      Body: JSON.stringify(journeyObject, null, 2),
      ContentType: "application/json",
    });

    await r2.send(command);

    if (journeyData && !stepsErr) {
      await worker
        .from("orders")
        .update({ journey_count: (journey_count ?? 0) + 1 })
        .eq("order_id", order_id);
    }

    return NextResponse.json(
      { message: "Journey added successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: "Unexpected server error", error: err?.message },
      { status: 500 }
    );
  }
}
