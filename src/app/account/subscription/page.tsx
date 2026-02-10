import { Metadata } from "next";
import { Main } from "./index";

export const metadata: Metadata = {
  title: "Speedy Site | Subscription",
  description: "Manage your Speedy.site subscriptions",
};

export default function Subscription() {
  return <Main />;
}
