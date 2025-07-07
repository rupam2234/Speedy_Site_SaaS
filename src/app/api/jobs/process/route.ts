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

  const processedUrls: string[] = [];
  const resultsWithData: { url: string; data: any }[] = [];
  const resultsWithoutData: { url: string; data: any }[] = [];

  const urlsToProcess = job.urls.slice(0, 100);

  for (const url of urlsToProcess) {
    processedUrls.push(url);

    try {
      const results = await pageCrux(url);
      const hasData = results?.parsedData?.some((r: any) => r.record !== null);

      if (hasData) {
        resultsWithData.push({ url, data: results!.parsedData });
      } else {
        resultsWithoutData.push({ url, data: results!.parsedData });
      }

      if (resultsWithData.length >= 10) break;

      await new Promise((res) => setTimeout(res, 1000));
    } catch (e) {
      console.error("Error processing url:", url, e);
    }
  }

  // Combine results up to 10: first those with data, then those without
  const finalResults: any[] = [];
  const finalUrls: string[] = [];

  for (const item of resultsWithData) {
    if (finalResults.length >= 10) break;
    finalResults.push(item.data);
    finalUrls.push(item.url);
  }

  for (const item of resultsWithoutData) {
    if (finalResults.length >= 10) break;
    finalResults.push(item.data);
    finalUrls.push(item.url);
  }

  // If still less than 10, fill from top of processedUrls (but not already in finalUrls)
  for (const url of processedUrls) {
    if (finalUrls.length >= 10) break;
    if (!finalUrls.includes(url)) {
      finalUrls.push(url);
      finalResults.push([]); // No data available
    }
  }

  // Update job with exactly 10 urls and their results
  await supabase
    .from("crux_jobs")
    .update({
      status: "done",
      results: JSON.parse(JSON.stringify(finalResults)),
      urls: finalUrls,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return NextResponse.json({
    message: "Job processed",
    jobId: job.id,
    resultsCount: finalResults.length,
  });
}
