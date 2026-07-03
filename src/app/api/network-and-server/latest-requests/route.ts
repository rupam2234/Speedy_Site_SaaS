import { CachePrefix } from "@/data-types";
import { setupDB } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function GET(req: NextRequest) {
    const domain = req.headers.get("domain");
    const range = req.headers.get("limit") as unknown as number || 30;

    if (!domain) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 })
    }

    try {
        const data = await getRecentRequests(domain, range);
        return NextResponse.json(data, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message ?? "Something went wrong" }, { status: 500 })
    }
}

const getRecentRequests = (domain: string, range: number) =>
    unstable_cache(
        async () => {
            const { data, error } = await worker.rpc("recent_requests", {
                p_domain: domain,
                p_limit: range,
            });

            if (error) throw new Error(error.message || "Unable to fetch latest requests");

            return data;
        },
        [`${CachePrefix["LATEST-REQUESTS"]}_${domain}_${range}`],
        {
            revalidate: 2 * 60,
            tags: [`rum_${domain}`],
        }
    )();

