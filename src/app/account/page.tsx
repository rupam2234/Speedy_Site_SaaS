import { Metadata } from "next";
import AccountRender from "./main";

export const metadata: Metadata = {
  title: "Speedy Site | Account",
  description: "Manage your Speedy.site account",
};

export default function Account() {
  return <AccountRender />;
}
