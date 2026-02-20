import { Metadata } from "next";
import Main from "./main";

export const metadata: Metadata = {
  title: "Terms and Conditions | Speedy Site",
  description:
    "Read the Terms and Conditions governing the use of Speedy.Site’s Real User Monitoring (RUM) platform and integrated WordPress optimization services, including subscriptions, data collection, performance policies, and legal obligations.",
};

export default function TermsAndConditions() {
  return <Main />;
}
