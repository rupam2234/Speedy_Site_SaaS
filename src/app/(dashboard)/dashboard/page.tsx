import { Metadata } from "next";
import { Main } from "./dashboard_render/helper";

export const metadata: Metadata = {
  title: "Speedy Site | Dashboard",
  description:
    "This allows you to track both daily and historical web vitals data from Google’s reports—the same data that powers Google Search Console.",
};

export default function Dashboard() {
  return <Main />;
}
