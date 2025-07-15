"use client";

import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "../logo/logo";

export interface HeaderMenuProps {
  menuItem: string;
  subMenuItemCount: number;
  subMenuItems: string[];
  pageRefId: string;
}

const headerMenu: HeaderMenuProps[] = [
  {
    menuItem: "Features",
    subMenuItemCount: 0,
    subMenuItems: [],
    pageRefId: "#features",
  },
  {
    menuItem: "Pricing",
    subMenuItemCount: 0,
    subMenuItems: [],
    pageRefId: "#pricing",
  },
  {
    menuItem: "Early Access",
    subMenuItemCount: 0,
    subMenuItems: [],
    pageRefId: "#early-access",
  },
];

export default function ConditionalHeader() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const [isMenuOpen, setMenuOpen] = useState<boolean>(false);

  // find the path that matches the strings and mark them to avoid displaying the global header
  const avoidOnRoute = [
    "/sign-in",
    "/dashboard",
    "/blog",
    "/sign-up",
    "/oauth2callback",
    "/account",
    "/account/",
  ].some((path) => pathname.startsWith(path));

  function handleMenuButton() {
    setMenuOpen((previous) => !previous);
  }

  return avoidOnRoute ? (
    // render nothing
    <></>
  ) : (
    <header className="absolute top-0 left-0 w-full z-50 px-4 py-4 md:py-4 md:px-8 font-sans antialiased ">
      <nav className="container mx-auto flex justify-between items-center max-w-7xl">
        <div className="text-2xl md:text-3xl font-bold text-white">
          <Logo />
        </div>
        {/* mobile navigation */}
        <div>
          <Menu
            className="text-white md:hidden hover:text-purple-300"
            id="mobile_nav"
            onClick={handleMenuButton}
          />
          <div
            className={`fixed top-0 right-0 h-full pl-8 pr-4 py-2 w-52 text-gray-200 bg-gray-900/95 shadow-lg transform transition-transform duration-300 ease-in-out ${
              isMenuOpen ? `translate-x-0` : `translate-x-full`
            }`}
          >
            <span
              onClick={handleMenuButton}
              className="absolute z-10 top-6 left-4 bg-gray-500/20 hover:bg-gray-500/60 px-[7px] shadow-2xl rounded-full "
            >
              X
            </span>
            {/* menu content */}
            {headerMenu.map((item) => (
              <span
                className="flex flex-col items-end text-lg hover:text-pink-300 py-3"
                key={item.menuItem}
              >
                <Link href={item.pageRefId}>{item.menuItem}</Link>
              </span>
            ))}
            <span className="flex flex-col items-end text-lg hover:text-pink-300 py-3">
              <a href={"/blog"}>Blog</a>
            </span>
            {isSignedIn ? (
              <span className="flex flex-col items-end text-lg hover:text-pink-300 py-3">
                <span className="flex gap-2 items-center">
                  <a href={"/dashboard"}>Account</a>
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-end text-lg hover:text-pink-300 py-3">
                <Link
                  href="/sign-in"
                  className="text-white hover:text-purple-300 font-semibold py-2 px-4 transition duration-300 rounded bg-slate-300/50 hover:bg-white/10"
                >
                  Sign in
                </Link>
              </span>
            )}
          </div>
        </div>
        {/* Navigation */}
        <ul className="relative hidden md:flex md:space-x-1 md:items-center">
          {headerMenu.map((item) => (
            <li className="relative group" key={item.menuItem}>
              <a
                className="text-white hover:text-purple-300 font-semibold py-2 px-4 transition duration-300 rounded hover:bg-white/10"
                href={`${item.pageRefId}`}
              >
                {item.menuItem}
              </a>
            </li>
          ))}
          <span className="flex flex-col items-end hover:text-pink-300 py-3">
            <a
              className="text-white hover:text-purple-300 font-semibold py-2 px-4 transition duration-300 rounded hover:bg-white/10"
              href={"/blog"}
            >
              Blog
            </a>
          </span>
          {/* custom button for sign-in or dashboard */}

          {isSignedIn === undefined ? (
            <div className="pl-4">
              <li className="animate-pulse w-[100px] h-8 bg-gray-200/20 rounded-lg" />
            </div>
          ) : isSignedIn ? (
            <li className="flex gap-2 pl-4 items-center">
              <span className="text-white hover:text-purple-300 font-semibold cursor-pointer">
                <a href={"/dashboard"}>Account</a>
              </span>
              <span className="h-8 w-8 bg-gray-100/20 relative justify-center flex items-center rounded-full">
                <p className="font-semibold text-white">
                  {user.emailAddresses?.[0]?.emailAddress
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </p>
              </span>
            </li>
          ) : (
            <li>
              <Link
                href="/sign-in"
                className="text-white hover:text-purple-300 font-semibold py-2 px-4 transition duration-300 rounded bg-slate-300/50 hover:bg-white/10"
              >
                Sign in
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
