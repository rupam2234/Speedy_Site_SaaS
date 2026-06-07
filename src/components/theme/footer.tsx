"use client";

import { SpeedySiteLogo } from ".";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#272626] text-[16px] border-t border-white/8">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-10">
          {/* Brand + HQ */}
          <div>
            <SpeedySiteLogo isDark={true} />
            <p className="mt-3 mb-5 text-[16px] leading-relaxed text-primary-foreground/80 max-w-70">
              Feel free to reach us for any queries regarding Speedy Site
              services and other related business.
            </p>
            <p className="text-[11px] uppercase tracking-widest text-primary-foreground/40 mb-1">
              Headquarters · Canada
            </p>
            <p className="text-[16px] leading-[1.65] text-primary-foreground/80">
              64 Hurontario St, Suite 200
              <br />
              Collingwood, Ontario L9Y 2L6
            </p>
            <p className="text-[12px] text-primary-foreground/40 mt-1">
              Monday – Friday, 9:30 am – 5:30 pm
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[11px] uppercase tracking-widest text-white/35 font-medium mb-4">
              Company
            </h4>
            <ul className="flex flex-col gap-[0.55rem]">
              {[
                { label: "Blog", href: "https://blog.speedy.site/blog/" },
                { label: "Account", href: "https://my.speedy.site/" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[16px] text-white/50 hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Speed Tools */}
          <div>
            <h4 className="text-[11px] uppercase tracking-widest text-white/35 font-medium mb-4">
              Speed Tools
            </h4>
            <ul className="flex flex-col gap-[0.55rem]">
              {[
                {
                  label: "PSI",
                  href: "https://developers.google.com/speed/pagespeed/insights/",
                },
                { label: "WebPageTest", href: "https://www.webpagetest.org/" },
                { label: "Pingdom", href: "https://tools.pingdom.com/" },
                {
                  label: "Site Monitor",
                  href: "https://www.dotcom-tools.com/website-speed-test",
                },
                { label: "GTmetrix", href: "https://gtmetrix.com/" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[16px] text-white/50 hover:text-white transition-colors"
                  >
                    {label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-[11px] uppercase tracking-widest text-white/35 font-medium mb-4">
              About Us
            </h4>
            <p className="text-[16px] leading-[1.65] text-primary-foreground/80">
              A WordPress performance team that goes deeper than lab tools — our
              integrated RUM system captures what real visitors experience, so
              every optimization we make moves the needle where it counts.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.07] pt-5 flex flex-wrap justify-between items-center gap-3">
          <span className="text-[12px] text-white/25">
            © {year} Speedy Site. All rights reserved.
          </span>
          <nav className="flex gap-5">
            {[
              { label: "Contact us", href: "/contact" },
              { label: "Privacy policy", href: "/privacy-policy" },
              { label: "T&C", href: "/terms-conditions" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-[12px] text-primary-foreground/40 hover:text-white/70 transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
