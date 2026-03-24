import { Metadata } from "next";
import { SubscriptionManager } from ".";

export const metadata: Metadata = {
  title: "Speedy Site | Subscription",
  description: "Manage your Speedy.site subscriptions",
};

export default function Subscription() {
  return <SubscriptionManager />;
}
