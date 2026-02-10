import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Speedy Site | Analytics",
  description:
    "Lightweight, privacy-first analytics designed to monitor your website traffic, detect LLM activity, and track user experience worldwide.",
};

export default function RumAnalytics() {
  return <Main />;
}
