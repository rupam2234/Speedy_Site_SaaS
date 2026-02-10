import { Metadata } from "next";
import Main from "./main";

export const metadata: Metadata = {
  title: "Speedy Site | Page Groups",
  description:
    "Page groups make it easy to find pages that hinder performance and user experience.",
};

export default function RUMpages() {
  return <Main />;
}
