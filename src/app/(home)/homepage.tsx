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
    title: "Cache Management",
    desc: (
      <>
        <p>
          Improve your site's TTFB worldwide by leveraging Cloudflare’s CDN with
          advanced configurations. Track cache hit rates automatically, receive
          instant alerts, and ensure consistent high performance across your top
          regions.
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
              "radial-gradient(circle at center, black, transparent 60%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black, transparent 60%)",
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
            Fix Core Web Vitals <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
              Before They Hurt Your Rankings
            </span>
          </h1>

          <p className="mt-8 max-w-3xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed font-light">
            See real user performance across devices, regions, pinpoint Core Web
            Vitals bottlenecks instantly, and fix what’s hurting your rankings.
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
        </div>
      </section>

      {/* Smooth Transition Features */}
      <section
        id="features"
        className="relative py-32 bg-[#14142e] overflow-hidden"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="max-w-2xl mb-20">
            <h2 className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">
              The Workflow
            </h2>
            <p className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              From zero data to{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">
                performance mastery
              </span>{" "}
              in four steps.
            </p>
          </div>

          <div className="relative">
            {/* The Animated Connecting Line (Hidden on Mobile) */}
            <div className="hidden md:block absolute left-6.75 top-0 w-0.5 h-full bg-linear-to-b from-indigo-500 via-blue-500 to-emerald-500 opacity-30"></div>

            <div className="space-y-32">
              {/* Step 1: Install */}
              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl z-10 relative shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-white">
                        Install in Minutes
                      </h3>
                      <p className="text-slate-400 text-lg leading-relaxed">
                        Getting started is as simple as adding a snippet. No
                        infrastructure overhead, no complex config.
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        {[
                          "Short script",
                          "Validate connection",
                          "Instant data",
                        ].map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Pure CSS Code Block Visual */}
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm font-mono text-sm shadow-2xl">
                      <div className="flex gap-1.5 mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/20"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20"></div>
                      </div>
                      <div className="text-indigo-400">
                        &lt;script <span className="text-cyan-400">async</span>
                        &gt;
                      </div>
                      <div className="pl-4 text-slate-300">
                        src={" "}
                        <span className="text-indigo-400">
                          "https://rum.speedy.site/rum.js?v=
                          <span className="text-slate-300">(V)</span>&id=
                          <span className="text-slate-300">(ID)</span>"
                        </span>
                        <span className="text-emerald-400">defer</span>
                        <span className="text-indigo-400">{">"}</span>
                      </div>
                      <div className="text-indigo-400">&lt;/script&gt;</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: See Experience */}
              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl z-10 relative">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <h3 className="text-3xl font-bold text-white">
                        See Real User Experience
                      </h3>
                      <p className="text-slate-400 text-lg">
                        Know exactly where users struggle — by device, location,
                        and page.
                      </p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                          <span className="text-slate-300">Poor LCP Users</span>
                          <span className="text-red-400 font-bold">7%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                          <span className="text-slate-300">Mobile Latency</span>
                          <span className="text-amber-400 font-bold">
                            +1.2s
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative p-1 rounded-3xl bg-linear-to-br from-blue-500/20 to-transparent">
                      <div className="bg-[#0b0f1a] rounded-[22px] p-4 md:p-6 border border-white/5 shadow-inner overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex gap-2">
                            <div className="px-2 py-1 rounded bg-white/10 text-[10px] text-white font-medium border border-white/10">
                              LCP Timeline
                            </div>
                            <div className="hidden sm:block text-[9px] text-slate-500 mt-1">
                              LCP measures render time of the largest image...
                            </div>
                          </div>
                          <div className="text-[10px] bg-white/5 px-2 py-1 rounded text-slate-400 border border-white/5">
                            P75
                          </div>
                        </div>

                        <div className="flex gap-6">
                          {/* Sidebar Metrics */}
                          <div className="hidden md:flex flex-col gap-4 w-28 border-r border-white/5 pr-4">
                            <div>
                              <div className="text-[10px] text-slate-500 mb-1">
                                UX Score
                              </div>
                              <div className="relative w-10 h-10 flex items-center justify-center">
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r="18"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-slate-800"
                                  />
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r="18"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray="100"
                                    strokeDashoffset="15"
                                    className="text-emerald-500"
                                  />
                                </svg>
                                <span className="text-[10px] font-bold text-white">
                                  89
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[9px] text-slate-400">
                                  Largest Paint
                                </div>
                                <div className="text-[10px] text-emerald-400 font-bold">
                                  1.95s
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400">
                                  Layout Shift
                                </div>
                                <div className="text-[10px] text-amber-400 font-bold">
                                  0.110
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Main Chart Area */}
                          <div className="flex-1">
                            <div className="relative h-32 w-full">
                              {/* Simple Wave SVG */}
                              <svg
                                viewBox="0 0 400 100"
                                className="w-full h-full overflow-visible"
                              >
                                {/* Grid Line */}
                                <line
                                  x1="0"
                                  y1="20"
                                  x2="400"
                                  y2="20"
                                  stroke="currentColor"
                                  strokeDasharray="4 4"
                                  className="text-emerald-500/30"
                                />

                                {/* Area Fill */}
                                <path
                                  d="M0,80 Q50,20 100,70 T200,40 T300,60 T400,20 V100 H0 Z"
                                  fill="url(#chartGradient)"
                                  opacity="0.2"
                                />

                                {/* Line Path */}
                                <path
                                  d="M0,80 Q50,20 100,70 T200,40 T300,60 T400,20"
                                  fill="none"
                                  stroke="#6366f1"
                                  strokeWidth="2"
                                />

                                {/* Dots */}
                                <circle
                                  cx="50"
                                  cy="20"
                                  r="3"
                                  className="fill-amber-500 shadow-lg"
                                />
                                <circle
                                  cx="200"
                                  cy="40"
                                  r="3"
                                  className="fill-white"
                                />
                                <circle
                                  cx="400"
                                  cy="20"
                                  r="3"
                                  className="fill-amber-500"
                                />

                                <defs>
                                  <linearGradient
                                    id="chartGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop
                                      offset="100%"
                                      stopColor="transparent"
                                    />
                                  </linearGradient>
                                </defs>
                              </svg>
                            </div>

                            {/* Bottom Status Bars */}
                            <div className="mt-6 grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <div className="text-[9px] text-slate-400 flex justify-between">
                                  <span>Good</span>
                                  <span className="text-white">77%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full w-[77%] bg-emerald-500"></div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[9px] text-slate-400 flex justify-between">
                                  <span>Needs</span>
                                  <span className="text-white">16%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full w-[16%] bg-amber-500"></div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[9px] text-slate-400 flex justify-between">
                                  <span>Poor</span>
                                  <span className="text-white">7%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full w-[7%] bg-red-500"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Identify (The Power Section) */}
              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl z-10 relative">
                    3
                  </div>
                </div>
                <div className="flex-1 rounded-3xl bg-indigo-900/10 border border-indigo-500/20 p-8 md:p-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 font-black italic">
                    ROOT CAUSE
                  </div>
                  <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-3xl font-bold text-white mb-2">
                          Identify What’s Causing It
                        </h3>
                        <p className="text-indigo-300 font-medium text-lg">
                          Detect elements responsible for performance
                          bottlenecks
                        </p>
                      </div>
                      <ul className="space-y-4">
                        {[
                          "LCP Image Detection",
                          "CWV Contributing Element Detection",
                          "Distribution by Pages & Connections",
                          "Cache Monitoring",
                        ].map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-3 text-white font-medium"
                          >
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 text-emerald-400 text-[10px]">
                              ✔
                            </div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-black/40 rounded-2xl border border-white/5 p-5 space-y-4 backdrop-blur-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Contributing Elements
                        </div>
                        <div className="text-[9px] text-slate-600 font-medium">
                          1 of 3 items
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Row 1: Text Element */}
                        <div className="flex items-start justify-between group">
                          <div className="flex gap-3">
                            <div className="mt-1 text-slate-500 text-xs font-bold">
                              T
                            </div>
                            <div>
                              <div className="text-[10px] font-mono text-indigo-300 break-all leading-tight max-w-45">
                                div.card-body &gt; div.entry-content &gt; p
                              </div>
                              <div className="text-[9px] text-slate-500 mt-1">
                                /how-to-make-cleaner
                              </div>
                              <div className="text-[8px] text-slate-600 mt-0.5 italic">
                                Captured 1 times
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-500 flex items-center gap-1">
                              <span>⏳</span> 0.50s
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Video/Image Element */}
                        <div className="flex items-start justify-between pt-3 border-t border-white/5">
                          <div className="flex gap-3">
                            <div className="mt-1 text-slate-500">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <div className="text-[10px] font-mono text-indigo-300 leading-tight">
                                video.raptive-player-video
                              </div>
                              <div className="text-[9px] text-slate-500 mt-1">
                                /privacy-policy
                              </div>
                              <div className="text-[8px] text-slate-600 mt-0.5 truncate max-w-30">
                                Address: https://cdn.jwplayer.com/v2...
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end max-w-25">
                            <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 flex items-center gap-1">
                              <span>⏳</span> 0.01s
                            </div>
                            <div className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[9px] text-rose-400 flex items-center gap-1">
                              <span>⚡</span> 0.89s
                            </div>
                            <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 flex items-center gap-1">
                              <span>🎨</span> 0.02s
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Image Element */}
                        <div className="flex items-start justify-between pt-3 border-t border-white/5">
                          <div className="flex gap-3">
                            <div className="mt-1 text-slate-500">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <div className="text-[10px] font-mono text-indigo-300 leading-tight">
                                #attachment_1509 &gt; img
                              </div>
                              <div className="text-[9px] text-slate-500 mt-1">
                                /bbq-chicken-nachos
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <div className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-500 flex items-center gap-1">
                              <span>🎨</span> 0.48s
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Fix & Track */}
              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-black text-xl z-10 relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <h3 className="text-3xl font-bold text-white">
                        Fix & Track Improvements
                      </h3>
                      <p className="text-slate-400 text-lg">
                        Ship fixes with confidence and see impact instantly.
                        Monitor global and local cwv trends and get alerted
                        before users notice a regression.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                          <div className="text-2xl mb-1">📅</div>
                          <div className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                            Weekly Summaries
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                          <div className="text-2xl mb-1">🔔</div>
                          <div className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                            Real-time Alerts
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-linear-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition"></div>
                      <div className="relative bg-[#0b0f1a] p-6 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                          <div className="text-white font-bold text-sm tracking-tight">
                            Score Trend
                          </div>
                          <div className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded">
                            +12% vs last week
                          </div>
                        </div>
                        {/* Simplified Trend Line with SVG */}
                        <svg
                          viewBox="0 0 100 30"
                          className="w-full h-24 stroke-emerald-500 stroke-2 fill-none overflow-visible"
                        >
                          <path d="M0,25 Q15,25 30,15 T60,18 T100,2" />
                          <circle
                            cx="100"
                            cy="2"
                            r="3"
                            className="fill-emerald-400 animate-pulse"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
