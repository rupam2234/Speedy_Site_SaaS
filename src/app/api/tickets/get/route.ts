import { setupDB } from "@/lib/db";
import { GetServerSupabase } from "@/lib/db/getUser";
import { NextResponse } from "next/server";
import { redisCache } from "@/components/utils";

const worker = setupDB();

export async function GET(){
    const {user} = await GetServerSupabase();

    if(!user){
        return NextResponse.json({message: "User unauthorized"}, {status: 401});
    }
    
    try{
        if(!user.email){
            throw new Error("User email not available");
        }

        const { data, error } = await worker
            .from("profiles")
            .select("role")
            .eq("email", user.email)
            .maybeSingle();

        if (error) throw new Error(error.message);

        if (data?.role === "user") {

            // uses redis cache
            const tickets = await redisCache({
                key: `tickets:user:${user.id}`,
                ttl: 300, // 5 minutes
                fn: async () => {
                  const { data, error } = await worker
                    .from("tickets")
                    .select("id, subject, status, created_at, updated_at, related_order")
                    .eq("user_id", user.id);
              
                  if (error) {
                    throw new Error(error.message);
                  }
              
                  return data ?? [];
                },
              });
              
            return NextResponse.json({ tickets, isCached: tickets.isCached, role: data?.role }, { status: 200 });
        } else if(data?.role === "admin"){
            // uses redis cache
            const tickets = await redisCache({
                key: `tickets:admin:${user.id}`,
                ttl: 300, // 5 minutes
                fn: async () => {
                  const { data, error } = await worker
                    .from("tickets")
                    .select("id, subject, status, created_at, updated_at, related_order");
              
                  if (error) {
                    throw new Error(error.message);
                  }
              
                  return data ?? [];
                },
              });
              
            return NextResponse.json({ tickets, isCached: tickets.isCached, role: data?.role }, { status: 200 });
        }

        return NextResponse.json(
            { message: "Unauthorized role" },
            { status: 403 }
        );

    }catch(error){
        return NextResponse.json({message: error instanceof Error ? error.message : "Internal server error"}, {status: 500})
    }
}
