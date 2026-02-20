"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import SiteHeader from "./header";
import Link from "next/link";
import { ComparisonTable, FeatureBlock, Testimonials } from "./index";
import { SiteFooter } from "@/components/theme";
import { ArrowRight } from "lucide-react";

export interface FeatureCore {
  title: string;
  desc: ReactNode;
  image?: string;
}

const features: FeatureCore[] = [
  {
    title: "Audience Share by UX Quality",
    desc: (
      <div className="space-y-4">
        <p className="text-lg text-gray-600">
          Gain a comprehensive view of user experience across devices, users,
          and geographic locations to quickly identify opportunities to improve.
        </p>
        <p className="text-lg text-gray-600">
          Streamlined traffic data featuring{" "}
          <span className="bg-amber-300">LLM-based traffic sources</span> and
          user happiness insights classified by geographic location.
        </p>
        <p>
          Monitor your top landing pages&apos; performance and traffic sources,
          and ensure they stay optimized using a single, unified script
          configuration.
        </p>
      </div>
    ),
    image: "/images/overview.png",
  },
  {
    title: "Catch Poor Page Experiences Early",
    desc: (
      <div className="space-y-4">
        <p className="text-lg text-gray-600">
          Google Search Console highlights sample pages with serious experience
          issues. It&apos;s a helpful starting point but not the whole story.
        </p>
        <p className="text-lg text-gray-600">
          A healthy website delivers great content and a great experience across
          all popular pages, not just few.
          <span className="bg-blue-200">
            Page Group can classify page experience across all traffic-driving
            pages
          </span>{" "}
          — whether they&apos;re new, niche, or top-performers — so you can
          monitor and improve UX site-wide.
        </p>
      </div>
    ),
    image: "/images/page-groups.png",
  },
  {
    title: "Monitor Web Vitals & Major Contributors",
    desc: (
      <>
        <div className="space-y-4">
          <p className="text-lg text-gray-600">
            When fixing your website performance, waiting for web vitals reports
            can slow you down. Track them daily instead to{" "}
            <span className="bg-green-300">
              gain deeper insights into your page&apos;s web vitals
            </span>{" "}
            and easily identify the root causes of performance issues.
          </p>
          <p className="text-lg text-gray-600">
            Understand precisely what&apos;s causing page experience issues
            accross all devices and user segment, without the overhead of
            building or maintaining your own system.
          </p>
        </div>
      </>
    ),
    image: "/images/web-vitals.png",
  },
  {
    title: "Centralized Insights into Unoptimized Images",
    desc: (
      <div className="space-y-4">
        <p className="text-lg text-gray-600">
          Images account for ~50–70% of a typical web page&apos;s total weight.
          When left unoptimized they are often the LCP elements, causes layout
          shift when not sized properly and even in some cases slow images that
          are blocking in nature can delay interactivity.
        </p>
        <p className="text-lg text-gray-600">
          LCP Sense is a most appearing image detector on your site and group
          them into LCP contributing classes (Good, Average and Poor) along with
          size (bytes) & size (width and height) for you to quickly identify and
          fix images that are not performing well.
        </p>
      </div>
    ),
    image: "/images/lcp-images.png",
  },
];

const extraFeatures: FeatureCore[] = [
  {
    title: "Integrated Optimization Assistance",
    desc: (
      <>
        <p>
          From your dashboard, you can send us your performance and UX
          bottleneck report, and our Speedy Site WordPress Optimization service
          (for WP sites only) will provide expert assistance.
        </p>
      </>
    ),
  },
  {
    title: "Adaptive Performance Bottleneck Alerts",
    desc: (
      <>
        <p>
          Improve your site speed and user experience before it affects a large
          segment of your audience. You&apos;ll get timely alerts—so you can
          stay focused on creating.
        </p>
      </>
    ),
  },
  {
    title: "Privacy-First Real User Monitoring",
    desc: (
      <>
        <p>
          Real User Monitoring shouldn&apos;t come at the cost of user privacy.
          Our RUM tracks only performance attributes, no cookies, no profiling,
          just the metrics you need to fix performance issues with confidence.
        </p>
      </>
    ),
  },
];

export default function Home() {
  return (
    <main className="bg-white text-gray-900 w-full overflow-x-hidden">
      {/* Navigation */}
      <SiteHeader enableNav={true} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#14142e] py-32 text-white">
        {/* 1. THE RANDOM DOTTED BACKGROUND LAYER */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(circle, #6366f1 1.2px, transparent 1.2px), 
              radial-gradient(circle, #a855f7 1px, transparent 1px),
              radial-gradient(circle, #ffffff 0.8px, transparent 0.8px)
            `,
            backgroundSize: "89px 89px, 53px 53px, 31px 31px",
            backgroundPosition: "0 0, 20px 40px, 10px 10px",
            maskImage:
              "radial-gradient(circle at center, black, transparent 90%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black, transparent 90%)",
          }}
        />

        {/* 2. AMBIENT GLOW ORBS (The "Standout" factor) */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          {/* 3. SHIMMER BADGE */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            Real-Time Performance Monitoring
          </div>

          {/* 4. THE GRADIENT HEADING */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight text-transparent bg-clip-text bg-linear-to-b from-white via-white to-white/50">
            Monitor Core Web Vitals, <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
              Diagnose Issues & Improve UX
            </span>
          </h1>

          <p className="mt-8 max-w-3xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed font-light">
            Measure real user performance across devices, identify bottlenecks
            affecting Core Web Vitals, and turn data into clear improvements
            your team can ship with confidence.
          </p>

          {/* 5. INTERACTIVE BUTTONS */}
          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-5">
            <a
              href="#features"
              className="group relative px-8 py-4 bg-indigo-600 rounded-xl font-bold transition-all hover:bg-indigo-500 hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.6)]"
            >
              <span className="flex items-center gap-2">
                See How It Works
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </a>

            <a
              href="#pricing"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20"
            >
              Start Free Today
            </a>
          </div>

          {/* 6. SUBTLE PROOF FOOTER */}
          {/* <div className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-6">
              Trusted by performance-obsessed teams
            </p>
            <div className="flex gap-8 opacity-40 grayscale filter transition-all hover:grayscale-0 hover:opacity-100 cursor-default">
              <span className="text-xl font-bold">WordPress</span>
              <span className="text-xl font-bold">Next.js</span>
              <span className="text-xl font-bold">Shopify</span>
            </div>
          </div> */}
        </div>
      </section>

      {/* Smooth Transition Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {features.map((f, idx) => (
            <FeatureBlock key={f.title} feature={f} reversed={idx % 2 === 1} />
          ))}
        </div>
      </section>

      {/* Additional Features */}
      <section
        id="additional-features"
        className="relative py-24 bg-primary/5 overflow-hidden"
      >
        {/* Subtle decorative element to make the white bg look premium */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />

        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          {/* Section Badge */}
          <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-bold tracking-[0.2em] uppercase bg-primary/10 text-primary/80 rounded-full">
            Extended Capabilities
          </span>

          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            There&apos;s More
          </h2>

          <p className="mt-6 text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed font-light">
            Finding what&apos;s causing bottlenecks is only half the story. We
            provide the
            <span className="text-primary font-semibold">
              {" "}
              additional guidance and tools{" "}
            </span>
            to make improving your page performance effortless.
          </p>

          {/* Cards Container */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {extraFeatures.map((card, idx) => (
              <motion.div
                key={idx}
                whileHover={{
                  y: -10,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="group relative bg-primary/80 rounded-2xl p-8 text-left shadow-xl shadow-primary/5 cursor-pointer flex-1 overflow-hidden"
              >
                {/* Subtle Background Pattern for the card */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />

                {/* Your specific Hover Gradient - Applied cleanly */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br from-indigo-600/80 via-purple-600/80 to-pink-600/80 z-0" />

                {/* Content Wrapper (Ensures text stays on top of hover gradient) */}
                <div className="relative z-10">
                  {/* Minimalist Icon/Numbering Standout */}
                  <div className="w-10 h-10 mb-6 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-mono text-sm font-bold shadow-inner">
                    0{idx + 1}
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight mb-4">
                    {card.title}
                  </h3>

                  <div className="text-sm text-white/80 leading-relaxed font-medium">
                    {card.desc}
                  </div>

                  {/* Bottom Accent Line */}
                  <div className="mt-8 h-1 w-12 bg-white/20 rounded-full group-hover:w-full transition-all duration-500 origin-left" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mb-32 -ml-32" />
      </section>

      {/* Legacy Section */}
      <section id="speedy" className="relative py-32 bg-white overflow-hidden">
        {/* BLENDING ELEMENT: A subtle vertical line that "connects" the sections */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-linear-to-b from-primary/20 to-transparent" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            {/* EVOLUTION BADGE */}
            <div className="flex items-center gap-3 mb-8 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 shadow-sm shadow-amber-100/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Our Evolution
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight max-w-4xl">
              From{" "}
              <span className="relative inline-block">
                <span className="relative z-10 italic font-serif text-primary">
                  WordPress Optimization
                </span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-blue-600/50 -rotate-1" />
              </span>
              <span className="mx-3 text-slate-300 font-light">→</span>
              To Smart Performance Assistance
            </h2>

            {/* THE STORY CONTENT */}
            <div className="mt-12 space-y-8">
              <p className="text-xl text-slate-600 max-w-3xl mx-auto font-light leading-relaxed">
                Our journey began with a dedicated solution for WordPress
                optimization. Rooted in the mission to improve site speed and
                user experience, we helped many websites enhance their Core Web
                Vitals.
              </p>

              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 relative group">
                <p className="text-slate-600 leading-relaxed italic">
                  "Extending the same DNA, Speedy Site now empowers you with
                  actionable insights, real-time metrics, and historical data to
                  deliver a seamless user experience."
                </p>
                {/* Subtle DNA-style icon decoration */}
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                    <path d="M2 3c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                    <line x1="8" y1="20" x2="8" y2="4" />
                    <line x1="16" y1="20" x2="16" y2="4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* LEGACY LINKS - Styled as professional chips */}
            <div className="mt-16 pt-10 border-t border-slate-100 w-full">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                Looking for legacy services?
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/wordpress-optimization"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  WordPress Speed Optimization
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="relative bg-slate-50 py-25 overflow-hidden border-t border-slate-100"
      >
        {/* BLENDING ELEMENT: Subtle Mesh Gradient for depth */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px]" />
        </div>

        {/* CONTINUITY: Faint grid lines to match the "SaaS/Performance" theme */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* SECTION HEADER */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
              <svg
                className="w-3 h-3 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                Verified Results
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Trusted by{" "}
              <span className="text-primary italic font-serif">
                Site Owners
              </span>
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto text-lg font-light">
              Over 150 business owners trust us to turn performance data into
              faster, smoother websites with green Web Vitals.
            </p>
          </div>

          {/* THE TESTIMONIALS COMPONENT */}
          <div className="relative">
            {/* Decorative large quote mark watermark */}
            <span className="absolute -top-10 -left-10 text-[15rem] font-serif text-slate-200/40 select-none pointer-events-none leading-none">
              “
            </span>

            <Testimonials />

            <span className="absolute -bottom-24 -right-10 text-[15rem] font-serif text-slate-200/40 select-none pointer-events-none leading-none">
              ”
            </span>
          </div>

          {/* FOOTER CALL-OUT (Optional, adds "Standout" feel) */}
          {/* <div className="mt-20 text-center">
            <div className="inline-flex items-center gap-8 py-4 px-8 rounded-2xl bg-white border border-slate-200/60 shadow-sm shadow-slate-200/20 grayscale opacity-60">
              <span className="font-bold text-slate-400">Elementor</span>
              <span className="font-bold text-slate-400">WooCommerce</span>
              <span className="font-bold text-slate-400">WP Engine</span>
              <span className="font-bold text-slate-400">Cloudflare</span>
            </div>
          </div> */}
        </div>
      </section>

      {/* Feature Comparison */}
      <section
        id="pricing"
        className="relative overflow-hidden bg-indigo-950" // Base dark for depth
      >
        {/* 1. THE CORE GRADIENT BACKGROUND */}
        <div className="absolute inset-0 bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-700 opacity-90" />

        {/* 2. AMBIENT GLOW ORBS (The Standout factor) */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-[120px]" />

        {/* 3. THE DOTS LAYER - Preserved and refined */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 z-10"
          style={{
            backgroundImage: `
              radial-gradient(circle, white 1.5px, transparent 1.5px), 
              radial-gradient(circle, white 1.5px, transparent 1.5px),
              radial-gradient(circle, white 1px, transparent 1px)
            `,
            backgroundSize: "93px 93px, 51px 51px, 37px 37px",
            backgroundPosition: "0 0, 15px 35px, 10px 10px",
            maskImage:
              "radial-gradient(circle at center, black, transparent 90%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black, transparent 90%)",
          }}
        />

        <div className="relative z-20 w-full px-6 text-center py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            {/* HEADER DESIGN */}
            <div className="mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                What you get?
              </h2>
              <div className="mt-4 h-1.5 w-20 bg-white/20 mx-auto rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-white animate-shimmer" />
              </div>
              <p className="mt-6 mx-auto max-w-3xl text-indigo-100 text-lg font-light leading-relaxed">
                Our goal is to provide deeper, continuously collected
                performance insights and highlight potential bottlenecks so you
                can optimize user experience proactively.
              </p>
            </div>

            {/* 4. COMPARISON TABLE CONTAINER - Glassmorphism Wrapper */}
            <div className="relative group">
              {/* Subtle border glow on hover */}
              <div className="absolute -inset-1 bg-white/10 rounded-[2.1rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
                <ComparisonTable />
              </div>
            </div>

            {/* FOOTER CTA */}
            <div className="mt-20">
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm text-sm text-indigo-50 mb-8">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Start free. No credit card needed.
              </div>

              <div className="flex flex-col items-center">
                <Link
                  href="/sign-up"
                  className="group relative inline-flex items-center gap-2 rounded-full bg-white text-indigo-700 px-10 py-3 font-bold text-lg hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-900/20"
                >
                  Sign Up Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="mt-4 text-xs font-bold text-white/70 uppercase tracking-[0.2em]">
                  Upgrade later in your account when ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </main>
  );
}
