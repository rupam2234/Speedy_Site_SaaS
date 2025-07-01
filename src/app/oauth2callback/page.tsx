import { Suspense } from "react";
import OAuthCallbackPage from "./OAuthCallbackClient";

export default function OAuthCallback() {
  return (
    <Suspense fallback={<></>}>
      <OAuthCallbackPage />
    </Suspense>
  );
}
