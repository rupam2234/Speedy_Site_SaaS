"use client";

import { Shield, Scale, Zap, Lock, Globe, Mail, MapPin } from "lucide-react";
import { SiteHeader } from "../(home)";
import { SiteFooter } from "@/components/theme";

const Main = () => {
  const lastUpdated = "October 24, 2023"; // Replace with actual date

  const sections = [
    { id: "definitions", title: "1. Definitions" },
    { id: "acceptance", title: "2. Acceptance of Terms" },
    { id: "services", title: "3. Description of Services" },
    { id: "responsibilities", title: "4. Client Responsibilities" },
    { id: "privacy", title: "5. Data Collection & Privacy" },
    { id: "payment", title: "6. Payment Terms" },
    { id: "ip", title: "7. Intellectual Property" },
    { id: "modifications", title: "8. Website Modifications" },
    { id: "liability", title: "11. Limitation of Liability" },
    { id: "governing-law", title: "15. Governing Law" },
  ];

  return (
    <>
      <SiteHeader enableNav={false} />
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              These terms govern your access to the{" "}
              <span className="font-semibold text-blue-600">Speedy.Site</span>{" "}
              platform and our specialized WordPress optimization services.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-500">
              <span className="bg-slate-100 px-3 py-1 rounded-full">
                Effective Date: {lastUpdated}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sticky Sidebar Navigation */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
                  Table of Contents
                </p>
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block px-3 py-2 text-sm text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-lg transition-all"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-12">
              <div className="prose prose-slate max-w-none bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
                <section id="intro" className="mb-10">
                  <p className="text-lg leading-relaxed text-slate-700">
                    This is a legally binding agreement between you and{" "}
                    <strong>Speedy.Site</strong>. By using our platform,
                    installing our scripts, or purchasing services, you agree to
                    these terms.
                  </p>
                </section>

                <section id="definitions" className="scroll-mt-8">
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Scale className="w-6 h-6 text-blue-500" /> 1. Definitions
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                    <li className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <strong className="text-blue-700 block mb-1">
                        Company
                      </strong>
                      2303851 Ontario Inc., operating as Speedy.Site.
                    </li>
                    <li className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <strong className="text-blue-700 block mb-1">
                        Platform
                      </strong>
                      The RUM dashboard, tracking scripts, APIs, and
                      infrastructure.
                    </li>
                    <li className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <strong className="text-blue-700 block mb-1">
                        Services
                      </strong>
                      Real User Monitoring, WordPress performance optimization,
                      and audits.
                    </li>
                    <li className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <strong className="text-blue-700 block mb-1">
                        Client
                      </strong>
                      The individual or entity purchasing or using the Services.
                    </li>
                  </ul>
                </section>

                <hr className="my-8 border-slate-100" />

                <section id="services" className="scroll-mt-8">
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Zap className="w-6 h-6 text-blue-500" /> 3. Description of
                    Services
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        3.1 Real User Monitoring (RUM)
                      </h3>
                      <p className="text-slate-600">
                        We collect anonymized performance data from real
                        visitors to measure Core Web Vitals (LCP, CLS, INP),
                        page load metrics, and device/geographic trends.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        3.2 WordPress Optimization
                      </h3>
                      <p className="text-slate-600">
                        Services include caching implementation, image
                        optimization, code minification, and hosting-level
                        recommendations.
                      </p>
                    </div>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                      <h3 className="text-sm font-bold text-amber-800 uppercase mb-1">
                        3.3 No Guarantee of Rankings
                      </h3>
                      <p className="text-sm text-amber-700 leading-relaxed">
                        We do not guarantee search engine rankings, traffic
                        increases, or specific SEO results. Performance
                        improvements are targeted, but external factors may
                        affect outcomes.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="responsibilities" className="scroll-mt-8 mt-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    4. Client Responsibilities
                  </h2>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex gap-2">
                      <span>•</span> Provide admin access to WordPress for
                      optimization tasks.
                    </li>
                    <li className="flex gap-2">
                      <span>•</span> <strong>Maintain full backups</strong> of
                      your website prior to work.
                    </li>
                    <li className="flex gap-2">
                      <span>•</span> Ensure lawful collection of data and
                      maintain a valid Privacy Policy.
                    </li>
                    <li className="flex gap-2">
                      <span>•</span> Obtain necessary consent (GDPR/CPRA) for
                      tracking scripts.
                    </li>
                  </ul>
                </section>

                <section
                  id="privacy"
                  className="scroll-mt-8 mt-12 bg-blue-50/50 p-6 rounded-xl border border-blue-100"
                >
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Lock className="w-6 h-6 text-blue-500" /> 5. Data
                    Collection & Privacy
                  </h2>
                  <p className="text-slate-700 mb-4">
                    We collect technical data (IP-derived geolocation, device
                    type, timing data). We <strong>do not</strong> intentionally
                    collect PII like names, emails, or form inputs from your
                    visitors.
                  </p>
                  <p className="text-sm text-slate-500 italic font-medium tracking-tight bg-white p-3 rounded-md border border-blue-100">
                    Client remains the Data Controller; Speedy.Site acts as the
                    Data Processor.
                  </p>
                </section>

                <section id="payment" className="scroll-mt-8 mt-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    6. Payment Terms
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border border-slate-200 p-4 rounded-lg">
                      <h4 className="font-bold text-slate-800 mb-2">
                        Subscriptions
                      </h4>
                      <p className="text-sm text-slate-600">
                        Monthly or Annual billing. Auto-renews until cancelled.
                        Fees are non-refundable once a cycle begins.
                      </p>
                    </div>
                    <div className="border border-slate-200 p-4 rounded-lg">
                      <h4 className="font-bold text-slate-800 mb-2">
                        Optimization
                      </h4>
                      <p className="text-sm text-slate-600">
                        Full payment required upfront. No refunds once technical
                        work has commenced.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="liability" className="scroll-mt-8 mt-12">
                  <div className="bg-slate-900 text-white p-8 rounded-2xl">
                    <h2 className="text-2xl font-bold mb-4">
                      11. Limitation of Liability
                    </h2>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4 uppercase">
                      To the maximum extent permitted by law, Speedy.Site&apos;s
                      total liability shall not exceed the total amount paid by
                      you in the preceding 3 months.
                    </p>
                    <p className="text-slate-400 text-xs">
                      We are not liable for indirect damages, loss of profits,
                      data loss, or hosting provider disruptions.
                    </p>
                  </div>
                </section>

                <section id="governing-law" className="scroll-mt-8 mt-12">
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Globe className="w-6 h-6 text-blue-500" /> 15. Governing
                    Law
                  </h2>
                  <p className="text-slate-600">
                    This Agreement is governed by the laws of{" "}
                    <strong>Ontario, Canada</strong>. Any disputes shall be
                    resolved exclusively in the courts of Ontario.
                  </p>
                </section>

                {/* Contact Footer */}
                <footer className="mt-16 pt-8 border-t border-slate-100">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-slate-900 mb-4">
                        Contact Information
                      </h4>
                      <div className="space-y-3 text-slate-600 text-sm">
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> 2303851 Ontario Inc.
                          <br />
                          64 Hurontario St, Suite 200
                          <br />
                          Collingwood, ON L9Y 2L6
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4" /> contact@speedy.site
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl text-center flex flex-col justify-center">
                      <p className="text-sm text-slate-500 mb-2">
                        Have questions about these terms?
                      </p>
                      <a
                        href="mailto:contact@speedy.site"
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Contact our team
                      </a>
                    </div>
                  </div>
                </footer>
              </div>
            </main>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default Main;
