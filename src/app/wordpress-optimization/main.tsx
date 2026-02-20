"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Gauge,
  Rocket,
  ShieldCheck,
  Check,
  ArrowRight,
  Activity,
} from "lucide-react";
import { SiteHeader } from "../(home)";
import { SiteFooter } from "@/components/theme";
import ServiceTestimonials from "@/components/feedbacks/testimonials";

export default function WPOptimizationService() {
  const serviceIncludes = [
    "Premium Caching Implementation",
    "Full-Scale Image Optimization",
    "Scheduled Database Maintenance",
    "Server & Cloudflare Tuning",
    "Core Web Vitals Pass Guarantee",
    "Monthly Performance Monitoring",
  ];

  return (
    <>
      <SiteHeader enableNav={false} />
      <div className="bg-[#0a0a0c] text-white min-h-screen font-sans">
        {/* 1. HERO: The Modern Service Entry */}
        <section className="relative pt-32 pb-24 overflow-hidden border-b border-white/5">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-0 right-0 w-125 h-125 bg-indigo-600/10 blur-[120px] rounded-full -mr-40 -mt-40" />

          <div className="relative z-10 max-w-5xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-8"
            >
              Expert-Led Service
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-8">
                  WordPress <br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400">
                    Speed Optimization
                  </span>
                </h1>
                <p className="text-md text-slate-400 font-light leading-relaxed mb-10">
                  Our hands-on, expert WordPress speed optimization service is
                  now powered by our Real User Monitoring engine. We don&apos;t
                  just tweak plugins—we analyze your site&apos;s real user
                  experience, pinpoint performance issues, and eliminate actual
                  bottlenecks to boost speed and reliability.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  {serviceIncludes.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 text-sm text-slate-300"
                    >
                      <div className="h-5 w-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Check size={12} className="text-indigo-400" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>

                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-bold transition-all shadow-xl shadow-indigo-500/20"
                >
                  Pricing <ArrowRight size={18} />
                </Link>
              </div>

              <div className="relative flex justify-center">
                <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse" />
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative z-10 p-12 bg-white/5 border border-white/10 rounded-full backdrop-blur-3xl"
                >
                  <Rocket
                    size={120}
                    className="text-white opacity-80"
                    strokeWidth={1}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. WHY SPEEDY SITE: THE "REAL" VERSION */}
        <section className="bg-[#0a0a0c] py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Speedy Site WP optimization service is the Right Choice
              </h2>
              <p className="text-slate-400 font-light max-w-3xl mx-auto text-lg">
                Most "optimization" services just install a few plugins and
                leave. We analyze your real user experience with our integrated
                RUM system, find out bottlenecks, provide you full site analysis
                data. There's more! We optimize your cache setup, optimize codes
                and unload bloats to ensure your site hits peak performance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Activity className="text-blue-400" />,
                  title: "Data-backed Decisions",
                  desc: "We examine your waterfall charts and Web Vitals history, identify performance bottlenecks, remove bloat, and fine-tune your assets for maximum speed.",
                },
                {
                  icon: <ShieldCheck className="text-indigo-400" />,
                  title: "Zero-Risk Execution",
                  desc: "Every change is made in a sandbox or backed up instantly. Your design, tracking, and sales funnels remain 100% intact.",
                },
                {
                  icon: <Gauge className="text-purple-400" />,
                  title: "Long-Term Velocity",
                  desc: "We configure automated maintenance routines so your site stays fast months after we've finished our work.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-10 rounded-3xl bg-white/2 border border-white/5 hover:border-indigo-500/30 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ServiceTestimonials />

        {/* 3. PRICING: SIMPLE & STANDOUT */}
        <section
          id="pricing"
          className="py-24 bg-indigo-600/5 border-y border-white/5"
        >
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-8"
            >
              A standalone Speedy.site service with a dedicated dashboard,
              independent of the main site dashboard.
            </motion.div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">
                  Simple Pricing for <br /> WordPress Optimization
                </h2>
                <p className="text-slate-400 mb-8 max-w-md">
                  One-time payment for a complete performance overhaul. No
                  recurring fees, just a faster site.
                </p>

                <div className="space-y-4">
                  {[
                    "Manual Technical Audit",
                    "Core Web Vitals Pass",
                    "Image & Script Delivery Tuning",
                    "30-Day Performance Guarantee",
                  ].map((t) => (
                    <div
                      key={t}
                      className="flex items-center gap-3 text-sm font-medium"
                    >
                      <Check size={16} className="text-emerald-500" /> {t}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full" />
                <div className="relative bg-[#111114] border border-white/10 p-12 rounded-[2.5rem] text-center shadow-2xl">
                  <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-2">
                    Total Service Cost
                  </p>
                  <div className="text-7xl font-black mb-8">$199</div>
                  <Link
                    href="https://my.speedy.site/order/speedy-service?_ga=2.47580967.1222724388.1629098855-112360774.1622306433"
                    className="block w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Get Started Today
                  </Link>
                  <p className="mt-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Secure Payment via Stripe
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. THE PROCESS: 1-2-3 STEPS */}
        <section className="py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              {[
                {
                  step: "01",
                  title: "Place Your Order",
                  desc: "Secure your spot and provide your site details via our encrypted onboarding.",
                },
                {
                  step: "02",
                  title: "Track Status",
                  desc: "Monitor our technical progress through your dedicated service dashboard.",
                },
                {
                  step: "03",
                  title: "Get a Faster Site",
                  desc: "Receive your final CWV report and experience a lightning-fast WordPress site.",
                },
              ].map((s, idx) => (
                <div key={idx} className="space-y-6">
                  <div className="text-5xl font-black text-white/10 group-hover:text-indigo-500/20 transition-colors">
                    {s.step}
                  </div>
                  <h4 className="font-bold text-xl">{s.title}</h4>
                  <p className="text-sm text-slate-500 font-light leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. THE SIMPLE GUARANTEE (White Section Blend) */}
        <section className="z-20 py-24 bg-white text-black">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-slate-50 rounded-[3rem] p-12 border border-slate-200 flex flex-col md:flex-row items-center gap-12">
              <div className="shrink-0 text-center">
                <div className="w-32 h-32 rounded-full border-10 border-slate-900 flex flex-col items-center justify-center mb-4">
                  <span className="text-3xl font-black">100%</span>
                  <span className="text-[8px] font-bold uppercase tracking-tighter leading-none text-center">
                    Satisfaction
                    <br />
                    Guaranteed
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tight">
                  Speedy Site&apos;s Simple Guarantee
                </h2>
                <ul className="space-y-3">
                  {[
                    "You won't pay a cent unless we improve your speed metrics.",
                    "We manually verify every change to ensure zero design breakage.",
                    "Full data backups are performed before any work begins.",
                    "A detailed technical changelog is provided at completion.",
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                      <Check size={18} className="text-indigo-600 shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FOOTER */}
        <section className="py-5 border-t border-white/5 text-center">
          <div className="max-w-3xl mx-auto px-6">
            <p className="text-slate-500 text-sm italic">
              Part of the Speedy.Site Performance Ecosystem.
            </p>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
