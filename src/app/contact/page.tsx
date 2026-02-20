"use client";

import { useState } from "react";
import {
  Mail,
  MessageSquare,
  Zap,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Globe,
  HelpCircle,
} from "lucide-react";
import { SiteHeader } from "../(home)";
import { SiteFooter } from "@/components/theme";

const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setSubmitted(true);
    // Handle form logic here
  };

  return (
    <>
      <SiteHeader enableNav={false} />
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {/* Hero Section */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              How can we help?
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Whether you have questions about our RUM platform or need a
              deep-dive WordPress speed audit, our team is ready to accelerate
              your site.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Contact Info */}
            <div className="space-y-6">
              <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-100">
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-500 p-2 rounded-lg">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-indigo-100 text-sm">Email us at</p>
                      <p className="font-medium">contact@speedy.site</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-500 p-2 rounded-lg">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-indigo-100 text-sm">Headquarters</p>
                      <p className="font-medium text-sm leading-relaxed">
                        64 Hurontario St, Suite 200
                        <br />
                        Collingwood, ON L9Y 2L6
                        <br />
                        Canada
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-500 p-2 rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-indigo-100 text-sm">Response Time</p>
                      <p className="font-medium">Under 24 hours (Mon-Fri)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-indigo-500">
                  <p className="text-xs uppercase tracking-widest text-indigo-200 font-bold mb-4">
                    Direct Support
                  </p>
                  <div className="space-y-3">
                    <button className="flex items-center gap-2 text-sm hover:text-indigo-200 transition-colors">
                      <MessageSquare className="w-4 h-4" /> Technical
                      Documentation
                    </button>
                    <button className="flex items-center gap-2 text-sm hover:text-indigo-200 transition-colors">
                      <Zap className="w-4 h-4" /> API Status:{" "}
                      <span className="text-emerald-400">Online</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Trust Pilot / Proof card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Optimization Guaranteed
                  </p>
                  <p className="text-xs text-slate-500">
                    Trusted by 500+ WordPress sites
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                      <Send className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      Message Sent!
                    </h3>
                    <p className="text-slate-600 mt-2">
                      Thanks for reaching out. A performance expert will be in
                      touch shortly.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 text-indigo-600 font-semibold hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Work Email
                        </label>
                        <input
                          type="email"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Website URL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="https://example.com"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Enter your URL for a complimentary speed check.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Inquiry Type
                      </label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white">
                        <option>General Inquiry</option>
                        <option>WordPress Optimization Quote</option>
                        <option>Technical Support</option>
                        <option>Billing Question</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        How can we help?
                      </label>
                      <textarea
                        //   rows="4"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Tell us about your performance goals..."
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group"
                    >
                      Send Message
                      <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">
                Quick Answers
              </h2>
              <p className="text-slate-600 mt-2 text-lg">
                Common questions for a faster start.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <HelpCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    How long does an audit take?
                  </h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    Typically, we deliver a full WordPress technical performance
                    audit within 48 hours of access being provided.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0">
                  <HelpCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    Is the RUM script heavy?
                  </h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    No. Our script is &lt; 5kb and loads asynchronously, meaning
                    it has zero impact on your site's performance scores.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0">
                  <HelpCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    Do you offer white-labeling?
                  </h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    Yes, for Agency plans. Contact Sales in the form above to
                    discuss customized reporting options.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0">
                  <HelpCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    What platforms do you support?
                  </h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    While RUM works on any site, our hands-on optimization
                    services are exclusive to WordPress & WooCommerce.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default ContactPage;
