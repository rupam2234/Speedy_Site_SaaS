"use client";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-sm">© {year} - Speedy Site. All rights reserved.</p>
        <nav className="flex gap-6 md:flex-row flex-col text-center text-sm">
          <a href="/contact" className="hover:text-white">
            Contact us
          </a>
          <a href="/privacy-policy" className="hover:text-white">
            Privacy policy
          </a>
          <a href="/terms-conditions" className="hover:text-white">
            T&C
          </a>
        </nav>
      </div>
    </footer>
  );
}
