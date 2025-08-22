"use client";

import { DynamicLogo } from "@/app/(auth)/helpers/dynamicLogo";
import { ArrowRight } from "lucide-react";
import { useSupabaseUser } from "../../components/utils/supabase/AuthProvider";
import Link from "next/link";

export default function Home() {
  const user = useSupabaseUser();

  return (
    <main className="bg-white text-gray-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-indigo-600">
            <DynamicLogo isDark={false} />
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-indigo-600">
              Features
            </a>
            <a href="#speedy" className="hover:text-indigo-600">
              Legacy
            </a>
            <a href="#testimonials" className="hover:text-indigo-600">
              Testimonials
            </a>
            <a href="#pricing" className="hover:text-indigo-600">
              Pricing
            </a>
          </nav>
          {user ? (
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center gap-1 rounded-md bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-500"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="hidden md:inline-flex items-center gap-1 rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
            >
              Try Free <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="mx-auto max-w-7xl px-6 py-32 text-center">
          <h1 className="text-5xl sm:text-[50px] font-extrabold leading-tight">
            Optimize Your Site for Real Visitor Experience
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-indigo-100">
            You know how important rule user experience plays not only when
            someone visits your website but also as a sign for search engines to
            optimize your page rank. Bad page experience can hold back your
            effort to stand out with great contents. So why not understand your
            user experience in real-time? Speedy Site will bring you what GSC
            does in terms of page experience and does more.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <a
              href="#pricing"
              className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-md hover:bg-gray-100"
            >
              Start Free Today
            </a>
            <a
              href="#features"
              className="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-400"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Smooth Transition Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {[
            {
              title: "Live UX Monitoring",
              desc: "Watch real user sessions unfold in real time. Spot exactly where users struggle—no guesswork.",
              image: "/demo/live-ux.png",
            },
            {
              title: "Deep Performance Debugging",
              desc: "Pinpoint slow scripts, API bottlenecks, layout shifts, and poor backend responses instantly.",
              image: "/demo/debug.png",
            },
            {
              title: "AI-Powered Journey Analytics",
              desc: "Track drop-offs, visualize user funnels, and get AI-driven suggestions on where to optimize.",
              image: "/demo/journey.png",
            },
            {
              title: "On-the-fly Image Optimization",
              desc: "Serve optimized, responsive images (WebP/AVIF) from our global edge in milliseconds.",
              image: "/demo/images.png",
            },
          ].map((f, idx) => (
            <div
              key={f.title}
              className={`flex flex-col md:flex-row items-center gap-12 ${
                idx % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Mock image/visual */}
              <div className="flex-1">
                <div className="rounded-lg overflow-hidden shadow-lg bg-gray-100 aspect-video flex items-center justify-center">
                  <span className="text-gray-400 text-sm">
                    [Screenshot: {f.image}]
                  </span>
                </div>
              </div>
              {/* Text */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{f.title}</h3>
                <p className="mt-4 text-gray-600">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Legacy Section */}
      <section id="speedy" className="py-24 bg-gray-50 border-t">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            From Speedy Site → To RUMlytics
          </h2>
          <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
            Our journey began with Speedy Site (WordPress optimization). Now,
            RUMlytics expands that DNA into a complete RUM + performance
            platform for any framework.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            What our users say
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Sarah M.",
                role: "Growth Lead",
                feedback:
                  "RUMlytics showed us drop-offs we never knew about—our conversion rate jumped +28%.",
              },
              {
                name: "James P.",
                role: "CTO",
                feedback:
                  "Debugging LCP & CLS used to take days. Now we get answers in real time.",
              },
              {
                name: "Arjun K.",
                role: "Founder",
                feedback:
                  "Speedy Site was good… RUMlytics takes it to the next level across all stacks.",
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-6 shadow hover:shadow-lg"
              >
                <p className="text-gray-700 italic">“{t.feedback}”</p>
                <p className="mt-4 font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section
        id="pricing"
        className="py-24 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
      >
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold">How we compare</h2>
          <p className="mt-4 text-indigo-200">
            See how RUMlytics stacks up vs others
          </p>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-indigo-100 text-sm">
                  <th className="py-3 px-6 font-semibold"></th>
                  <th className="py-3 px-6 font-semibold">
                    Google Search Console
                  </th>
                  <th className="py-3 px-6 font-semibold">Speedy Site</th>
                  <th className="py-3 px-6 font-semibold">RUMlytics</th>
                </tr>
              </thead>
              <tbody className="bg-white text-gray-800">
                {[
                  ["Real-time UX data", "✖️", "✖️", "✔️"],
                  ["Performance debugging", "✖️", "✔️ basic", "✔️ advanced"],
                  ["Image optimization", "✖️", "✔️ WP only", "✔️ multi-stack"],
                  ["User journey analytics", "✖️", "✖️", "✔️"],
                  [
                    "Free plan",
                    "✔️ limited",
                    "✔️ demo only",
                    "✔️ 1,000 sessions",
                  ],
                ].map((row, idx) => (
                  <tr key={idx} className="border-b last:border-none">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-3 px-6">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-10 text-indigo-100">
            👉 Start free today. No credit card needed. Upgrade later in your
            dashboard when ready.
          </p>
          <a
            href="#"
            className="mt-6 inline-block rounded-md bg-white text-indigo-700 px-8 py-3 font-semibold hover:bg-gray-100"
          >
            Sign Up Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm">© 2025 RUMlytics. All rights reserved.</p>
          <nav className="flex gap-6 text-sm">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#pricing" className="hover:text-white">
              Comparison
            </a>
            <a href="#testimonials" className="hover:text-white">
              Testimonials
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
