import Link from "next/link";

export function Fallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
      <span className="text-6xl mb-4">🔒</span>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Upgrade Required
      </h2>
      <p className="text-gray-600 mb-6 max-w-md">
        You&apos;re currently on the <strong>FREE</strong> plan. Unlock advanced
        features and insights by upgrading your subscription.
      </p>
      <Link
        href="/account/subscription"
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
      >
        Upgrade Now
      </Link>
    </div>
  );
}
