import Stripe from "stripe";

type PlanKey =
  | "Starter"
  | "Basic"
  | "Pro"
  | "Agency"
  | "Starter_yearly"
  | "Basic_yearly"
  | "Pro_yearly"
  | "Agency_yearly"
  | "ManagedWp"
  | "ManagedWp_yearly";


export const priceMap: Record<PlanKey, string> = {
  Starter: "price_1TEH3oFudyIXBfXknI5rIubA",
  Basic: "price_1SHfk8FudyIXBfXkozoK2jmm",
  Pro: "price_1SHfnpFudyIXBfXkLekhIkoM",
  Agency: "price_1SHfpXFudyIXBfXkVPU9bgrP",
  Starter_yearly: "price_1TEHKmFudyIXBfXkNkW3csR2",
  Basic_yearly: "price_1SV7F9FudyIXBfXk8dez9wT1",
  Pro_yearly: "price_1SV7N3FudyIXBfXkngR9eZRh",
  Agency_yearly: "price_1SV7OMFudyIXBfXkEeO7i2TS",
  ManagedWp_yearly: "price_1TZQBfFudyIXBfXk2hEwAKxG",
  ManagedWp: "price_1TZVtwFudyIXBfXk49PVzAij"
};

export type PlanType =
  | "Basic"
  | "Pro"
  | "Agency"
  | "Free"
  | "Starter"
  | "Starter (Yearly)"
  | "Basic (Yearly)"
  | "Pro (Yearly)"
  | "Agency (Yearly)"
  | "Managed WordPress Performance (Yearly)"
  | "Managed WordPress Performance"
  | undefined;

export const getPlanFromSubscription = (
  subscription: Stripe.Subscription,
): PlanType => {
  const priceIdToPlan: Record<string, PlanType> = {
    [priceMap.Starter]: "Starter",
    [priceMap.Starter_yearly]: "Starter (Yearly)",
    [priceMap.Basic]: "Basic",
    [priceMap.Basic_yearly]: "Basic (Yearly)",
    [priceMap.Pro]: "Pro",
    [priceMap.Pro_yearly]: "Pro (Yearly)",
    [priceMap.Agency]: "Agency",
    [priceMap.Agency_yearly]: "Agency (Yearly)",
    [priceMap.ManagedWp_yearly]: "Managed WordPress Performance (Yearly)",
    [priceMap.ManagedWp]: "Managed WordPress Performance"
  };

  const priceId = subscription.items.data[0].price.id;
  return priceIdToPlan[priceId] ?? "Free";
};

export type PlanCardProps = {
  name: PlanType;
  price: number;
  description: string;
  features: string[];
  current?: boolean;
};


