import Link from "next/link";

export function Fallback() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-6 text-center">
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-8 max-w-lg w-full">
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-6 rounded-full bg-indigo-50">
          <span className="text-2xl">🔒</span>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Premium Feature
        </h2>

        <p className="text-gray-600 mb-6 leading-relaxed">
          This feature is available on our{" "}
          <span className="font-medium text-gray-900">Professional</span> and
          higher plans. Upgrade your subscription to unlock advanced insights,
          priority support, and enhanced capabilities.
        </p>

        <Link
          href="/account/subscription"
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 w-full sm:w-auto"
        >
          View Plans & Upgrade
        </Link>

        <p className="mt-4 text-sm text-gray-500">
          Need help choosing a plan? Contact our support team.
        </p>
      </div>
    </div>
  );
}
