import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Speedy Site | Site Settings",
  description: "Speedy.site related configurations are available here",
};

export default function SiteSettings() {
  return <Main />;
}
