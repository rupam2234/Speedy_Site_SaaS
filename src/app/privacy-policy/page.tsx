import { Metadata } from "next";
import Main from "./main";

export const metadata: Metadata = {
  title: "Privacy Policy | Speedy Site",
  description:
    "Learn how Speedy.Site collects, uses, and protects data through our Real User Monitoring (RUM) platform and WordPress optimization services, including information handling, cookies, and compliance practices.",
};

export default function PrivacyPolicy() {
  return <Main />;
}
