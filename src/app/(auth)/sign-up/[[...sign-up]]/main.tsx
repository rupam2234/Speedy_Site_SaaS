"use client";

import { useEffect, useState } from "react";
import { supabase_client } from "@/lib/db/browser_client";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import Link from "next/link";
import { MobileViewHandler } from "../../helpers/monileView";
import { DesktopSideContent } from "../../helpers/sideContent";
import { SpeedySiteLogo } from "@/components/theme";

export default function Main() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const authRedirect =
      process.env.NEXT_PUBLIC_PROD_BASE_URL ??
      "http://localhost:3000/auth/callback";

    const { error } = await supabase_client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirect },
    });

    setLoading(false);
    setMessage(
      error ? error.message : "Check your email to confirm your account.",
    );
  };

  return (
    <div className="min-h-screen md:py-0 pb-15 w-full grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden relative">
      <div className="col-span-full flex justify-between items-center px-6 py-4 absolute top-2 left-2 md:top-2 md:left-2 right-0 z-50">
        <SpeedySiteLogo isDark={isDark} />
        <ThemeToggle />
      </div>
      <MobileViewHandler />
      <SignUpForm
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loading={loading}
        message={message}
        handleSignUp={handleSignUp}
      />
      <DesktopSideContent />
    </div>
  );
}

function SignUpForm({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  message,
  handleSignUp,
}: {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  loading: boolean;
  message: string;
  handleSignUp: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-16 md:pt-0">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">Create your account</h2>
          <p className="text-md text-gray-500 dark:text-gray-400">
            It only takes a few seconds to get started.
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Password
            </label>
            <input
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white py-3 rounded-md text-sm font-medium"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        {message && (
          <p className="text-center text-sm text-indigo-600 dark:text-indigo-400">
            {message}
          </p>
        )}

        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <a href="/forgot-password" className="hover:underline">
            Forgot Password?
          </a>
          <span>
            Already a member?{" "}
            <Link
              href="/sign-in"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
