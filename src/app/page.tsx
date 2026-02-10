import { Metadata } from "next";
import HomepageComponent from "./(home)/homepage";

export const metadata: Metadata = {
  title: "Speedy Site | Home",
  description:
    "The only tool you'll need to monitor your website performance and user experience",
};

export default function Home() {
  return <HomepageComponent />;
}
