import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    domain: string;
}

const worker = setupDB()

export async function POST(req: NextRequest) {
  try {
    const { domain }:Props = await req.json();

    const url = domain.startsWith("http")
      ? domain
      : `https://${domain}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const html = await response.text(); 

    if(!response.ok){throw new Error(html)}

    // checks if https://rum.speedy.site/rum.js exists
    const scriptExists = /<script[^>]*src=["']https:\/\/rum\.speedy\.site\/rum\.js[^"']*["'][^>]*>/i.test(html); 

    // update on database
    const { error } = await worker
    .from("orders")
    .update({ rum_connection: scriptExists })
    .eq("website_name", domain);

    if(error){
      throw new Error(error.message);
    }

    return NextResponse.json({ scriptExists }, {status: 200});

  } catch (error) {
    return NextResponse.json(
      { message: error },
      { status: 500 }
    );
  } 
}
