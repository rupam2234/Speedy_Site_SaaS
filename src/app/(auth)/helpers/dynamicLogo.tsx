import Link from "next/link";
import Image from "next/image";

export function DynamicLogo({ isDark }: { isDark: boolean }) {
  return (
    <>
      {isDark ? (
        <Link href="/" className="cursor-pointer ring-0 focus:ring-0">
          <Image
            src="/images/SpeedySite-logo-dark.png"
            alt="SpeedySite-logo-dark"
            width={200}
            height={39.53}
          />
        </Link>
      ) : (
        <Link href="/" className="cursor-pointer ring-0 focus:ring-0">
          <Image
            src="/images/SpeedySite_logo_trasnparent.png"
            alt="SpeedySite-logo-light"
            width={200}
            height={39.53}
          />
        </Link>
      )}
    </>
  );
}
