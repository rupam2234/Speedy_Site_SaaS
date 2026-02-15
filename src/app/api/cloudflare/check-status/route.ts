import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  user_id: string;
  site_id: string;
}

const worker = setupDB();

function maskApi(key: string | null, visible: number){

  if(!key){
     return "";
  }

  if(visible > key.length){
    return key;
  }

  const unmaskedKey = key.slice(0, visible);

  const masked = "*".repeat(key.length - visible)

  return unmaskedKey + masked;

}

export async function POST(req: NextRequest) {
  const { site_id, user_id }: Props = await req.json();

  if (!user_id) {
    return NextResponse.json(
      { found: false, message: "User unauthorized" },
      { status: 401 },
    );
  }

  if(!site_id){
    return NextResponse.json({found: false, message: "Bad request"}, {status: 400})
  }

  try {
    const { data, error } = await worker
    .from("cloudflare_auth")
    .select("token")
    .eq("site_id", site_id)
    .eq("user_id", user_id)
    .maybeSingle();

    if(error){
      throw new Error(error.message);
    }

    const maskedkey = maskApi(data && data.token, 8)

    return NextResponse.json({found: data?.token !== undefined ? true : false, key: maskedkey}, {status: 200})

  }catch (error: any){
    return NextResponse.json({found: false, message: error}, {status: 500})
  }
}
