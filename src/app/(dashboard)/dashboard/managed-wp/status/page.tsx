import { Metadata } from "next";
import { Main } from ".";

export const metadata: Metadata = {
  title: "Speedy Site | Managed Wordpress Performance Optimization",
  description:
    "We manage your wordpress site performance where you can monitor the web vitals timeline, check status, get on one-on-one chat with performance experts",
};

export default function ManagedWp() {
  return (
    <>
      <div className="p-5">
        <Main />
      </div>
    </>
  );
}
