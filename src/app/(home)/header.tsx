"use client";

import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import Link from "next/link";
import { ArrowRight, ChevronDown, Zap, Rocket } from "lucide-react";
import { useIsMobile } from "@/components/theme/use-mobile";
import { SpeedySiteLogo } from "@/components/theme";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

export default function SiteHeader({ enableNav }: { enableNav: boolean }) {
  const user = useSupabaseUser();
  const isMobile = useIsMobile();
  const [delayedUser, setDelayedUser] = useState<User | null>(null);
  const [fade, setFade] = useState(true);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  useEffect(() => {
    if (user === delayedUser) return;
    setFade(false);
    const timeout = setTimeout(() => {
      setDelayedUser(user);
      setFade(true);
    }, 200);
    return () => clearTimeout(timeout);
  }, [user, delayedUser]);

  const services = [
    {
      title: "WP Optimization",
      desc: "Standalone WordPress speed optimization service.",
      icon: <Zap size={18} className="text-amber-500" />,
      href: "/wordpress-optimization",
    },
    {
      title: "Site Overhaul",
      desc: "Legacy full-service speed rebuild.",
      icon: <Rocket size={18} className="text-purple-600" />,
      href: "#speedy",
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        {/* LOGO */}
        <div className="text-xl font-bold text-indigo-600 hover:opacity-90 transition-opacity">
          <SpeedySiteLogo isDark={false} />
        </div>

        {/* NAVIGATION */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
          {/* SERVICES DROPDOWN */}
          <div
            className="relative"
            onMouseEnter={() => setIsServicesOpen(true)}
            onMouseLeave={() => setIsServicesOpen(false)}
          >
            <button
              type="button"
              className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors ${
                isServicesOpen
                  ? "bg-slate-100 text-indigo-600"
                  : "hover:bg-slate-50"
              }`}
            >
              Legacy Services
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  isServicesOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isServicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 w-105 pt-4"
                >
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 grid grid-cols-2 gap-2 overflow-hidden">
                    {services.map((service) => (
                      <Link
                        key={service.title}
                        href={service.href}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="mt-1 p-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                          {service.icon}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-[13px]">
                            {service.title}
                          </div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            {service.desc}
                          </div>
                        </div>
                      </Link>
                    ))}

                    <div className="col-span-2 mt-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-center">
                      <p className="text-[11px] text-indigo-700 font-semibold">
                        New: Real-time Core Web Vitals monitoring is now live!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {enableNav && (
            <>
              <Link
                href="#features"
                className="px-4 py-2 rounded-full hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                className="px-4 py-2 rounded-full hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Testimonials
              </Link>
              <Link
                href="#speedy"
                className="px-4 py-2 rounded-full hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                Our Journey
              </Link>
            </>
          )}
        </nav>

        {/* CTA BUTTON */}
        <div
          className={`transition-opacity duration-200 md:min-w-50 flex justify-end ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {delayedUser ? (
            <Link
              href="/dashboard"
              className="md:inline-flex flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"
            >
              {isMobile ? "Dashboard" : "Go to Dashboard"}
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="flex md:inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              Sign in <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
