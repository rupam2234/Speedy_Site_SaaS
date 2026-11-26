import Main from "./helpers/main";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Performance Assistant",
  description:
    "Ask about your site's real user performance data and get evidence-backed WordPress remediation steps from the Speedy Site assistant.",
};

export default function RumAssistantPage() {
  return (
    <>
      <Main />
    </>
  );
}
