"use client";

import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { DynamicLogo } from "../(auth)/helpers/dynamicLogo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/components/theme/use-mobile";

export default function SiteHeader() {
  const user = useSupabaseUser();
  const isMobile = useIsMobile();

  return (
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
        </nav>
        {user ? (
          <Link
            href="/dashboard"
            className="md:inline-flex items-center gap-1 rounded-md bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-500"
          >
            {isMobile ? "Dashboard" : "Go to Dashboard"}
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="flex md:inline-flex items-center gap-1 rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
          >
            Sign in <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </header>
  );
}
