"use client";

import { useEffect, useState } from "react";
import { supabase_client } from "@/lib/db/browser_client";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import Link from "next/link";
import { MobileViewHandler } from "../../helpers/mobileView";
import { DesktopSideContent } from "../../helpers/sideContent";
import { SpeedySiteLogo } from "@/components/theme";

export default function Main() {
  // --- Form State ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- Bot Protection State ---
  const [honeypot, setHoneypot] = useState(""); // Hidden field for bots
  const [lastSubmitTime, setLastSubmitTime] = useState(0); // Client-side rate limit

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  /**
   * Simple Spam Detection Logic
   */
  const isSpammy = (val: string) => {
    const spamPatterns = [
      /http/i,
      /www\./i,
      /<script/i,
      /href=/i, // Code injection
      /^[a-zA-Z0-9]{18,}$/, // Long strings of gibberish (no spaces)
      /(casino|viagra|bit.ly|t.co)/i, // Common spam keywords
    ];
    return spamPatterns.some((pattern) => pattern.test(val));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    // 1. HONEYPOT CHECK
    // If this hidden field is filled, it's a bot. We exit silently or show a fake success.
    if (honeypot.length > 0) {
      console.warn("Bot detected via honeypot.");
      return;
    }

    // 2. CLIENT-SIDE RATE LIMIT
    // Prevent the user (or a script) from spamming the "Sign Up" button.
    const now = Date.now();
    if (now - lastSubmitTime < 20000) {
      // 20-second cooldown
      setMessage("Please wait a moment before submitting again.");
      return;
    }

    // 3. SPAM PATTERN CHECK
    if (isSpammy(name) || isSpammy(email)) {
      setMessage("Please enter valid information.");
      return;
    }

    // 4. PROCEED WITH SIGN UP
    setLoading(true);
    setLastSubmitTime(now);

    const authRedirect = `${window.location.origin}/auth/callback`;

    const { error } = await supabase_client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirect,
        data: {
          name: name.trim(),
          userRole: "user",
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Success! Please check your email to confirm your account.");
      // Optional: Clear form
      setName("");
      setEmail("");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen md:py-0 pb-15 w-full grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden relative">
      {/* Top Header Section */}
      <div className="col-span-full flex justify-between items-center px-6 py-4 absolute top-2 left-2 md:top-2 md:left-2 right-0 z-50">
        <SpeedySiteLogo isDark={isDark} />
        <ThemeToggle />
      </div>

      <MobileViewHandler />

      {/* Sign Up Form Component */}
      <SignUpForm
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        honeypot={honeypot}
        setHoneypot={setHoneypot}
        loading={loading}
        message={message}
        handleSignUp={handleSignUp}
      />

      <DesktopSideContent />
    </div>
  );
}

/**
 * Sub-component for the Sign-Up Form
 */
function SignUpForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  honeypot,
  setHoneypot,
  loading,
  message,
  handleSignUp,
}: any) {
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
          {/* 
             HONEYPOT FIELD 
             Hidden from humans via CSS and accessibility attributes. 
             Bots will see 'verify_account_hidden' and try to fill it.
          */}
          <div
            className="opacity-0 absolute -z-10 h-0 w-0 overflow-hidden"
            aria-hidden="true"
          >
            <input
              type="text"
              name="verify_account_hidden"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-500"
            />
          </div>

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
            className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white py-3 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        {message && (
          <p
            className={`text-center text-sm ${message.includes("Success") ? "text-green-500" : "text-indigo-600 dark:text-indigo-400"}`}
          >
            {message}
          </p>
        )}

        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <Link href="/forgot-password" className="hover:underline text-sm">
            Forgot Password?
          </Link>
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
