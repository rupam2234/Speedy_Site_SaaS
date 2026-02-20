"use client";

import {
  Eye,
  ShieldCheck,
  Database,
  UserCheck,
  Lock,
  Globe,
  Mail,
  Fingerprint,
  Info,
} from "lucide-react";
import { SiteHeader } from "../(home)";
import { SiteFooter } from "@/components/theme";

const Main = () => {
  const lastUpdated = "Febuary 20, 2026"; // Replace with actual date

  const navItems = [
    { id: "info-collect", title: "Information Collection" },
    { id: "rum-data", title: "RUM Technical Data" },
    { id: "usage", title: "How We Use Data" },
    { id: "gdpr", title: "GDPR & Legal Basis" },
    { id: "sharing", title: "Data Sharing" },
    { id: "security", title: "Security & Retention" },
    { id: "rights", title: "Your Privacy Rights" },
    { id: "client-resp", title: "Client Responsibilities" },
  ];

  return (
    <>
      <SiteHeader enableNav={false} />
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-100">
                <Eye className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              At{" "}
              <span className="font-semibold text-emerald-600">
                Speedy.Site
              </span>
              , we prioritize transparency regarding how we handle your data and
              the performance metrics we monitor.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
                Effective: {lastUpdated}
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium border border-emerald-100">
                PIPEDA & GDPR Compliant
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
                  Sections
                </p>
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block px-3 py-2 text-sm text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-100"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </aside>

            {/* Main Policy Content */}
            <main className="lg:col-span-3">
              <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 space-y-12">
                {/* Section 1: Intro */}
                <section id="intro">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    1. Company Information
                  </h2>
                  <p className="text-slate-600 leading-relaxed">
                    Speedy.Site is operated by{" "}
                    <strong>2303851 Ontario Inc.</strong>, based in Ontario,
                    Canada. This policy explains our practices regarding the
                    collection, use, and protection of information across our
                    RUM platform and WordPress optimization services.
                  </p>
                </section>

                {/* Section 2: Collection */}
                <section id="info-collect" className="scroll-mt-8">
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Fingerprint className="w-6 h-6 text-emerald-500" /> 2.
                    Information We Collect
                  </h2>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <h3 className="font-bold text-slate-800 mb-2">
                      2.1 Information You Provide
                    </h3>
                    <p className="text-slate-600 text-sm mb-4 font-medium italic">
                      Data you give us when creating an account or requesting
                      services:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {["Name & Email", "Billing Address", "Website URL"].map(
                        (item) => (
                          <div
                            key={item}
                            className="bg-white px-3 py-2 rounded border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                            {item}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </section>

                {/* Section 3: RUM Data - IMPORTANT FOR SAAS */}
                <section
                  id="rum-data"
                  className="scroll-mt-8 bg-emerald-50/50 p-6 rounded-xl border border-emerald-100"
                >
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Database className="w-6 h-6 text-emerald-600" /> 2.2 Real
                    User Monitoring (RUM) Data
                  </h2>
                  <p className="text-slate-700 mb-4">
                    When our tracking script is installed on a Client website,
                    we collect <strong>technical performance data</strong> from
                    visitors. This data is used to improve site speed and is not
                    used to identify individuals.
                  </p>
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-700 uppercase mb-2">
                        Technical Metrics Collected:
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Core Web Vitals (LCP, CLS, INP), Page Load Times, Device
                        Type, Browser Type, Screen Resolution, Country-level
                        Geolocation (IP-derived), and Referrer URL.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <Info className="w-5 h-5 text-red-500 mt-0.5" />
                      <p className="text-sm text-red-800 font-medium">
                        <strong>We do NOT intentionally collect:</strong> Names,
                        Emails, Form Inputs, Payment Details, or any other
                        sensitive personal information from your end-users.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 4: GDPR */}
                <section id="gdpr" className="scroll-mt-8">
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Globe className="w-6 h-6 text-blue-500" /> 4. Legal Basis
                    (GDPR)
                  </h2>
                  <p className="text-slate-600 mb-4 italic">
                    For EEA-based users, we process data under:
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                    <li className="bg-white p-4 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 block">
                        Contractual Necessity
                      </span>
                      <span className="text-sm text-slate-500">
                        To provide the services you purchased.
                      </span>
                    </li>
                    <li className="bg-white p-4 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 block">
                        Legitimate Interests
                      </span>
                      <span className="text-sm text-slate-500">
                        To secure our platform and improve performance.
                      </span>
                    </li>
                  </ul>
                </section>

                {/* Section 5: Security */}
                <section id="security" className="scroll-mt-8">
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <Lock className="w-6 h-6 text-emerald-500" /> 8. Data
                    Security
                  </h2>
                  <p className="text-slate-600 leading-relaxed">
                    We implement industry-standard administrative, technical,
                    and physical safeguards. However, please note that no method
                    of transmission over the internet is 100% secure. We use
                    encrypted connections (SSL/TLS) for all data transfers.
                  </p>
                </section>

                {/* Section 6: Rights */}
                <section id="rights" className="scroll-mt-8">
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                    <UserCheck className="w-6 h-6 text-emerald-500" /> 9. Your
                    Rights
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      "Right to Access Data",
                      "Right to Correction",
                      "Right to Deletion",
                      "Right to Data Portability",
                      "Right to Object",
                      "Withdraw Consent",
                    ].map((right) => (
                      <div
                        key={right}
                        className="flex items-center gap-2 text-slate-700 text-sm py-2 px-3 bg-slate-50 rounded-md border border-slate-100"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />{" "}
                        {right}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    To exercise these rights, please contact our Data Protection
                    Officer at <strong>support@speedy.site</strong>.
                  </p>
                </section>

                {/* Section 7: Client Responsibilities */}
                <section
                  id="client-resp"
                  className="scroll-mt-8 p-6 bg-slate-900 text-slate-100 rounded-2xl"
                >
                  <h2 className="text-2xl font-bold mb-4">
                    12. Client Responsibilities
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    If you use our RUM tracking, you are the{" "}
                    <strong>Data Controller</strong>. You are responsible for:
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-2 items-start">
                      <span className="text-emerald-400 font-bold">•</span>{" "}
                      Maintaining a compliant privacy policy on your own site.
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-emerald-400 font-bold">•</span>{" "}
                      Implementing cookie consent banners where legally
                      required.
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-emerald-400 font-bold">•</span>{" "}
                      Complying with local laws (GDPR, CCPA/CPRA, etc.).
                    </li>
                  </ul>
                </section>

                {/* Footer / Contact */}
                <footer className="pt-12 border-t border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900">
                        Official Contact
                      </h4>
                      <div className="text-sm text-slate-600 space-y-2">
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-emerald-600" />{" "}
                          contact@speedy.site
                        </p>
                        <address className="not-italic flex items-start gap-2 leading-tight">
                          <Globe className="w-4 h-4 text-emerald-600 mt-1" />
                          2303851 Ontario Inc.
                          <br />
                          64 Hurontario St, Suite 200
                          <br />
                          Collingwood, ON L9Y 2L6, Canada
                        </address>
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-xl max-w-sm">
                      <p className="text-sm text-emerald-800 font-medium">
                        Privacy updates: We may update this policy periodically.
                        Check the "Effective Date" at the top for the latest
                        revision.
                      </p>
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
