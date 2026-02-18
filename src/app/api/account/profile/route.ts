import { setupDB } from "@/lib/db";
import { GetServerSupabase } from "@/lib/db/getUser";
import { NextResponse } from "next/server";

const worker = setupDB();

export async function GET(){
    const {user} = await GetServerSupabase();

    if(!user){
        return NextResponse.json({message: "User unauthorized"}, {status: 400});
    }

    try{
        if(!user.email){
            throw new Error("User email not available");
        }

        const {data, error } = await worker.from("profiles").select("role").eq("email", user.email).maybeSingle();

        if(error){
            throw new Error(error.message);
        }

        return NextResponse.json({role: data?.role}, {status: 200});

    }catch(error:any){
        return NextResponse.json({message: error.message || "Something went wrong"}, {status: 500})
    }

}