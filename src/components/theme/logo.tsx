import Link from "next/link";
import Image from "next/image";

export function SpeedySiteLogo({ isDark }: { isDark: boolean }) {
  return (
    <>
      {isDark ? (
        <Link href="/" className="cursor-pointer ring-0 focus:ring-0">
          <Image
            src="/images/logos/Speedy-site-logo-light.png"
            alt="SpeedySite-logo-dark"
            width={130}
            height={20}
          />
        </Link>
      ) : (
        <Link href="/" className="cursor-pointer ring-0 focus:ring-0">
          <Image
            src="/images/logos/Speedy-site-logo-dark.png"
            alt="SpeedySite-logo-light"
            width={130}
            height={20}
          />
        </Link>
      )}
    </>
  );
}
