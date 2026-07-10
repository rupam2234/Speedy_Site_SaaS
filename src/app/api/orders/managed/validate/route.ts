import { setupDB } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function GET(req: NextRequest) {
    const activeSite = req.headers.get("site");
    const normalize = `https://${activeSite}`;

    if (!activeSite) {
        return NextResponse.json("Bad request", { status: 401 })
    }

    try {
        const { data, error } = await worker
            .from("wordpress_cred")
            .select("cred_id")
            .eq("wp_address", normalize)
            .maybeSingle();

        if (error) {
            throw error.message;
        }

        return NextResponse.json(data !== null, { status: 200 });

    } catch (error: any) {
        return NextResponse.json(
            { valid: false, message: error.message || "Unexpected Error Occurred" },
            { status: 500 }
        );
    }
}