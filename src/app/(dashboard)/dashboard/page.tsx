import { Metadata } from "next";
import { Main } from "./dashboard_render/helper";

export const metadata: Metadata = {
  title: "Speedy Site | Dashboard",
  description: "Monitor your site's performance, UX and take actions",
};

export default function Dashboard() {
  return <Main />;
}
