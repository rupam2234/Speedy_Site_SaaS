import { setupDB } from "@/lib/db";
import { GetServerSupabase } from "@/lib/db/getUser";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    domain: string;
}

const worker = setupDB();

export async function POST(req: NextRequest){
    const {user} = await GetServerSupabase();

    const {domain}: Props = await req.json();

    if(!user?.id){
        return NextResponse.json({message: "User unauthorized"}, {status: 401})
    }

    try{
        const { data, error } = await worker
        .from("cloudflare_auth")
        .update({token: null})
        .eq("site_id", domain)
        .eq("user_id", user?.id)
        .maybeSingle();

        if(error){
            throw new Error(error.message);
        }

        return NextResponse.json({data}, {status:200})

    }catch(error){
        return NextResponse.json({message: error}, {status: 500})
    }

   
}