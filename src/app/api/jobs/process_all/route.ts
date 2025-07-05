import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { pageCrux } from "@/app/api/external/fetch_crux";

function isToday(dateStr: string): boolean {
  const givenDate = new Date(dateStr);
  const now = new Date();

  return (
    givenDate.getUTCFullYear() === now.getUTCFullYear() &&
    givenDate.getUTCMonth() === now.getUTCMonth() &&
    givenDate.getUTCDate() === now.getUTCDate()
  );
}

export async function POST() {
  const supabase = setupDB();

  const { data: jobs, error } = await supabase.from("crux_jobs").select("*");

  if (error || !jobs?.length) {
    return NextResponse.json(
      { message: "No jobs to process" },
      { status: 204 }
    );
  }

  const updatedJobs = [];

  for (const job of jobs) {
    if (isToday(job.updated_at!)) {
      continue;
    }

    await supabase
      .from("crux_jobs")
      .update({ status: "processing" })
      .eq("id", job.id);

    const allResults = [];

    for (const url of job.urls) {
      if (allResults.length >= 10) break;

      try {
        const results = await pageCrux(url);

        if (results?.parsedData.some((r) => r.record !== null)) {
          allResults.push(results.parsedData);
        }

        await new Promise((res) => setTimeout(res, 1000)); // Delay
      } catch (e) {
        console.error("Error processing URL:", url, e);
      }
    }

    await supabase
      .from("crux_jobs")
      .update({
        status: "done",
        results: JSON.parse(JSON.stringify(allResults)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    updatedJobs.push(job.id);
  }

  return NextResponse.json({
    message: `Processed ${updatedJobs.length} job(s).`,
    updatedJobIds: updatedJobs,
  });
}
