import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    ticket_id: string;
    offset: number // how many rows to fetch
}

const worker = setupDB();

export async function POST(req: NextRequest){

    const {ticket_id, offset}: Props = await req.json();

    if(!ticket_id || typeof offset !== "number" || offset < 0){
        return NextResponse.json({message: "Bad request"}, {status: 400})
    }

    try{

        const CHUNK_SIZE = 10; // 10 messages per query

        // setting the range
        const from = offset;
        const to = offset + CHUNK_SIZE - 1;

        const {data, error, count} = await worker.from("ticket_messages").select("created_at, message, user_id, sender_name, sender_role", {count: "exact"}).eq("ticket_id", ticket_id).order("created_at", {ascending: true}).range(from, to);

        if(error){
            throw new Error(error.message);
        }

        return NextResponse.json({data, total: count,
            hasMore: count !== null ? to + 1 < count : false}, {status: 200})

    }catch(error:any){
        return NextResponse.json({message: error || "Unknown error"}, {status: 500})
    }

}