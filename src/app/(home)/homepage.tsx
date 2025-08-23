"use client";

import { motion } from "framer-motion";
import { ReactNode, useRef } from "react";
import { useInView } from "framer-motion";
import SiteHeader from "./header";
import { Link2Icon } from "lucide-react";
import Link from "next/link";

interface FeatureCore {
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
          Understand not just the average performance, but how it varies across
          your user base. See what percentage of users fall into fast, average,
          or poor experience tiers, enabling precise optimization strategies by
          device type and user share.
        </p>
        <p className="text-lg text-gray-600">
          You can analyze user experience across the full spectrum, not just
          averages.{" "}
          <span className="bg-amber-300">
            This is not just about how fast the site is
          </span>
          ,{" "}
          <span className="bg-green-300">
            you need to know how many users are impacted
          </span>{" "}
          so you can prioritize improvements that affect the largest segments of
          your audience
        </p>
      </div>
    ),
    image: "/images/RUM-dashboard-screenshot.png",
  },
  {
    title: "Never Let Poor Page UX Go Unnoticed",
    desc: (
      <div className="space-y-4">
        <p className="text-lg text-gray-600">
          Google Search Console highlights pages with the most serious
          experience issues. It&apos;s a helpful starting point to fix core
          problems. But that&apos;s not the whole story. What about the rest of
          your?
        </p>
        <p className="text-lg text-gray-600">
          A healthy website delivers great content and a great experience across
          all pages, not just the popular ones.{" "}
          <span className="bg-blue-200">
            Page Group can classify page experience across all traffic-driving
            pages
          </span>{" "}
          — whether they&apos;re new, niche, or top-performers — so you can
          monitor and improve UX site-wide, not just where GSC shines a light.
        </p>
      </div>
    ),
    image: "/images/page_groups_by_experience.png",
  },
  {
    title: "Have Issues Flagged Before Frustrating Users",
    desc: (
      <>
        <div className="space-y-4">
          <p className="text-lg text-gray-600">
            slow load times, layout shifts, or interactivity delays can silently
            impact your audience&apos;s experience. Instead of waiting for user
            leaving early with frustration or in worst case, SEO penalties you
            need to fix these problems.
          </p>
          <p className="text-lg text-gray-600">
            RUM understands when a user experience something unstable. Combined
            with SpeedySite&apos;s interactive debugging utilities you can spot
            problems and get dedicated suggestions + AI reviews to fix what
            could possibly hurt your site.
          </p>
        </div>
      </>
    ),
    image: "/images/CLS_debugging.png",
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
    image: "/images/image-detection.png",
  },
];

const extraFeatures: FeatureCore[] = [
  {
    title: "Integrated Optimization Assistance",
    desc: (
      <>
        <p>
          You can submit your performance and UX bottlenecks to the legacy
          Speedy Site service for expert optimization support.
        </p>
      </>
    ),
  },
  {
    title: "Pre-optimized / On The Fly Image Optimization",
    desc: (
      <>
        <p>
          Only tools you will need to optimize your worst performing images
          based on real-time data or scale on the fly
        </p>
      </>
    ),
  },
  {
    title: "TTFB Boost On Your Current Setup",
    desc: (
      <>
        <p>
          Enjoy faster load times and a smoother experience — Get a TTFB boost
          that works seamlessly with your current setup
        </p>
      </>
    ),
  },
  {
    title: "Debug User Journey Experience",
    desc: (
      <>
        <p>
          Gain insights into user sessions as they move through your
          website&apos;s pages, helping you identify friction points and improve
          the overall browsing experience.
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
    title: "Daily Core Web Vitals Update For Your Domain",
    desc: (
      <>
        <p>
          Speedy Site automatically monitors your Core Web Vitals, maintains
          historical data, and provides actionable insights—so you can focus on
          improving, not tracking.
        </p>
      </>
    ),
  },
];

export default function Home() {
  const year = new Date().getFullYear();

  const ref = useRef(null);
  const isInView = useInView(ref, {
    margin: "-20% 0px -20% 0px",
    once: false,
  });

  return (
    <main className="bg-white text-gray-900 w-full overflow-x-hidden">
      {/* Navigation */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="mx-auto max-w-7xl px-6 py-32 text-center">
          <h1 className="text-5xl sm:text-[50px] font-extrabold leading-tight">
            Delight Users with Effortless Browsing
          </h1>
          <p className="mt-6 max-w-4xl mx-auto text-lg text-indigo-100">
            User experience plays a crucial role, not only in engaging visitors
            but{" "}
            <span className="underline-offset-4 underline">
              also as a search engine ranking signal
            </span>
            . Even great contents may struggle to keep visitors coming back when
            page experience isn&apos;s good enough.
          </p>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-indigo-100">
            Who doesn&apos;t love a fast, smooth-loading page? Instead of
            guessing, why not know exactly how your users experience your site
            in real time? Speedy Site gives you all the UX and Web Vitals info
            Google Search Console does, and does a whole lot more.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <a
              href="#features"
              className="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-400"
            >
              See How It Works
            </a>
            <a
              href="#pricing"
              className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-md hover:bg-gray-100"
            >
              Start Free Today
            </a>
          </div>
        </div>
      </section>

      {/* Smooth Transition Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {features.map((f, idx) => {
            const isReversed = idx % 2 === 1;

            return (
              <div
                ref={ref}
                key={f.title}
                className={`flex flex-col md:flex-row items-center gap-12 ${
                  isReversed ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Image animation */}
                <motion.div
                  initial={{ opacity: 0, x: isReversed ? 100 : -100 }}
                  animate={
                    isInView
                      ? { opacity: 1, x: 0 }
                      : { opacity: 0, x: isReversed ? 100 : -100 }
                  }
                  transition={{ duration: 0.5 }}
                  className="flex-1"
                >
                  <img
                    src={f.image}
                    alt={f.title}
                    fetchPriority="high"
                    className="w-auto h-auto rounded-sm shadow"
                  />
                </motion.div>

                {/* Text animation */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={
                    isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }
                  }
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex-1"
                >
                  <h3 className="text-2xl font-bold text-gray-900">
                    {f.title}
                  </h3>
                  <div className="mt-4">{f.desc}</div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Additional Features */}
      <section id="additional-features" className="py-16 bg-primary/5">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            There&apos;s More
          </h2>
          <p className="mt-6 text-gray-600 max-w-4xl mx-auto">
            Finding what&apos;s causing bottlenecks is only half the story —
            optimizing them is what truly improves performance and creates a
            smoother, frustration-free experience for your users.
          </p>

          {/* Cards Container */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {extraFeatures.map((card, idx) => (
              <motion.div
                key={idx}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                }}
                className="bg-primary/80 rounded-lg p-6 shadow cursor-pointer flex-1 md:hover:bg-gradient-to-br md:hover:from-indigo-600/60 md:hover:via-purple-600/60 md:hover:from md:hover:to-95% md:hover:to-pink-600/60"
                transition={{ type: "spring", stiffness: 300 }}
              >
                <h3 className="text-lg font-semibold text-white tracking-tight">
                  {card.title}
                </h3>
                <div className="mt-3 text-sm text-white/90 leading-relaxed">
                  {card.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Legacy Section */}
      <section id="speedy" className="py-24 bg-gray-50 border-t">
        <div className="max-w-6xl space-y-6 mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            From{" "}
            <span className="bg-amber-200 px-2">
              WordPress Optimization Service
            </span>{" "}
            → To Smart Performance Assistance
          </h2>
          <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
            Our journey began with a dedicated solution for WordPress
            optimization. Rooted in the mission to improve site speed and user
            experience, we helped many websites enhance their Core Web Vitals
            and overall performance. Extending the same DNA, Speedy Site can now
            help you with actionable insights, real-time metrics, and historical
            data, empowering you to optimize your site&apos;s performance and
            deliver a seamless user experience.
          </p>
          <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
            <span className="font-semibold">Looking for legacy services?</span>{" "}
            They can be accessed at{" "}
            <span className="text-blue-700 hover:bg-blue-300 hover:text-white cursor-pointer">
              WordPress Speed Optimization
            </span>{" "}
            and{" "}
            <span className="text-blue-700 hover:bg-blue-300 hover:text-white cursor-pointer">
              WordPress Site Overhaul Service.
            </span>
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-gray-50 pb-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-lg sm:text-2xl font-bold text-primary/70">
            Previous Experience Highlights
          </h2>

          {/* Trustpilot branding */}
          <div className="mt-4 flex justify-center items-center gap-2 text-sm text-gray-600">
            {/* <img src="/trustpilot-logo.svg" alt="Trustpilot" className="h-5" /> */}
            <div className="flex items-center gap-1"></div>
            <span>Rated 4.3/5 on Trustpilot</span>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Xtra BaSe HitZ",
                role: "Site Owner",
                link: "https://www.trustpilot.com/reviews/6785659cd27865a5a711213c",
                feedback:
                  "They could have abandoned or given up on my site so many times, but they stuck with me and are dedicated to getting it to pass on mobile and desktop. For a while, desktop was passing but mobile was not. They were diligent in seeing it through and rectifying issues until it passed.",
              },
              {
                name: "Anastasia",
                role: "Site Owner",
                link: "https://www.trustpilot.com/reviews/61017e78f9f48709d4c18766",
                feedback:
                  "Speedy.Site's service was a great experience as a customer - they replied to my emails quickly and suggested several fixes on my site which I never thought about that they could be slowing down my site. They did everything to get the best results possible for my site.",
              },
              {
                name: "Robert Selby",
                role: "Site Owner",
                link: "https://www.trustpilot.com/reviews/60c8d908f9f4870a44d56e91",
                feedback:
                  "Live up to their name, super fast! Speedy tuned up my aged WordPress site and now has it running lightning fast. Quickness extends to their customer support who are very responsive and timely. Overall, a great value.",
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="relative bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-start text-left"
              >
                <div className="flex items-center mb-4">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <svg
                        key={i}
                        className="w-4 h-4 text-green-500 mr-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.955L10 0l2.951 5.955 6.561.955-4.756 4.635 1.122 6.545z" />
                      </svg>
                    ))}
                </div>
                <div className="absolute top-5 right-5">
                  <Link2Icon
                    size={18}
                    className="text-primary/60 hover:text-primary cursor-pointer"
                    onClick={() => {
                      window.open(t.link, "_blank");
                    }}
                  />
                </div>

                <p className="text-gray-700 italic">“{t.feedback}”</p>
                <div className="mt-4">
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Optional CTA */}
          <div className="mt-12">
            <a
              href="/reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-500 text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-green-600 transition"
            >
              Read More Reviews
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section
        id="pricing"
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
      >
        <div className="w-full px-6 text-center bg-primary/70 p-10">
          <div className="mx-auto max-w-5xl py-16">
            <h2 className="text-2xl text-primary-foreground font-bold">
              What Speedy Site Brings
            </h2>
            <p className="mt-4 text-indigo-200">
              A quick look at how Speedy Site enhances what tools like Google
              Search Console offer — with real-time data, deeper insights, and
              performance assistance built for action.
            </p>

            <div className="mt-12 overflow-x-auto">
              <table className="w-full text-left border-collapse rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-indigo-800 text-white text-sm">
                    <th className="py-4 px-6 font-semibold bg-indigo-900 text-left"></th>
                    <th className="py-4 px-6 font-semibold">
                      Google Search Console
                    </th>
                    <th className="py-4 px-6 font-semibold bg-indigo-700">
                      Speedy Site Before
                    </th>
                    <th className="py-4 px-6 font-semibold bg-green-600">
                      Speedy Site Smart Assistance
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    ["Real-time UX data", "✖️", "✖️", "✔️"],
                    [
                      "Performance debugging",
                      "✖️",
                      "✔️ Internal",
                      "✔️ Full Access",
                    ],
                    [
                      "Image optimization",
                      "✖️",
                      "✔️ WP only",
                      "✔️ On The Fly / Suggestions",
                    ],
                    ["Daily Core Web Vitals", "✖️", "✖️", "✔️ Free Access"],
                    [
                      "Before / After Comparison",
                      "✖️",
                      "✔️ Score Comparison",
                      "✔️ Weekly / Monthly",
                    ],
                    ["User journey analytics", "✖️", "✖️", "✔️ Full Access"],
                    ["Free plan", "✔️ Free", "✖️", "✔️ 7 days free access"],
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      className={`${
                        idx % 2 === 0 ? "bg-primary/60" : "bg-primary/40"
                      } border-b border-white/10 hover:bg-primary/70 transition`}
                    >
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`py-3 px-6 ${
                            ci === 3 ? "bg-green-500/20" : ""
                          }`}
                        >
                          <span
                            className={`${
                              cell.includes("✔️")
                                ? "text-green-400 font-semibold"
                                : cell.includes("✖️")
                                ? "text-red-400 font-semibold"
                                : "text-white"
                            }`}
                          >
                            {cell}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-10 text-indigo-100">
            👉 Start free today. No credit card needed. Upgrade later in your
            dashboard when ready.
          </p>
          <Link
            href="/sign-up"
            className="mt-6 inline-block rounded-md bg-white text-indigo-700 px-8 py-3 font-semibold hover:bg-gray-100"
          >
            Sign Up Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm">
            © {year} - Speedy Site. All rights reserved.
          </p>
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
