import { setupDB } from "@/lib/db"
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSupabaseServerUser } from "@/app/api";

const worker = setupDB();

const getCachedOneTimeOrders = unstable_cache(
    async (userId: string) => {
        const { error: orderError, data } = await worker
            .from("one_time_orders")
            .select("*")
            .eq("user_id", userId)

        if (orderError) {
            throw new Error(orderError.message || "Unable to find managed wordpress order");
        }

        return data;
    },
    ["one-time-orders"],
    {
        tags: ["one-time-orders"],
        revalidate: 5 * 60,
    }
);

export async function GET() {
    const { user, error } = await getSupabaseServerUser();

    try {
        if (!user) {
            throw new Error(error);
        }

        const data = await getCachedOneTimeOrders(user.id);

        return NextResponse.json(data, { status: 200 });

    } catch (error: any) {
        return NextResponse.json(error.message || "Unexpected Error Occurred", { status: 500 });
    }
}