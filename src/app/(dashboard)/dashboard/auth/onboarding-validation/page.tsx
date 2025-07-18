"use client";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

export default function AuthCallback() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  const handleSignUp = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user?.emailAddresses?.[0]?.emailAddress)
      return;

    const userData = {
      email: user.emailAddresses[0].emailAddress,
      firstname: user.firstName,
      lastname: user.lastName,
      id: user.id,
    };

    await fetch("/api/users/signup-validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      handleSignUp()
        .then(() => {
          router.replace("/dashboard");
        })
        .catch(console.error);
    }
  }, [isLoaded, isSignedIn, handleSignUp, router]);

  return (
    // This stops Clerk from auto-redirecting
    <AuthenticateWithRedirectCallback
      signUpForceRedirectUrl={null}
      signInForceRedirectUrl={null}
      signUpFallbackRedirectUrl={null}
      signInFallbackRedirectUrl={null}
    />
  );
}
