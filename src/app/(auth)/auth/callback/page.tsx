import { Suspense } from "react";
import AuthCallbackClient from "./_client";

export default function AuthCallbackWrapper() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AuthCallbackClient />
    </Suspense>
  );
}
