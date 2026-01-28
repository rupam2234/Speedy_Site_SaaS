"use client";

import Main from "./helpers/main";
import RumWebVitalToolbar from "./helpers/toolbar";

export default function RUMWebVitals() {
  return (
    <>
      <RumWebVitalToolbar enableDistribution />
      <Main />
    </>
  );
}
