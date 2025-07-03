import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { pageCrux } from "@/app/api/external/fetch_crux";

export async function POST() {
  const supabase = setupDB();

  // Get one pending job
  const { data: jobs, error } = await supabase
    .from("crux_jobs")
    .select("*")
    .eq("status", "pending")
    .limit(1);

  if (error || !jobs?.length) {
    console.log("No pending jobs or error", error);
    return NextResponse.json({ message: "No pending jobs" }, { status: 204 });
  }

  const job = jobs[0];

  // Mark job as processing
  await supabase
    .from("crux_jobs")
    .update({ status: "processing" })
    .eq("id", job.id);

  const allResults = [];

  for (const url of job.urls) {
    try {
      const results = await pageCrux(url);

      if (results?.parsedData.some((r) => r.record !== null)) {
        allResults.push(results.parsedData);
      }

      // Delay 1 second to avoid rate limits
      await new Promise((res) => setTimeout(res, 1000));
    } catch (e) {
      console.error("Error processing url:", url, e);
    }
  }

  // Save results and mark job done
  await supabase
    .from("crux_jobs")
    .update({
      status: "done",
      results: JSON.parse(JSON.stringify(allResults)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return NextResponse.json({
    message: "Job processed",
    jobId: job.id,
    resultsCount: allResults.length,
  });
}
