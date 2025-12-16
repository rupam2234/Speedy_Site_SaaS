"use client";

import Main from "./helpers/main";
import RumWebVitalToolbar from "./helpers/toolbar";
import { WebVitalContextProvider } from "./sharedProps";

export default function RUMWebVitals() {
  return (
    <WebVitalContextProvider>
      <RumWebVitalToolbar />
      <Main />
    </WebVitalContextProvider>
  );
}
