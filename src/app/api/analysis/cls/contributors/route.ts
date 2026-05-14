import { NextRequest, NextResponse } from "next/server";

export type clsAnalysisType<T> = {
  metric: "CLS";
  data: T;
};

export async function POST<T>(req: NextRequest) {
  const { metric, data }: clsAnalysisType<T> = await req.json();

  if (!metric || !data) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const prompt = `
    Task:
    Act as a Core Web Vitals consultant specializing in WordPress performance optimization.
    Analyze CLS (Cumulative Layout Shift) contributor data and generate precise, actionable fixes.

    Data:
    ${JSON.stringify(data)}

    Analysis Rules:

    1. Identify the PRIMARY layout instability source using:
    - cls_value
    - largest_shift_target
    - shift_sources
    - impact_region
    - movement_direction
    - affected_elements

    2. Determine WHAT triggered the layout shift:
    - late-loading images
    - ads/iframes injected without reserved space
    - font swapping
    - dynamic banners/popups
    - sticky headers
    - sliders/carousels
    - DOM injection above visible content
    - animation/transforms affecting layout
    - lazy-loaded embeds
    - Elementor/WooCommerce dynamic rendering

    3. Identify likely root causes ONLY when supported by Data:
    - missing width/height attributes
    - missing aspect-ratio containers
    - DOM insertion above content
    - layout-triggering animations
    - font rendering swaps
    - dynamic content expansion
    - third-party widgets
    - delayed hydration
    - excessive layout recalculation
    - unstable carousel/slider initialization

    4. Use responsible_scripts ONLY when clearly relevant.

    5. If shifted_element is "unknown", assume instability may involve:
    - viewport-wide reflow
    - injected marketing widgets
    - sticky UI transitions
    - async content loading
    - lazy-rendered sections

    6. Prioritize fixes by:
    - visual instability severity
    - viewport impact
    - frequency of layout movement
    - likelihood of improvement

    WordPress Context Rules:

    - Prefer WordPress-specific fixes whenever possible
    - Translate rendering issues into practical implementation steps
    - Prefer fixes involving:
      - reserving image/container space
      - Elementor section stabilization
      - WooCommerce product/grid consistency
      - disabling layout-shifting animations
      - preloading fonts
      - delaying popup/chat widgets
      - stabilizing sliders/carousels
      - reducing dynamic DOM injection
      - reserving ad/embed dimensions
      - preventing sticky-header jumps

    - Mention likely plugin/theme source ONLY if clearly implied by Data
    - Avoid framework-only advice unless React/Vue is explicitly detected

    Strict Fix Requirements:

    Every bullet MUST include:
    1. Exact element, interaction, or script from Data
    2. Root cause
    3. Concrete developer-friendly action

    Avoid generic advice like:
    - "improve CLS"
    - "optimize rendering"
    - "reduce layout shifts"

    Combine cause + fix into one sentence.

    Good Example:
    "Reserve aspect-ratio space for homepage-hero-slider images to prevent Elementor carousel reflows shifting visible content"

    Fix Mapping Logic:

    - Images without dimensions →
      add width/height or aspect-ratio containers

    - Dynamic content injection →
      reserve space before rendering

    - Font-related shifts →
      preload fonts and use stable fallback fonts

    - Sticky headers/popups →
      avoid pushing visible content during initialization

    - Sliders/carousels →
      stabilize container height before scripts initialize

    - Third-party widgets →
      delay below-the-fold loading or reserve layout space

    - WooCommerce/product grids →
      enforce consistent product card sizing

    - Elementor-heavy layouts →
      reduce motion effects and dynamic section rendering

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
      - CLS scores
      - timing values
      - milliseconds
      - metrics
      - numeric performance values
    - Focus only on causes and fixes
    - Each bullet MUST contain:
      - exact element/script from Data
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
        // model: "openai/gpt-oss-120b:free",
        model: "arcee-ai/trinity-large-thinking:free",
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error ?? "Error getting analysis");
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
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}
