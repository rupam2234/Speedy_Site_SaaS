"use client";

import Main from "./helpers/main";
import { RumWebVitalToolbar } from "../../../../../components/utils/index";

export default function RUMWebVitals() {
  return (
    <>
      <RumWebVitalToolbar
        enableDistribution={true}
        enableAllDevices={true}
        disableTablet={false}
      />
      <Main />
    </>
  );
}
