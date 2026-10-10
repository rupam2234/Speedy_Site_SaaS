"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";
import SiteHeader from "./header";
import Link from "next/link";
import {
  ComparisonTable,
  PricingCardContent,
  Testimonials,
  TrustpilotWidget,
} from "./index";
import { SiteFooter } from "@/components/theme";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import AutomatedImageSlider from "./automatedSlider";
import { planCards } from "../account/subscription/main";

export interface FeatureCore {
  title: string;
  desc: ReactNode;
  image?: string;
}

const extraFeatures: FeatureCore[] = [
  {
    title: "Real User Performance",
    desc: (
      <>
        <p>
          Core Web Vitals from actual visitors: live and by page, device,
          browser, network, and region. See the speed your users actually
          experience.
        </p>
      </>
    ),
  },
  {
    title: "Issues With Baked Reasons",
    desc: (
      <>
        <p>
          When something slows your site down, the reason comes attached: the
          responsible page, asset, or WordPress plugin, with the data behind it.
          No guesswork, no noise.
        </p>
      </>
    ),
  },
  {
    title: "Optimization Impact",
    desc: (
      <>
        <p>
          Every fix we make appears in your dashboard with its before and after
          impact. Watch improvements land as they happen instead of reading
          about them months later.
        </p>
      </>
    ),
  },
];

const headlines: { head: string; tail: string }[] = [
  {
    head: "WordPress Performance Optimization",
    tail: "Powered by Real User Data",
  },
  {
    head: "Connect Once. Real Data.",
    tail: "Real Fixes That Last.",
  },
];

export default function Home() {
  const [index, setIndex] = useState<number>(0); // index of headline

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % headlines.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="bg-white text-gray-900 w-full overflow-x-hidden">
      <SiteHeader enableNav={true} />

      <section className="relative overflow-hidden bg-[#f5f6f0] py-24 lg:py-32 text-slate-900">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            maskImage: "linear-gradient(to bottom, white, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, white, transparent)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="inline-block"
            >
              <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.15] tracking-tight text-slate-700">
                {headlines[index].head}
                <br />
                <span>{headlines[index].tail}</span>
              </h1>
            </motion.span>
          </AnimatePresence>

          <p className="mt-8 max-w-3xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed font-normal">
            Speedy Site is a managed WordPress performance optimization service.
            Connect your site once: we validate it and
            <span className="px-2 bg-orange-500/70 inline-block -skew-x-5 mx-1.5 text-primary-foreground">
              <span className="skew-x-5">real user performance data</span>
            </span>
            starts flowing right away. Our experts pair those real insights with
            WordPress backend tests to find and fix the issues that actually
            slow your site down.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" }); // smooth scroll
              }}
              className="px-8 py-4 bg-slate-700 text-white rounded-xl font-bold transition-all hover:bg-indigo-600 shadow-md"
            >
              See How It Works
            </a>

            <a
              href="#feature-comparison"
              className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold transition-all hover:bg-slate-50 shadow-sm"
            >
              Start Free Today
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="relative py-10 bg-[#f5f6f0]">
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="mb-10 text-center py-2 px-4 rounded-sm bg-[#314158]/90">
            <p
              className="text-lg text-primary-foreground tracking-tight leading-tight"
              style={{ fontFamily: "math" }}
            >
              The workflow: how real user data turns into real WordPress
              performance fixes
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute left-6.75 top-0 w-0.5 h-full bg-slate-200"></div>

            <div className="space-y-32">
              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-900 flex items-center justify-center text-slate-900 font-black text-xl z-10 relative shadow-sm">
                    1
                  </div>
                </div>
                <div className="flex-1 grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-primary/90">
                      Connect Your Site In Minutes
                    </h3>
                    <p className="text-slate-600 text-lg leading-relaxed">
                      No code, no manual snippets, no configuration. Connect
                      your WordPress site once; we validate it and set up real
                      user monitoring automatically.
                    </p>
                    {/* <div className="flex flex-wrap gap-3 pt-2">
                      {[
                        "No code or snippets",
                        "Instant site validation",
                        "Automatic monitoring setup",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div> */}
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl font-mono text-sm shadow-xl space-y-2">
                    <div className="text-emerald-400">
                      ✓ Connect your site using a plugin
                    </div>
                    <div className="text-emerald-400">
                      ✓ Automatic debugging setup
                    </div>
                    <div className="text-emerald-400">
                      ✓ Flags bottlenecks for accurate solution
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#615fff] border-2 border-slate-900 flex items-center justify-center text-white font-black text-xl z-10 relative">
                    2
                  </div>
                </div>
                <div className="flex-1 grid md:grid-cols-2 gap-12 items-start">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-bold text-primary/90">
                      Collect Real User Data
                    </h3>
                    <p className="text-slate-600 text-lg">
                      Once validated, Speedy Site collects privacy-first
                      performance data from real visitors: Core Web Vitals,
                      devices, browsers, networks, pages, and geographic
                      locations. Issues surface exactly as users experience
                      them.
                    </p>
                    <p className="text-slate-600 text-lg">
                      Weekly performance insights highlight the bottlenecks we
                      identify and fix before they start to appear on your
                      Google Search Console.
                    </p>
                  </div>
                  <Image
                    src={"/images/homepage/ux-analytics.png"}
                    alt="ux-analytics"
                    width={650}
                    height={350}
                    className="shadow-xl items-start rounded-sm"
                  />
                </div>
              </div>

              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center border-2 border-slate-900 justify-center text-primary font-black text-xl z-10 relative shadow-md">
                    3
                  </div>
                </div>
                <div className="flex-1 grid md:grid-cols-2 gap-12 items-start">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-bold text-primary/90">
                      Diagnose With Baked Reasons
                    </h3>
                    <p className="text-slate-600 text-lg leading-relaxed">
                      Real user data combined with WordPress backend tests
                      identifies the responsible elements, plugins, and scripts
                      behind each issue on every page, with the reason baked in.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Slow images / fonts detection",
                        "Elements causing layout instability",
                        "Plugin weight & backend pressure",
                        "Flagging slow server responses",
                        "Problem breakdown by page groups",
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-3 text-slate-700 font-semibold text-sm"
                        >
                          <span className="text-emerald-500">✔</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Image
                    src={"/images/homepage/Element-debugging.png"}
                    alt="problematic-elements"
                    width={650}
                    height={350}
                    className="shadow-xl rounded-sm"
                  />
                </div>
              </div>

              <div className="relative flex flex-col md:flex-row gap-12 group">
                <div className="flex-none relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#615fff] border-2 border-slate-900 flex items-center justify-center text-white font-black text-xl z-10 relative">
                    4
                  </div>
                </div>
                <div className="flex-1 grid md:grid-cols-2 gap-12 items-start">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-bold text-primary/90">
                      A lot more...
                    </h3>
                    <ul className="space-y-3">
                      {[
                        "Measures your site's cache efficiency, user experience by location, device, network and browsers.",
                        "Integrated real-time view of real user experience / web vitals",
                        "Every optimization tracked with before / after impact",
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 text-slate-700 font-semibold text-sm"
                        >
                          <span className="text-emerald-500">✔</span> {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-slate-600 text-lg leading-relaxed">
                      Most performance audits drown you in noise. Ours do not.
                      RUM data zeroes in on what is actually hurting real
                      visitors and your web vitals, so the work that gets done
                      is work that matters. You follow every step and its impact
                      in your dashboard.
                    </p>
                  </div>
                  <AutomatedImageSlider />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section
        id="additional-features"
        className="relative overflow-hidden bg-[#f5f6f0] py-24 lg:py-32 text-slate-900"
      >
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          <span className="inline-block px-4 py-1.5 mb-6 text-[12px] font-bold tracking-[0.2em] uppercase bg-primary/10 border border-primary/10 text-primary rounded-full">
            Built for transparency
          </span>

          <p className=" text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed font-light">
            The optimization work is ours; the visibility is yours. Watch your
            real visitor performance, see the issues we find, and follow the
            impact of every fix as it lands.
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
      </section>

      {/* Legacy Section */}
      <section
        id="speedy"
        className="relative overflow-hidden bg-[#f5f6f0] py-5 lg:py-5 text-slate-900"
      >
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            {/* APPROACH BADGE */}
            <div className="flex items-center gap-3 mb-8 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 shadow-sm shadow-amber-100/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Our Approach
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight max-w-4xl">
              We optimize your WordPress site based on{" "}
              <span className="relative inline-block">
                <span className="relative z-10 italic font-serif text-primary">
                  real user performance logs
                </span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-blue-600/50 -rotate-1" />
              </span>{" "}
              and an integrated testing pipeline.
            </h2>

            {/* THE STORY CONTENT */}
            <div className="mt-12 space-y-8">
              <p className="text-xl text-slate-600 max-w-3xl mx-auto font-light leading-relaxed">
                We started as a WordPress optimization service and built a real
                user monitoring platform to sharpen it. Somewhere along the way,
                the tool became the story; we&apos;re changing that back.
              </p>

              <div className="p-8 rounded-3xl bg-slate-50 border-2 border-primary/10 relative group">
                <p className="text-slate-600 leading-relaxed italic">
                  &quot;Speedy Site is a WordPress performance optimization
                  service powered by real user data. Connecting your site once
                  validates it and collects evidence; real user insights plus
                  WordPress backend tests bake the reasons into every issue, so
                  our experts fix what actually slows your site, faster.&quot;
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

            {/* LEGACY LINKS - now the core service lives on the homepage;
            standalone pages linked from the Tools menu */}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="relative overflow-hidden bg-[#f5f6f0] py-5 lg:py-32 text-slate-900"
      >
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* SECTION HEADER */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-primary/20 mb-6">
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
              Over 150 WordPress sites trust us to turn performance data into
              faster, smoother websites with green Web Vitals.
            </p>
          </div>

          <TrustpilotWidget />

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
        id="feature-comparison"
        className="relative overflow-hidden bg-indigo-950" // Base dark for depth
      >
        <div className="absolute inset-0 bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-700 opacity-90" />

        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-[120px]" />

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
            <div className="mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                What you get?
              </h2>
              <div className="mt-4 h-1.5 w-20 bg-white/20 mx-auto rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-white animate-shimmer" />
              </div>
              <p className="mt-6 mx-auto max-w-3xl text-indigo-100 text-lg font-light leading-relaxed">
                Our goal is to monitor your WordPress site performance from real
                user data, keep it fast and UX-friendly by the Core Web Vitals
                standard, and show you the impact of every optimization along
                the way.
              </p>
              <p className="mt-6 mx-auto max-w-3xl text-indigo-100 text-lg font-light leading-relaxed">
                Speedy Site gives you real-time visibility into your Web Vitals
                across every page. Monitor site performance and follow each
                optimization with its measured impact as it happens, for
                complete transparency.
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
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="relative overflow-hidden bg-[#f5f6f0] py-14 lg:py-15 text-slate-900"
      >
        <div className="max-w-7xl mx-auto px-11 relative z-10">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 mb-5 text-[12px] font-bold tracking-[0.2em] uppercase bg-primary/10 border border-primary/10 text-primary rounded-full">
              One-Time Payment · Single Plan
            </span>
            {/* <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Pay $299 once. Get a full year of WordPress performance
              optimization.
            </h2> */}
            <p className="mt-4 text-slate-600 text-lg leading-relaxed font-light">
              That covers site validation, unlimited real user monitoring,
              baked-reason issue diagnosis, and our full optimization service
              for 12 months. Renew only if you want another year; never billed
              automatically.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            {planCards
              .filter((X) => X.name === "Managed WordPress Performance")
              .map((X) => {
                return (
                  <PricingCardContent
                    key={X.name}
                    props={{
                      name: X.name,
                      price: X.price,
                      billingCycle: "monthly",
                      current: X.current || false,
                      defaultPrice: X.price,
                      description: X.description,
                      displayPrice: X.price,
                      features: X.features,
                      highlight: false,
                    }}
                  />
                );
              })}
          </div>
        </div>

        <div className="flex flex-col py-10 space-y-3 items-center">
          <Link
            href="/sign-up"
            className="group relative inline-flex items-center gap-2 rounded-full bg-white text-indigo-700 px-10 py-3 font-bold text-lg hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-900/20"
          >
            Sign up for free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          {/* <p className="mt-4 text-xs font-bold text-primary/60 uppercase tracking-[0.2em]">
            Pay once: no subscription, no auto-renewals
          </p> */}
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </main>
  );
}
