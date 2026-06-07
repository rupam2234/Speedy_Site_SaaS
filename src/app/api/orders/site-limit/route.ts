import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "../..";
import { NextResponse } from "next/server";

const worker = setupDB();

const limits = {
    pro: 10,
    basic: 3,
    agency: 30,
    free: 1
}

type Plan = keyof typeof limits;

export async function GET() {
    const { user, error } = await getSupabaseServerUser();
    const user_id = user?.id ? user?.id : null;

    if (error || !user_id) {
        return NextResponse.json({ message: "User unauthorized" }, { status: 401 })
    }

    try {
        const { error: planError, data } = await worker.from("subscriptions").select("plan").eq("user_id", user_id).single();

        if (error || !data) {
            throw new Error(planError?.message ?? "Couldn't fetch user plan");
        }

        // now check the active sites for the user

        const { error: siteError, count } = (await worker.from("orders").select("*", { count: "exact" }).eq("user_id", user_id));

        if (siteError) {
            throw new Error(siteError?.message ?? "failed to fetch site count");
        }

        const planLimit = limits[data.plan.toLowerCase() as Plan];

        if (count !== null && count < planLimit) {
            return NextResponse.json({ reachedLimit: false }, { status: 200 })
        }

        return NextResponse.json({ reachedLimit: true }, { status: 200 })

    } catch (error: any) {
        return NextResponse.json({ message: error.message ?? "Server error" }, { status: 500 })
    }
}