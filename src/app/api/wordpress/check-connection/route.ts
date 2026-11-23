import { NextRequest, NextResponse } from "next/server";

interface Props {
    domain: string;
}

export async function POST(req: NextRequest){
    const {domain}: Props = await req.json();

    if(!domain){
        return NextResponse.json({message: "Bad request"}, {status: 400}) 
    }

    try{
        const res = await fetch(`https://${domain}/wp-json/speedy-site/v1/plugins`);

        // WordPress answers with an HTML page when the plugin is missing (or a
        // WAF blocks the call), so the body is parsed defensively.
        const raw = await res.text();
        let data: any = null;
        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = null;
        }

        const found: {plugin: boolean, key: boolean} = {key: false, plugin: false};

        if(res.status === 401){
            if (data?.message === "Secret key not set in WordPress settings."){
                found.key = false; 
                found.plugin = true  // basically there's a house but front door is locked 
            }else{
                found.key = true;
                found.plugin = true
            }
        }

        if(res.status === 404){
            return NextResponse.json({message: "No plugin found"}, {status: 404})
        }

        return NextResponse.json({found}, {status: 200})

    }catch(error:any){
        return NextResponse.json({message: error.message ?? "Unexpacted error"}, {status: 500})
    }
}