import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { data }: { data: any } = await req.json();

  if (!data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `
    You are a senior WordPress website performance expert.

    Explain website performance using navigation timing data.

    Rules:
    - Use only plain English.
    - return should mention that 'based on recent request timings'
    - Do not use markdown, bullet points, numbers, emojis, or special characters.
    - Keep language simple and provide fixes with steps for WordPress.
    - Use paragraphs
    - Do not expose internal keys & variables, important!
    - Use abbreviations wherever possible

    Sentence rules:
    - Overall performance in simple terms (fast, normal, or slow and why). Don't mansplain.
    - Main bottleneck if any, explained in user friendly language (for example slow server response, slow loading connection, or inefficient caching).
    - Use your reasoning to understand whether CDN is configured based on cache hit and miss data and then suggest doable (non generic) enhancements. But careful, your suggestions should not break user's website.
    
    Do not add extra sentences or extra detail beyond these three.

    Navigation Timing Data:
    ${JSON.stringify(data.navigation_timing_data)}

    Additional Context:
    ${JSON.stringify(data.analysisProps)}
    `;

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
        // "Cache-Control": "no-cache",
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
