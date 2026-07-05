import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { data }: { data: any } = await req.json();

  if (!data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `
    You are a senior WordPress website performance expert.

    We are sending some of the assets that are 3rd party and starts loading in first 1500 milliseconds and can be optimized to improve speed for core page components.


    important: 
    - You don't have to explain timings, just fixes... simple to follow
    - cross check if delaying a certain script or file could impact functionality
    - Don't repeat same type of sentances, instead short them for faster guidence


    Rules:
    - Use only plain English.
    - return should mention that 'based on asset data'
    - Do not use markdown, bullet points, numbers, emojis, or special characters.
    - Keep language simple and provide fixes with steps for WordPress using WP Rocket.
    - Use paragraphs
    - Do not expose internal keys & variables, important!
    - Use abbreviations wherever possible

    Fix rules:
    - Let user know what to do with which assets based on asset data type url: string; startTime: number | null; duration: number | null; type: string;
    - it's best if you can recommand the optimizations using WP rocket's latest update
    - or other WordPress plugins if recommanded feature is not available on WP rocket
    - Also the fixes should be like : Go to WP rocket or WP cache > add xyz to your WP rocket abc settings

    Do not add extra sentences or extra detail beyond.

     Assets: ${JSON.stringify(data)}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPEN_ROUTER_KEY}`,
      },
      body: JSON.stringify({
        stream: true,
        model: "openai/gpt-oss-120b:free",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error ?? "Error getting analysis");
    }

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}


