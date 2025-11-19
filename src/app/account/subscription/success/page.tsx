"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/account/subscription/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-xl mx-auto space-y-3 flex flex-col justify-center items-center min-h-full">
      <h2 className="text-2xl font-bold mb-4">Thank you for your purchase!</h2>
      <p>Your subscription is active. You can now enjoy the features.</p>
      <p className="font-mono">Redirecting to account...</p>
    </div>
  );
}
