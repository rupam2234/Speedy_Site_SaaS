import { Metadata } from "next";
import Main from "./main";

export const metadata: Metadata = {
  title: "Create a ticket | Speedy Site",
  description:
    "Use this ticket creator to submit yourspeedy site service concerns",
};

export default function NewTicket() {
  return <Main />;
}
