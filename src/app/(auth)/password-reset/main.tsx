"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

import { useEffect, useState } from "react";
import { Eye, EyeClosed } from "lucide-react";
import { SpeedySiteLogo } from "../../../components/theme/logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MobileViewHandler } from "../helpers/monileView";
import { DesktopSideContent } from "../helpers/sideContent";
import { supabase_client } from "@/lib/db/browser_client";

export default function Main() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [password, setPassword] = useState<string>("");
  const [conf_password, setConfirmPassword] = useState<string>("");
  const [eyeOpen, setEye] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const [recoverToken, setRecoverToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const token = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      setRecoverToken(token);
      setRefreshToken(refreshToken);
    }
  }, []);

  return (
    <div className="min-h-screen md:py-0 pb-15 w-full grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden relative">
      <div className="col-span-full flex justify-between items-center px-6 py-4 absolute top-2 left-2 md:top-2 md:left-2 right-0 z-50">
        <SpeedySiteLogo isDark={isDark} />
        <ThemeToggle />
      </div>
      <MobileViewHandler />
      <div className="flex flex-col gap-4 w-full h-auto justify-center items-center">
        <div className="flex gap-4 items-center">
          {eyeOpen ? (
            <Eye
              size={20}
              className="text-primary/30 cursor-pointer"
              onClick={() => handleEyeClick()}
            />
          ) : (
            <EyeClosed
              size={20}
              className="text-primary/30 cursor-pointer"
              onClick={() => handleEyeClick()}
            />
          )}
          <input
            className="border border-primary/10 md:min-w-87.5 px-2 py-1 rounded-sm"
            type={`${eyeOpen ? "text" : "password"}`}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex gap-4 items-center">
          {<div className="w-5"></div>}
          <input
            className="border border-primary/10 md:min-w-87.5 px-2 py-1 rounded-sm"
            type={`${eyeOpen ? "text" : "password"}`}
            placeholder="Confirm password"
            value={conf_password}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          onClick={() => handlePassReset()}
          className="bg-primary/10 hover:bg-primary/20 dark:bg-primary/10 hover:dark:bg-primary/20 cursor-pointer px-2 py-1 rounded-sm"
        >
          Reset Password
        </button>
        <p
          className={`h-2 text-sm ${
            message.includes("successfully") ? "text-green-500" : "text-red-500"
          } `}
        >
          {message.length ? message : ""}
        </p>
      </div>

      <DesktopSideContent />
    </div>
  );

  async function handlePassReset() {
    if (password.length === 0) {
      setMessage("Provide your new password");
      return;
    } else if (password !== conf_password) {
      setMessage("Password didn't match");
      return;
    } else if (password.length < 6) {
      setMessage("Minimum 6 characters needed");
      return;
    } else {
      if (!recoverToken) {
        setMessage(
          "Recovery token not found. Please use the link in your email",
        );
        return;
      }

      const { error: SessionError } = await supabase_client.auth.setSession({
        access_token: recoverToken,
        refresh_token: refreshToken ? refreshToken : "",
      });

      if (SessionError) {
        setMessage(`Session error: ${SessionError.message}`);
        return;
      }

      // now we can update the password
      const { error: updateError } = await supabase_client.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setMessage(`Error updating password: ${updateError.message}`);
        return;
      }

      setMessage("Password updated successfully");
    }

    setTimeout(() => {
      setMessage("");
    }, 4000);
  }

  function handleEyeClick() {
    if (eyeOpen === false) {
      setEye(true);
    } else {
      setEye(false);
    }
  }
}
