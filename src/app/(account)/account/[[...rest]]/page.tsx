"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  const { theme } = useTheme();

  const isDark = theme === "dark";

  return (
    <UserProfile
      appearance={{
        baseTheme: { __type: "prebuilt_appearance" },
        variables: {
          colorBackground: isDark ? "#202020" : "white",
          colorText: isDark ? "white" : "black",
          colorPrimary: isDark ? "white" : "black",
          colorTextOnPrimaryBackground: isDark ? "black" : "white",
          colorTextSecondary: isDark ? "white" : "black",
          colorNeutral: isDark ? "white" : "black",
          colorInputBackground: isDark ? "#0a0a0a" : "",
          colorInputText: isDark ? "white" : "black",
          colorShimmer: isDark ? "" : "",
          borderRadius: "0",
        },
        // rest are handled at global.css
      }}
    />
  );
}
