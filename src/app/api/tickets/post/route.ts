import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser, SpeedySiteTickets } from "../..";
import { setupDB } from "@/lib/db";

const worker = setupDB();

export async function POST(req: NextRequest) {

    const { user } = await getSupabaseServerUser();
    const { subject, message, related_order }: SpeedySiteTickets = await req.json();

    if (!user) {
        return NextResponse.json({ message: "User unauthenticated" }, { status: 401 })
    }

    if (subject.length < 1 || message.length < 1) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 })
    }

    try {
        const { data, error } = await worker.from("tickets").insert({ subject: subject, message: message, user_id: user?.id, related_order: related_order }).select().single();

        if (error) {
            throw new Error(error.message);
        }

        // get the user role

        if (!user?.email) {
            throw new Error("User email invalid");
        }

        const { data: ProfileData, error: ProfileError } = await worker.from("profiles").select("role").eq("email", user?.email).single();

        if (ProfileError) {
            throw new Error(ProfileError.message);
        }

        // add a message for the ticket
        const { error: MessageError } = await worker.from("ticket_messages").insert({ message: message, user_id: user?.id, sender_name: user?.user_metadata.name, ticket_id: data.id, sender_role: ProfileData.role });

        if (MessageError) {
            throw new Error(MessageError.message);
        }

        return NextResponse.json({ message: "Ticket added" }, { status: 200 })

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 })
    }
}