"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CustomTooltip } from "@/components/theme";
import { SpeedySiteLogo } from "@/components/theme/logo";
import { SiteIcon } from "@/components/utils/siteIcon";

const MARK_SIZE = 20;

/**
 * Sidebar brand block. The wide logo lockup cannot fit the 3rem icon rail, so
 * when the drawer collapses we cross-fade it into the site icon (the Speedy
 * mark when the site has no favicon) instead of letting the logo clip.
 */
export function SidebarBrand({
  isDark,
  collapsed,
  favicon,
  site,
}: {
  isDark: boolean;
  collapsed: boolean;
  favicon?: string | null;
  site?: string;
}) {
  const label = site || "Speedy Site";

  return (
    <div
      className={cn(
        "relative flex h-5 items-center",
        collapsed && "w-full justify-center",
      )}
    >
      <div
        className={cn(
          "flex items-center transition-opacity duration-200 ease-linear",
          collapsed
            ? "pointer-events-none absolute inset-0 justify-center opacity-0"
            : "px-2 opacity-100",
        )}
      >
        <SpeedySiteLogo isDark={isDark} />
      </div>

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-linear",
          collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <CustomTooltip
          content={label}
          side="right"
          trigger={
            <Link href="/" className="ring-0 focus:ring-0">
              {favicon ? (
                <SiteIcon favicon={favicon} site={site} size={MARK_SIZE} />
              ) : (
                <Image
                  src="/images/logos/speedysite-favicon.png"
                  alt="Speedy Site"
                  width={MARK_SIZE}
                  height={MARK_SIZE}
                  className="rounded"
                />
              )}
            </Link>
          }
        />
      </div>
    </div>
  );
}
