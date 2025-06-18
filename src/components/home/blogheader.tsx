"use client";

import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Logo from "../logo/logo";

export default function BlogHeader() {
  const { user, isSignedIn } = useUser();
  const [isMenuOpen, setMenuOpen] = useState<boolean>(false);

  function handleMenuButton() {
    setMenuOpen((previous) => !previous);
  }

  return (
    <header className="w-full py-4 md:py-4 md:px-8 px-4 flex items-center bg-indigo-700">
      <div className="max-w-7xl flex items-center justify-between mx-auto container">
        <div className="text-2xl md:text-3xl font-bold text-white">
          <Logo />
        </div>
        {/* mobile navigation */}
        <div className="z-50">
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
        <ul className="relative hidden md:flex md:space-x-1 md:items-center">
          <span className="flex flex-col items-end hover:text-pink-300 py-3">
            <Link
              className="text-white hover:text-purple-300 font-semibold py-2 px-4 transition duration-300 rounded hover:bg-white/10"
              href={"/"}
            >
              Home
            </Link>
          </span>

          {isSignedIn === undefined ? (
            <div className="pl-4">
              <li className="animate-pulse w-[100px] h-8 bg-gray-200/20 rounded-lg" />
            </div>
          ) : isSignedIn ? (
            <li className="flex gap-2 pl-4 items-center">
              <span className="text-white hover:text-purple-300 font-semibold cursor-pointer">
                <Link href={"/dashboard"}>Account</Link>
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
      </div>
    </header>
  );
}
