"use client";

import { useEffect, useState } from "react";

export default function CancelPageOneTimePayment() {
  const [displayText, setDisplayText] = useState<string>("");
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayText(
        " You haven't completed the payment. Redirecting to billing page...",
      );
    }, 0);

    const redirectTimer = setTimeout(() => {
      location.replace("/account/subscription");
    }, 6000);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(redirectTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <div className="flex min-h-screen text-primary/80 text-md -mt-5 items-center justify-center">
        <p>
          {displayText} {countdown > 0 && `(${countdown})`}
        </p>
      </div>
    </>
  );
}
