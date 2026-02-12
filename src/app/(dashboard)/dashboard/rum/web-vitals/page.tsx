import Main from "./helpers/main";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Speedy Site | RUM Web Vitals",
  description:
    "Gain deep insights into your users’ real-world experience. Track performance across pages, connections, and countries, and identify critical factors that impact speed, usability, and satisfaction.",
};

export default function RUMWebVitals() {
  return (
    <>
      <Main />
    </>
  );
}
