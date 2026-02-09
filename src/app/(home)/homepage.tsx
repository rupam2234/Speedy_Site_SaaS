"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import SiteHeader from "./header";
import Link from "next/link";
import { ComparisonTable, FeatureBlock, Testimonials } from "./index";

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
  const year = new Date().getFullYear();

  return (
    <main className="bg-white text-gray-900 w-full overflow-x-hidden">
      {/* Navigation */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="mx-auto max-w-6xl px-6 py-30 text-center">
          <h1 className="max-w-7xl text-4xl sm:text-[45px] font-extrabold font-serif leading-tight">
            Monitor, Diagnose & Improve User Experience
          </h1>
          <p className="mt-6 max-w-4xl mx-auto text-lg text-indigo-100">
            Great content can&apos;t win without a great experience that shapes
            engagement and SEO. At Speedy Site you can keep track of UX and Web
            Vitals insights similar to Google Search Console — and a whole lot
            more insights on your website&apos;s performance.
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
          {features.map((f, idx) => (
            <FeatureBlock key={f.title} feature={f} reversed={idx % 2 === 1} />
          ))}
        </div>
      </section>

      {/* Additional Features */}
      <section id="additional-features" className="py-16 bg-primary/5">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-serif sm:text-3xl font-bold text-primary/80">
            There&apos;s More
          </h2>
          <p className="mt-6 text-gray-600 max-w-4xl mx-auto">
            Finding what&apos;s causing bottlenecks is only half the story,
            optimizing them is what truly improves performance and UX. We help
            you identify issues and offer additional guidance and tools to make
            improving your page performance easier.
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
                className="bg-primary/80 rounded-lg p-6 shadow cursor-pointer flex-1 md:hover:bg-linear-to-br md:hover:from-indigo-600/60 md:hover:via-purple-600/60 md:hover:from md:hover:to-95% md:hover:to-pink-600/60"
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
          <p className="mt-6 text-gray-600 max-w-4xl mx-auto">
            Our journey began with a dedicated solution for WordPress
            optimization. Rooted in the mission to improve site speed and user
            experience, we helped many websites enhance their Core Web Vitals
            and overall performance. Extending the same DNA, Speedy Site can now
            help you with actionable insights, real-time metrics, and historical
            data, empowering you to optimize your site&apos;s performance and
            deliver a seamless user experience.
          </p>
          <p className="mt-6 text-gray-600 max-w-3xl mx-auto">
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
        <Testimonials />
      </section>

      {/* Feature Comparison */}
      <section
        id="pricing"
        className="bg-linear-to-r from-indigo-600 to-purple-600 text-white"
      >
        <div className="w-full px-6 text-center bg-primary/70 p-10">
          <div className="mx-auto max-w-6xl py-5">
            <h2 className="text-3xl text-primary-foreground font-serif font-bold">
              What you get?
            </h2>
            <p className="mt-4 mx-auto max-w-3xl text-indigo-200">
              Our goal is to provide deeper, continuously collected performance
              insights and highlight potential bottlenecks so you can optimize
              user experience proactively. Explore the tools and resources we
              offer beyond what Google Search Console provides to help you keep
              your site performance optimized.
            </p>

            <div className="mt-12">
              <ComparisonTable />
            </div>
          </div>

          <p className="mt-10 text-indigo-100">
            👉 Start free. No credit card needed. Upgrade later in your account
            when ready.
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
              WordPress Optimization Service
            </a>
            <a href="#pricing" className="hover:text-white">
              Contact us
            </a>
            <a href="#testimonials" className="hover:text-white">
              T&C
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
