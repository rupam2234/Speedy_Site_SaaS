import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Speedy Site | Tickets",
  description:
    "Submit and track support tickets for errors, issues, or queries on Speedy Site. Get help quickly and efficiently.",
};

export default function Tickets() {
  return <Main />;
}
