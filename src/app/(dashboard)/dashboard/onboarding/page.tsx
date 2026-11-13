import { Metadata } from "next";
import { Main } from "./index";

export const metadata: Metadata = {
  title: "Speedy Site | Managed Service Setup",
  description:
    "Connect your site, bind the plugin, and start real user monitoring with our managed WordPress performance service.",
};

export default function Onboarding() {
  return (
    <div className="p-5">
      <Main />
    </div>
  );
}
