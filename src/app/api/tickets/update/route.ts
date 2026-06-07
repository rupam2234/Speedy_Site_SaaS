// to update ticket status

import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "../..";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    status: "open" | "closed" | "pending";
    ticket_id: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
    const { status, ticket_id }: Props = await req.json();

    if (!["open", "closed", "pending"].includes(status) || !ticket_id) {
        return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const { user } = await getSupabaseServerUser();

    if (!user) {
        return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
    }

    try {
        // update the ticket
        const { error } = await worker.from("tickets").update({ status: status }).eq("id", ticket_id).eq("user_id", user?.id);

        if (error) {
            throw new Error(error.message || "Error updating ticket");
        }

        // if success, get the user role and add a final closing message for that ticket
        const { data, error: profileError } = await worker.from("profiles").select("role").eq("id", user?.id).single();

        if (profileError) {
            throw new Error(profileError.message || "Error getting user role");
        }

        const activeUser = user?.user_metadata?.name;

        const { error: errorMessage } = await worker.from("ticket_messages").insert({ message: `${activeUser} updated the ticket status to ${status}.`, ticket_id: ticket_id, user_id: user?.id, sender_name: activeUser, sender_role: data?.role });

        if (errorMessage) {
            throw new Error(errorMessage.message || "Error updating closing messsage");
        }

        return NextResponse.json({ message: "Ticket status updated successfully" }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ message: error?.message || "something went wrong" }, { status: 500 })
    }
}