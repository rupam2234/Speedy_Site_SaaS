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
    Task:
    Act as a Core Web Vitals consultant specializing in WordPress performance optimization.
    Analyze INP (Interaction to Next Paint) contributor data and generate precise, actionable fixes.

    Data:
    ${JSON.stringify(body.data)}

    Analysis Rules:

    1. Identify the PRIMARY responsiveness bottleneck using:
    - inp_value
    - input_delay
    - processing_duration
    - presentation_delay

    2. Determine the dominant slowdown phase:
    - Input delay → main thread blocked before interaction
    - Processing duration → expensive JavaScript/event handler execution
    - Presentation delay → rendering/layout/paint bottleneck

    3. Identify likely root causes ONLY when supported by Data:
    - long JavaScript tasks
    - synchronous event handlers
    - expensive React/Vue renders
    - hydration delays
    - layout thrashing
    - forced reflows
    - animation/render cost
    - excessive DOM complexity
    - expensive state updates
    - third-party script blocking
    - scroll-linked rendering work

    4. Use responsible_scripts ONLY when relevant.

    5. If target_element is "unknown", assume interaction may involve:
    - scrolling
    - touch gestures
    - passive interactions
    - viewport repaint activity

    6. Prioritize fixes by:
    - largest contributor phase
    - user-visible interaction impact
    - likelihood of improvement

    WordPress Context Rules:

    - Prefer WordPress-specific fixes whenever possible
    - Translate low-level performance issues into practical implementation steps
    - Prefer fixes involving:
      - plugin optimization
      - Elementor/WooCommerce improvements
      - delayed third-party scripts
      - passive listeners
      - lazy loading widgets/sliders
      - reduced DOM complexity
      - caching/CDN improvements
      - disabling unnecessary animations
      - reducing cart fragment updates
      - deferring analytics/chat widgets

    - Mention likely plugin/theme source ONLY if clearly implied by Data
    - Avoid framework-only advice unless React/Vue is explicitly detected

    Strict Fix Requirements:

    Every bullet MUST include:
    1. Exact element, interaction, or script from Data
    2. Root cause
    3. Concrete developer-friendly action

    Avoid generic advice like:
    - "optimize JavaScript"
    - "reduce rendering"
    - "improve performance"

    Combine cause + fix into one sentence.

    Good Example:
    "Delay GTM and Hotjar loading until user interaction to prevent main-thread blocking before mobile-menu-button clicks"

    Fix Mapping Logic:

    - High input_delay →
      break long tasks, defer third-party scripts, delay hydration, move work off main thread

    - High processing_duration →
      optimize handlers, reduce synchronous state updates, virtualize lists, debounce expensive logic

    - High presentation_delay →
      reduce layout recalculation, avoid forced reflows, simplify paint-heavy UI, reduce DOM size

    - Large responsible_scripts →
      lazy load, defer, code split, load after interaction

    - Scroll/touch interactions →
      passive listeners + avoid scroll-linked rendering work

    - React-heavy pages →
      memoization, transition updates, reduce cascading renders

    Confidence Rules:

    - Only infer causes strongly supported by Data
    - If evidence is weak, use:
      - "likely caused by"
      - "possibly triggered by"
    - Never invent scripts, plugins, or elements absent from Data

    Output Format:

    - Return ONLY bullet points
    - No JSON
    - No markdown code blocks
    - No explanations outside bullets
    - Each bullet MUST start with "•"
    - Max 3 bullets
    - Max 40 words each
    - Never mention:
      - milliseconds
      - timing values
      - durations
      - latency numbers
      - performance metrics
    - Focus only on causes and fixes
    - Each bullet MUST contain:
      - exact element/script/interaction from Data
      - root cause
      - actionable fix

    Constraints:

    - No repetition
    - No generic advice
    - Must reflect actual Data fields
    - Focus on fixes realistic for WordPress site owners/developers
    `;

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
