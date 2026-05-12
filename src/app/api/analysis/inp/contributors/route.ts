import { NextRequest, NextResponse } from "next/server";

export type InpAnalysisType<T> = {
  metric: "INP";
  data: T;
};

export async function POST<T>(req: NextRequest) {
  const body: InpAnalysisType<T> = await req.json();

  if (!body.metric || !body.data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `
        Task: Act as a Web Performance Engineer. Analyze INP (Interaction to Next Paint) contributor data and provide precise root-cause fixes.

        Data: ${JSON.stringify(body.data)}

        Rules of Analysis:
        1. Identify the PRIMARY responsiveness bottleneck using timing but don't mention timing in fixes:
        - inp_value
        - input_delay
        - processing_duration
        - presentation_delay

        2. Determine WHICH phase caused the slowdown:
        - Input delay → main-thread blocked before interaction starts
        - Processing duration → heavy JavaScript execution/event handler
        - Presentation delay → rendering/layout/paint bottleneck

        3. Identify likely root causes:
        - long JavaScript tasks
        - expensive React re-renders
        - synchronous event handlers
        - layout thrashing
        - DOM size complexity
        - animation/render cost
        - third-party script blocking
        - hydration delays
        - expensive state updates

        4. Use responsible_scripts only when relevant to the delay source.

        5. If target_element is "unknown", assume the interaction may have occurred during:
        - scrolling
        - touch gestures
        - passive interactions
        - viewport repaint activity

        Strict Fix Requirements:
        - Every fix MUST include:
        1. The exact element, interaction, or script from Data
        2. The root cause
        3. A concrete user friendly action

        - Avoid generic advice like:
        - "optimize JavaScript"
        - "reduce rendering"

        - Combine cause + fix:
        Example:
        "Reduce click latency on mobile-nav-button by splitting synchronous React state updates with requestIdleCallback"

        Fix Mapping Logic:
        - High input_delay →
        reduce long tasks, defer third-party scripts, break synchronous work

        - High processing_duration →
        optimize handlers, memoize renders, virtualize lists, debounce expensive logic

        - High presentation_delay →
        reduce layout recalculation, avoid forced reflows, simplify paint-heavy UI

        - Large responsible_scripts →
        lazy load, defer, code split, move off main thread

        - Interaction type scroll/touch →
        passive listeners + avoid scroll-linked rendering work

        - React-heavy pages →
        memoization, transition updates, reduce cascading state changes

        Output Format:
        - Return ONLY bullet points
        - No JSON
        - No markdown code blocks
        - No explanations outside bullets
        - Each fix MUST start with a bullet "•"
        - Max 3 bullets
        - Max 24 words each
        - Each bullet must include:
        - exact element/script/interaction from Data
        - root cause
        - developer action

        Example Output:
        •
        Reduce click latency on checkout-button by splitting synchronous state updates causing 420ms processing delay

        •
        Defer analytics.bundle.js execution to reduce input delay blocking user interaction

        •
        Memoize product-grid React rendering to prevent layout thrashing during scroll

        Constraints:
        - No generic advice
        - No repetition
        - Must reflect actual Data fields`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPEN_ROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        stream: true,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ message: error }, { status: 500 });
    }

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message ?? "Unexpected Error",
      },
      { status: 500 },
    );
  }
}
