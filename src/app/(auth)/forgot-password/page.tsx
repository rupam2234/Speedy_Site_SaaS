"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { DynamicLogo } from "../helpers/dynamicLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MobileViewHandler } from "../helpers/monileView";
import { DesktopSideContent } from "../helpers/sideContent";
import { useState } from "react";
import { MailSearch } from "lucide-react";

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <div className="min-h-screen md:py-0 pb-15 w-full grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden relative">
      <div className="col-span-full flex justify-between items-center px-6 py-4 absolute top-2 left-2 md:top-2 md:left-2 right-0 z-50">
        <DynamicLogo isDark={isDark} />
        <ThemeToggle />
      </div>
      <MobileViewHandler />
      <div className="flex flex-col gap-4 w-full h-auto justify-center items-center">
        <div className="flex gap-4 items-center">
          <MailSearch size={20} className="text-primary/30" />
          <input
            className="border border-primary/10 md:min-w-[350px] px-2 py-1 rounded-sm"
            type="email"
            placeholder="Your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button
          disabled={loading}
          onClick={() => handlePassReset()}
          className="bg-primary/10 hover:bg-primary/20 dark:bg-primary/10 hover:dark:bg-primary/20 cursor-pointer px-2 py-1 rounded-sm"
        >
          {loading ? "Sending..." : "Get password reset link"}
        </button>
        <p
          className={`h-2 text-sm ${
            message.toLowerCase().includes("sent")
              ? "text-green-500"
              : "text-red-500"
          }`}
        >
          {message || ""}
        </p>
      </div>

      <DesktopSideContent />
    </div>
  );

  async function handlePassReset() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setMessage("Please provide your registered email");
    } else if (!emailRegex.test(email)) {
      setMessage("Make sure the email is valid!");
    } else {
      setLoading(true);
      try {
        const res = await fetch("/api/account/password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        await res.json();

        if (!res.ok) {
          console.error("Unable to send password reset link");
          setMessage("Unable to send password reset link");
        } else {
          setMessage("Password reset link sent to your email");
        }
      } catch (err) {
        console.error(err);
        setMessage("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
        setTimeout(() => setMessage(""), 7000);
      }
    }
  }
}
