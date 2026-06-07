import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    message: string;
    ticket_id: string;
}
const worker = setupDB();

export async function POST(req: NextRequest) {
    const { message, ticket_id }: Props = await req.json();

    const { user } = await getSupabaseServerUser();

    if (!user?.id) {
        return NextResponse.json({ message: "User unauthorized" }, { status: 401 })
    }

    if (!message || !ticket_id) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 });
    }

    try {

        // first fetch the profile
        const { data: profileData, error: profleError } = await worker.from("profiles").select("role").eq("id", user.id).maybeSingle();

        if (profleError) {
            throw new Error(profleError.message || "Error fetching user profile");
        }

        // get the sender role
        const userRole = profileData?.role;

        if (!userRole) {
            throw new Error("User role undefined");
        }

        // if we have profile data
        const { error } = await worker.from("ticket_messages").insert({ user_id: user?.id, message: message as string, ticket_id: ticket_id, sender_name: user.user_metadata.name, sender_role: userRole });

        if (error) {
            throw new Error(error.message || "Failed to send message");
        }

        return NextResponse.json({ message: "Message sent" }, { status: 200 })

    } catch (error: any) {
        return NextResponse.json({ message: error?.message || "something went wrong" }, { status: 500 })
    }
}