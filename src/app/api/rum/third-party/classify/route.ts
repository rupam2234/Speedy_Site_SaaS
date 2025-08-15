import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import loadTrackerDB from "@ghostery/trackerdb";

let trackerDB: any = null;

const manualOverrides: Record<string, string> = {
  "ads.adthrive.com": "Advertising",
  "cdn.doubleverify.com": "Advertising",
  "google-analytics.com": "Analytics",
  // add more overrides here
};

async function initDB() {
  if (!trackerDB) {
    const engineBase64 = await fs.readFile(
      path.resolve(process.cwd(), "public", "engine-base64.txt"),
      "utf-8"
    );

    const engineBuffer = Uint8Array.from(Buffer.from(engineBase64, "base64"));
    trackerDB = await loadTrackerDB(engineBuffer);
  }
}

const CACHE_WORKER_URL =
  "https://third-party-classify.thespeedysite.workers.dev";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domains, frequency } = body;

    if (!Array.isArray(domains) || domains.some((d) => typeof d !== "string")) {
      return NextResponse.json(
        { error: "Missing or invalid domains array" },
        { status: 400 }
      );
    }

    await initDB();

    const results = await Promise.all(
      domains.map(async (domain: string, index: number) => {
        const freq = Array.isArray(frequency) ? frequency[index] : undefined;

        // 1. Check manual override
        if (manualOverrides[domain]) {
          const overrideCategory = manualOverrides[domain];

          // Optionally cache the override as well
          await fetch(`${CACHE_WORKER_URL}/${domain}`, {
            method: "PUT",
            body: overrideCategory,
          });

          return {
            domain,
            category: overrideCategory,
            cached: false,
            overridden: true,
            frequency: freq,
          };
        }

        // 2. Check Cloudflare KV via Worker
        const cachedResp = await fetch(`${CACHE_WORKER_URL}/${domain}`);
        if (cachedResp.ok) {
          const cachedCategory = await cachedResp.text();
          return {
            domain,
            category: cachedCategory,
            cached: true,
            frequency: freq,
          };
        }

        // 3. Fallback to trackerDB
        const matches = trackerDB.matchDomain(domain);
        const category =
          matches.length > 0
            ? matches[0].category?.name ?? "Unknown"
            : "Unknown";

        // // 4. Post-process unknowns (optional fuzzy override)
        // if (category === "Unknown") {
        //   if (domain.includes("adthrive")) {
        //     category = "Advertisement";
        //   }
        // }

        // 5. Cache result in KV
        await fetch(`${CACHE_WORKER_URL}/${domain}`, {
          method: "PUT",
          body: category,
        });

        return { domain, category, cached: false, frequency: freq };
      })
    );

    return NextResponse.json(results);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal error", details: error.message },
      { status: 500 }
    );
  }
}
