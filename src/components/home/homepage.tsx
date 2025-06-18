"use client";

import Image from "next/image";
import { useState, useEffect, FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  Gauge,
  LineChart,
  Target,
  GitCompare,
  Activity,
  Rocket,
  CheckCircle,
  Check,
  GaugeCircleIcon,
} from "lucide-react";
import emailjs from "@emailjs/browser";
import ParticleBackground from "@/hooks/ParticleBackground";

export default function HomepageComponent() {
  const [isAnnualBilling, setIsAnnualBilling] = useState(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [subscriptionFailed, setSubscriptionFailed] = useState<boolean>(false);

  // to trigger the animations after the component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Define your features with Lucid Icons and descriptions
  const features = [
    {
      icon: <Activity size={48} strokeWidth={1.5} />,
      title: "Real User Monitoring (RUM)",
      description:
        "Deep dive into every user's experience with real-time RUM data. See bottlenecks from your users' perspective across devices.",
    },
    {
      icon: (
        <GaugeCircleIcon
          size={40}
          strokeWidth={1.5}
          className="text-purple-600"
        />
      ),
      title: "Page Interaction Debugging",
      description:
        "Gain insights into your page component's response times, spot performance bottlenecks, and optimize for better INP.",
    },
    {
      icon: <LineChart size={48} strokeWidth={1.5} />,
      title: "Performance vs Ranking",
      description:
        "A system to monitor your top pages’ performance and measure their impact on search engine rankings.",
    },
    {
      icon: <Target size={48} strokeWidth={1.5} />,
      title: "Smart Insights & Bottleneck Notifications",
      description:
        "Get actionable performance alerts in your inbox — only when consistent issues are detected, so you can stay ahead without the noise.",
    },
    {
      icon: <GitCompare size={48} strokeWidth={1.5} />,
      title: "WordPress Theme & Plugin Analysis",
      description:
        "A system to help you uncover performance bottlenecks at the core of your WordPress site by analyzing the impact of plugins and themes.",
    },

    {
      icon: <Rocket size={48} strokeWidth={1.5} />,
      title: "Speedy Site Optimization Assistance",
      description:
        "A way to directly communicate with our Speedy Site team to assist optimize WordPress site for web vitals and",
    },
  ];

  // Define your pricing plans
  const pricingPlans = [
    {
      name: "Starter",
      monthlyPrice: 15,
      annualPrice: 165, // Approx 15% discount
      features: [
        "10 Monitored Pages (Synthetic)",
        "CrUX History (3 months)",
        "CrUX Recent Day Data",
        "Basic Optimization Tips",
        "Email Notification",
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Pro",
      monthlyPrice: 30,
      annualPrice: 330, // Approx 15% discount
      isMostPopular: true,
      features: [
        "25 Monitored Pages (Synthetic)",
        "CrUX History (1 year)",
        "CrUX Recent Day & Comparison",
        "RUM Data Integration",
        "Advanced Optimization Assistance",
        "Priority Email & Chat Support",
      ],
      cta: "Get Started",
    },
    {
      name: "Enterprise",
      monthlyPrice: "Custom",
      annualPrice: "Custom",
      features: [
        "Unlimited Pages",
        "Full CrUX History & Comparison",
        "Advanced RUM Customization",
        "Dedicated Optimization Consultant",
        "SLA & API Access",
        "24/7 Phone Support",
      ],
      cta: "Contact Sales",
    },
  ];

  // close success message after 4 sec
  useEffect(() => {
    if (subscribed) {
      const timer = setTimeout(() => {
        setSubscribed(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [subscribed]);

  // initialize email js
  emailjs.init({
    publicKey: process.env.NEXT_PUBLIC_EMAILJS_USER_ID,
    blockHeadless: true,
    // email block list for email
    blockList: { list: [] },
    limitRate: { id: "app", throttle: 10000 }, // 1 req per 10 sec
  });

  // form function
  async function handleForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;

    const email = emailInput.value;

    // Validate environment variables
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const userId = process.env.NEXT_PUBLIC_EMAILJS_USER_ID;

    if (!serviceId || !templateId || !userId) {
      console.error("Missing EmailJS environment variables");
      return;
    }

    // save email into db
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      // find the status
      if (res.status === 200) {
        setSubscribed(true); // to display subscribed message

        // prepare email.js parameters
        const templateParams = {
          email: email,
          company_name: "SpeedySense",
          company_url: "",
          support_email: "support@speedysense.com",
        };

        emailjs
          .send(serviceId, templateId, templateParams)
          .then((res) => {
            console.log(
              "Validation email sent successfully!",
              res.status,
              res.text
            );
          })
          .catch((error) => {
            console.log(
              "Failed to process your request. Please try again.",
              error
            );
          });
      } else if (res.status !== 200) {
        setSubscriptionFailed(true);
      }
    } catch (error) {
      console.error("Request failed:", error);
    }

    form.reset();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      {/* Header */}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white pt-32 pb-24 px-4 md:px-8 overflow-hidden min-h-[600px] flex items-center justify-center font-inter">
        {/* Background abstract shapes/gradients for visual flair */}
        <ParticleBackground />

        <div className="absolute inset-0 z-0 opacity-20">
          <svg
            className="absolute bottom-0 left-0 w-full h-full"
            viewBox="0 0 1440 320"
            xmlns="http://www.w3.org/2000/svg" // Corrected xmlns
          >
            <path
              fill="#ffffff"
              fillOpacity="0.05"
              d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,160C672,171,768,213,864,208C960,203,1056,155,1152,128C1248,101,1344,96,1392,93.3L1440,91L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>

        {/* Main content container: now left-aligned text, right-aligned visual */}
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 text-center md:text-left max-w-7xl">
          {/* Left side: Text content */}
          <div className="md:w-1/2 mb-10 md:mb-0">
            {/* Headline with fade-in and slide-up animation */}
            <h1
              className={`text-2xl md:text-4xl font-extrabold leading-tight tracking-tight drop-shadow-md
              transition-all duration-700 ease-out transform
              ${
                isMounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              Monitor User Experience and Benchmark Bottlenecks
            </h1>

            {/* Sub-headline with fade-in and slide-up animation, delayed slightly */}
            <p
              className={`mt-6 text-xl md:text-xl text-indigo-100 max-w-xl mx-auto md:mx-0
              transition-all duration-700 ease-out transform delay-100
              ${
                isMounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              Our all-in-one performance monitoring bundle lets you monitor,
              analyze, and optimize your site&apos;s performance with real-time
              web vital insights and synthetic tests.
            </p>

            {/* Call-to-action buttons with fade-in and slide-up animation, further delayed */}
            <div
              className={`mt-10 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center md:justify-start
              transition-all duration-700 ease-out transform delay-200
              ${
                isMounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <a
                href="#pricing"
                className="inline-block bg-white text-purple-700 hover:bg-gray-100 px-8 py-4 rounded-full font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Start Your Free Trial
              </a>
              <a
                href="#contact"
                className="inline-block bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-700 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105"
              >
                Request a Demo
              </a>
            </div>

            {/* Disclaimer text with fade-in and slide-up animation, last to appear */}
            <div
              className={`mt-8 text-sm text-indigo-200
              transition-all duration-700 ease-out transform delay-300
              ${
                isMounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              No credit card required. Cancel anytime.
            </div>
          </div>

          {/* Right side: Abstract visual element with animations */}
          <div className="md:w-1/2 flex justify-center md:justify-end mt-12 md:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
              className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
            >
              <Image
                src="/images/Main_image.png"
                alt="Main_dashboard"
                className="w-full h-auto object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-20 px-4 md:px-8 bg-gray-50">
        <div className="container mx-auto text-center max-w-7xl">
          <p className="text-lg md:text-[22px] text-gray-600 mb-6 max-w-4xl mx-auto">
            With a 1-second delay potentially reducing conversions by 7%, every
            millisecond matters. A slow website doesn&apos;t just frustrate
            users— every moment your website lags, you&apos;re losing revenue,
            customer loyalty, search engine rankings, ad earnings and most
            importantly opportunities.
          </p>

          <p className="text-lg md:text-[22px] text-gray-600 mb-6 underline underline-offset-4 decoration-blue-300 pb-2 font-bold">
            But it doesn&apos;t have to be this way.
          </p>

          <p className="text-lg md:text-[22px] text-gray-600 max-w-4xl mx-auto">
            Which is why we [at SpeedySite] rely on our smart-suit SpeedySense
            for website performance monitoring & optimization. Let&apos;s find
            out what SpeedySense is all about?
          </p>

          {/* Feature 1*/}
          <div className="flex mt-10 flex-col md:flex-row lg:min-h-auto justify-between gap-12 md:mt-24 mb-20">
            <div className="md:w-1/2 text-left space-y-6">
              <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-4">
                <LineChart
                  size={48}
                  strokeWidth={1.5}
                  className="text-purple-600"
                />
                <h3 className="text-3xl font-bold text-gray-700 leading-tight">
                  Web Vital History & Comparison
                </h3>
              </div>

              <p className="text-lg text-gray-700">
                Our Web Vitals history tool lets you view current-day data
                alongside historical trends, making it easy to compare all the
                web vital metrics and track the performance of multiple
                websites—all on a single page.
              </p>
              <div className="max-w-full bg-muted-foreground/5 rounded-md p-4 ">
                <ul className="text-gray-700 text-[17px] space-y-3">
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Identify when performance bottlenecks begin, as experienced
                    by your visitors on desktop and mobile devices.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Find out what % of your visitors is experiencing the best
                    version of your site performance.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Gain real-time insights into device usage and tailor your
                    site for optimal performance across all devices.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Monitor Web Vitals trends and take proactive action to
                    prevent delivering a poor user experience unknowingly.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Track daily changes in Web Vitals percentages without
                    waiting 7–28 days for results.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Get a better look into your web vital metrics than Page
                    Speed Insight and Google Search Console.
                  </li>
                </ul>
              </div>
            </div>

            <div className="md:w-1/2 flex justify-center items-start ">
              {/* web vital monitor image */}
              <div className="w-full sticky top-24 shadow-md border">
                <Image
                  src={"/images/Chrome_user_experience_report.png"}
                  alt={"web_vital_monitoring"}
                  layout="responsive"
                  width={1920}
                  height={1080}
                  quality={100}
                  priority
                />
              </div>
            </div>
          </div>

          {/* Feature 2*/}
          <div className="flex flex-col md:flex-row-reverse lg:min-h-auto justify-between gap-12 mb-20">
            <div className="md:w-1/2 text-left space-y-6">
              <div className="flex flex-col text-center gap-4 items-center md:flex-row md:items-center md:text-left">
                <Gauge
                  size={48}
                  strokeWidth={1.5}
                  className="text-indigo-600 "
                />
                <h3 className="text-3xl font-bold text-gray-800 leading-tight">
                  Automated Page Tests & Comparison
                </h3>
              </div>

              <p className="text-lg text-gray-700">
                Synthetic Page Testing is the way to proactively monitor, test
                within controlled environment, and identify the requirements to
                optimize your website&apos;s performance. SpeedySense does that
                for you automatically and repeatedly.
              </p>
              <div className="max-w-full bg-muted-foreground/5 rounded-md p-4 ">
                <ul className="text-gray-700 text-[17px] space-y-3">
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Performs automated page performance tests across various
                    device types and geographic locations.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Identifies performance regressions in a stable, controlled
                    environment—without without user network conditions, device
                    quality, or usage variability dependencies.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Isolate the root cause of performance issues based on
                    consistent test results.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Validate possible bottlenecks by comparing controlled test
                    outputs to web vital metrics.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Helps you identify optimization issues, fix them, and
                    monitor Web Vitals changes after improvements to your page
                    performance.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Gives you a clearer understanding of how your optimizations
                    are impacting real-world users.
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-start">
              {/* image */}
              <div className="w-full sticky top-24 shadow-md border">
                <Image
                  src={"/images/Web_vital_synthetic_result_compairsion.png"}
                  alt={"Web_vital_synthetic_result_comparison"}
                  layout="responsive"
                  width={1920}
                  height={1080}
                  quality={100}
                  priority
                />
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col md:flex-row lg:min-h-auto justify-between gap-12 mb-20">
            <div className="md:w-1/2 text-left space-y-6">
              <div className="flex gap-2 items-center text-center flex-col md:flex-row md:items-center md:text-left">
                <Activity
                  size={48}
                  strokeWidth={1.5}
                  className="text-teal-600"
                />
                <h3 className="text-3xl font-bold text-gray-800 leading-tight">
                  Page Asset Overview & Analysis
                </h3>
              </div>
              <p className="text-lg text-gray-700">
                Larger assets take longer to download, may longer to compile and
                directly affects metrics key parts of Core Web Vitals. For
                instance, bulky or unoptimized JavaScript can hinder rendering
                and delay user interaction, leading to a sluggish experience.
              </p>
              <div className="max-w-full bg-muted-foreground/5 rounded-md p-4 ">
                <ul className="text-gray-700 text-[17px] space-y-3">
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    SpeedySense calculates both total and individual asset sizes
                    on your page to identify and suggest required optimizations
                    (if any).
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    You gets to find out the percentage each asset contributes
                    to your page&apos;s total size.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Identify the approximate compression ratio of assets as they
                    are delivered to user devices.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Helps reduce code delivery and compilation time, leading to
                    significant improvements in key Web Vitals metrics.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Compare the impact of asset optimization on your page’s
                    performance in both synthetic tests and real-world usage.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Handy when it comes to optimize INP, FPC, TTFB and LCP
                    values that are directly related to asset loading and
                    compilation time.
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-start">
              {/* This is the "Simulated Chart: Mobile User Abandonment"*/}
              <div className="w-full sticky top-24 shadow-md border">
                <Image
                  src={"/images/Page Asset Module.png"}
                  alt={"Page_asset_optimization_monitoring"}
                  layout="responsive"
                  width={1920}
                  height={1080}
                  quality={100}
                  priority
                />
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="flex flex-col md:flex-row-reverse lg:min-h-auto justify-between gap-12">
            <div className="md:w-1/2 text-left space-y-6">
              <div className="flex gap-2 items-center text-center flex-col md:flex-row md:items-center md:text-left">
                <GitCompare
                  size={48}
                  strokeWidth={1.5}
                  className="text-green-600"
                />
                <h3 className="text-3xl font-bold text-gray-800 leading-tight">
                  Server & 3rd Party Monitoring
                </h3>
              </div>
              <p className="text-lg text-gray-700">
                The impact of third-party assets and server performance on page
                speed is often significant—and frequently overlooked. We make
                sure it never goes unnoticed.
              </p>
              <div className="max-w-full bg-muted-foreground/5 rounded-md p-4 ">
                <ul className="text-gray-700 text-[17px] space-y-3">
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    A slow server increases Time to First Byte (TTFB), delaying
                    the initial response and slowing down overall rendering.
                    SpeedySense helps you track your server&apos;s consistency
                    over time and understand how it handles concurrent requests.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Monitor domain lookups, server response times, TTFB, and
                    third-party activity on your most critical pages.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Keep track of external domains on your pages and their
                    impact on performance.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Provide an overview of the main document&apos;s timing,
                    including render-blocking time, connection time, DNS
                    resolution, SSL handshake, request sent, and response
                    received timings.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Stay informed about server response times to maintain
                    efficient page crawling and improve indexation.
                  </li>
                  <li className="flex items-start">
                    <Check
                      size={20}
                      className="text-red-500 mr-2 flex-shrink-0 mt-1"
                    />
                    Large HTML files can hurt page performance, so we monitor
                    your page&apos;s HTML size to ensure it&apos;s minified,
                    free of inline bloat, and optimized with server-side
                    compression.
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-start">
              <div className="w-full sticky top-24 shadow-md border">
                <Image
                  src={"/images/Page Server Monitoring.png"}
                  alt={"Page Server Monitoring"}
                  layout="responsive"
                  width={1920}
                  height={1080}
                  quality={100}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Features & Services Overview */}
      <section
        id="upcoming-features"
        className="py-20 px-4 md:px-8 bg-gray-100"
      >
        {/* Main content container with max-width */}
        <div className="container mx-auto text-center max-w-7xl">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-12 text-gray-800">
            What’s Next: Upcoming Features in the Pipeline
          </h2>
          {/* Added max-w-3xl for the paragraph below the heading */}
          <p className="text-lg md:text-xl text-gray-600 mb-16 max-w-4xl mx-auto">
            Our goal is to provide a complete toolkit that not only monitors
            performance but also pinpoints the root causes and recommends
            actionable fixes — making it easier for you to resolve performance
            related issues and stay focused on growing your business.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center transform hover:scale-105 transition-transform duration-300 border border-gray-200 hover:border-purple-400"
              >
                <div className="text-purple-600 mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* subscribe section */}
      <section id="early-access" className="bg-gray-100 py-20 px-4 md:px-8">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-4">
            Join the Early Access Program
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Be among the first to experience our latest tool. Sign up now and
            get exclusive early updates.
          </p>

          <form onSubmit={handleForm}>
            <input
              type="email"
              name="email"
              required
              placeholder="Your email address"
              className="w-full mb-6 sm:flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />

            <AnimatePresence>
              {subscribed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="p-4 mb-4 bg-green-100 border border-green-400 rounded-lg text-green-800 space-y-6"
                >
                  <p>
                    Thank you for requesting early access to the SpeedySense
                    Beta Program!
                  </p>
                  <p>
                    We’ve sent a validation email to the address you provided.
                    Please check your inbox (and spam/junk folder) to verify
                    your email address. Once verified, you’ll be added to the
                    waitlist, and we’ll notify you as soon as your access to
                    SpeedySense (Beta) is ready.
                  </p>
                </motion.div>
              )}

              {subscriptionFailed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="p-4 mb-4 bg-red-100 border border-red-400 rounded-lg text-red-800 space-y-6"
                >
                  <p>
                    Sorry, something went wrong. Please try again or contact
                    support.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full sm:w-auto mt-6 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors duration-300"
            >
              Request Access
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-4">
            No spam. Just important updates and early access info.
          </p>
        </div>
      </section>

      {/* Pricing Section  -  temporary disabled*/}
      <div className="relative cursor-not-allowed pointer-events-none">
        <section id="pricing" className="py-20 px-4 md:px-8 bg-white">
          {/* Main content container with max-width */}
          <div className="container mx-auto text-center max-w-7xl">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-gray-800">
              Simple, Transparent Pricing
            </h2>
            {/* Added max-w-3xl for the paragraph below the heading */}
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Choose a plan that fits your needs. Scale up as your performance
              goals grow. (Section is currently disabled!!!)
            </p>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex bg-gray-200 rounded-full p-1">
                <button
                  className={`py-2 px-6 rounded-full text-lg font-semibold transition-colors duration-300 ${
                    !isAnnualBilling
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-700 hover:bg-transparent"
                  }`}
                  onClick={() => setIsAnnualBilling(false)}
                >
                  Monthly
                </button>
                <button
                  className={`py-2 px-6 rounded-full text-lg font-semibold transition-colors duration-300 ${
                    isAnnualBilling
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-700 hover:bg-transparent"
                  }`}
                  onClick={() => setIsAnnualBilling(true)}
                >
                  Annually{" "}
                  <span className="text-sm text-purple-200">(Save 15%)</span>
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
              {pricingPlans.map((plan, index) => (
                <div
                  key={index}
                  className={`relative bg-white rounded-lg shadow-xl p-8 flex flex-col justify-between transform hover:scale-105 transition-transform duration-300 ${
                    plan.isMostPopular
                      ? "border-4 border-purple-600"
                      : "border border-gray-200"
                  }`}
                >
                  {plan.isMostPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                      MOST POPULAR
                    </span>
                  )}
                  <div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-4">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 text-xl mb-6">
                      {plan.monthlyPrice === "Custom" ? (
                        <span className="text-4xl font-extrabold text-purple-700">
                          {plan.monthlyPrice}
                        </span>
                      ) : (
                        <>
                          <span className="text-5xl font-extrabold text-purple-700">
                            $
                            {isAnnualBilling
                              ? plan.annualPrice
                              : plan.monthlyPrice}
                          </span>
                          <span className="text-gray-500">
                            /{isAnnualBilling ? "year" : "month"}
                          </span>
                        </>
                      )}
                    </p>
                    <ul className="text-gray-700 text-lg text-left space-y-3 mb-10">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <CheckCircle
                            size={20}
                            strokeWidth={2}
                            className="text-green-500 mr-2 flex-shrink-0"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto pt-6 border-t border-gray-100">
                    <a
                      href={plan.cta === "Contact Sales" ? "#contact" : "#"}
                      className={`inline-block w-full py-4 rounded-full font-bold text-lg transition-colors duration-300 shadow-md ${
                        plan.isMostPopular
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                      }`}
                    >
                      {plan.cta}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Testimonials Section */}
      <section className="py-20 px-4 md:px-8 bg-gray-100">
        {/* Main content container with max-width */}
        <div className="container mx-auto text-center max-w-5xl">
          {" "}
          {/* Slightly tighter max-width for testimonials */}
          <h2 className="text-4xl md:text-5xl font-extrabold mb-12 text-gray-800">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-purple-600 text-left">
              <p className="text-xl italic text-gray-700 mb-6">
                &quot;SpeedySense transformed our understanding of site
                performance. The CrUX data comparison feature is invaluable for
                making data-driven decisions.&quot;
              </p>
              <div className="font-bold text-gray-900">
                - Jane Doe, CTO at Acme Corp
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-indigo-600 text-left">
              <p className="text-xl italic text-gray-700 mb-6">
                &quot;Our Web Vitals scores skyrocketed after implementing
                SpeedySense&apos;s recommendations. Their support team is
                fantastic!&quot;
              </p>
              <div className="font-bold text-gray-900">
                - John Smith, Marketing Manager at E-Shop Global
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section
        id="contact"
        className="py-20 px-4 md:px-8 bg-purple-700 text-white text-center"
      >
        {/* Main content container with max-width */}
        <div className="container mx-auto max-w-4xl">
          {" "}
          {/* Tighter max-width for CTA text */}
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Ready to Supercharge Your Site Speed?
          </h2>
          <p className="text-xl md:text-2xl text-purple-100 mb-10 max-w-3xl mx-auto">
            Join hundreds of businesses improving their user experience and SEO
            with SpeedySense.
          </p>
          <a
            href="#pricing"
            className="inline-block bg-white text-purple-700 hover:bg-gray-100 px-10 py-5 rounded-full font-bold text-xl shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Get Started Today
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-10 px-4 md:px-8">
        {/* Main content container with max-width */}
        <div className="container mx-auto text-center text-sm max-w-7xl">
          {" "}
          {/* Kept consistent with general container width */}
          <div className="mb-4">
            <a href="#" className="hover:text-purple-400 mx-3">
              Privacy Policy
            </a>
            <span className="text-gray-600">|</span>
            <a href="#" className="hover:text-purple-400 mx-3">
              Terms of Service
            </a>
            <span className="text-gray-600">|</span>
            <a href="#" className="hover:text-purple-400 mx-3">
              Contact Us
            </a>
          </div>
          <p>
            &copy; {new Date().getFullYear()} SpeedySense. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
