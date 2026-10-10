import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { EmailReportingUpdate } from "@/app/api/helpers/dataTypes";

export async function GET(req: NextRequest) {
    const order_id = req.nextUrl.searchParams.get("order_id");

    if (!order_id) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 });
    }
    const worker = setupDB();
    try {
        const { data, error } = await worker
            .from("email_reporting")
            .select("report_verbosity, optional_email")
            .eq("order_id", order_id);

        if (error) {
            throw new Error(
                error.message ?? "Error fetching email report config",
            );
        }

        return NextResponse.json({ data }, { status: 200 });
        // TODO: implement multiple email sending with unique verbosity each
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message ?? "Unexpected Error" },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    const payload: EmailReportingUpdate = await req.json();

    const worker = setupDB();

    try {
        const { error } = await worker.rpc("set_email_reporting", {
            p_entries: payload.entries,
            p_order_id: payload.order_id,
        });
        if (error) {
            throw new Error(error.message);
        }
        return NextResponse.json({ status: 200 });
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message ?? "Unexpected Error" },
            { status: 500 },
        );
    }
}
