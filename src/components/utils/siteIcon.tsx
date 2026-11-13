import Image from "next/image";
import { cn } from "@/lib/utils";

const FAVICON_BASE_URL =
  "https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons";

export function faviconUrl(favicon: string) {
  return `${FAVICON_BASE_URL}/${favicon}`;
}

// Renders a site's stored favicon, with a neutral tile when none exists yet.
export function SiteIcon({
  favicon,
  site,
  size = 16,
  className,
}: {
  favicon?: string | null;
  site?: string;
  size?: number;
  className?: string;
}) {
  if (!favicon) {
    return (
      <div
        style={{ width: size, height: size, fontSize: Math.round(size * 0.75) }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded bg-gray-300 text-gray-600",
          className,
        )}
        aria-hidden
      >
        ?
      </div>
    );
  }

  return (
    <Image
      src={faviconUrl(favicon)}
      alt={`${site ?? "site"}_logo`}
      width={size}
      height={size}
      className={cn("rounded", className)}
      loading="lazy"
    />
  );
}
